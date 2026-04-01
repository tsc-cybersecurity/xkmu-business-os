import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MARGIN = 20
const HEADER_COLOR = [0, 82, 155] as const // xKMU blue
const DARK = [30, 30, 30] as const
const GRAY = [80, 80, 80] as const
const LIGHT_GRAY = [150, 150, 150] as const

const RENEWAL_LABELS: Record<string, string> = {
  none: 'Keine',
  auto: 'Automatische Verlaengerung',
  manual: 'Manuelle Verlaengerung',
}

/**
 * Generate a PDF document for a contract.
 *
 * @param contract - The contract document with items, customer snapshot, and contract fields.
 *   Expected shape (all fields optional except `number`):
 *   - number, customerName, customerStreet, customerHouseNumber, customerPostalCode, customerCity
 *   - contractStartDate, contractEndDate, contractNoticePeriodDays, contractRenewalType, contractRenewalPeriod
 *   - contractBodyHtml
 *   - items[] (position, name, quantity, unit, unitPrice, lineTotal)
 *   - subtotal, taxTotal, total
 */
export function generateContractPdf(contract: any): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - 2 * MARGIN

  const c = contract
  const items: any[] = c.items || []

  let y = 15

  // ============================================
  // Header (page 1)
  // ============================================
  addHeader(doc, pageWidth)
  y = 30

  // ============================================
  // Title
  // ============================================
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...HEADER_COLOR)
  const titleText = `Vertrag ${c.number || ''}`
  doc.text(titleText, MARGIN, y)
  y += 10

  // ============================================
  // Vertragspartner
  // ============================================
  y = checkPageBreak(doc, y, 30, pageWidth, pageHeight)
  y = addSectionTitle(doc, 'Vertragspartner', y)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(c.customerName || 'Unbekannt', MARGIN, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)

  const street = [c.customerStreet, c.customerHouseNumber].filter(Boolean).join(' ')
  if (street) {
    doc.text(street, MARGIN, y)
    y += 5
  }

  const cityLine = [c.customerPostalCode, c.customerCity].filter(Boolean).join(' ')
  if (cityLine) {
    doc.text(cityLine, MARGIN, y)
    y += 5
  }

  if (c.customerVatId) {
    doc.text(`USt-IdNr.: ${c.customerVatId}`, MARGIN, y)
    y += 5
  }

  y += 4

  // ============================================
  // Vertragsdaten
  // ============================================
  y = checkPageBreak(doc, y, 35, pageWidth, pageHeight)
  y = addSectionTitle(doc, 'Vertragsdaten', y)

  const dataRows: [string, string][] = []

  if (c.contractStartDate) {
    dataRows.push(['Vertragsbeginn', formatDate(c.contractStartDate)])
  }

  if (c.contractEndDate) {
    dataRows.push(['Vertragsende', formatDate(c.contractEndDate)])
  } else {
    dataRows.push(['Vertragsende', 'unbefristet'])
  }

  if (c.contractNoticePeriodDays != null) {
    dataRows.push(['Kuendigungsfrist', `${c.contractNoticePeriodDays} Tage`])
  }

  const renewalLabel = RENEWAL_LABELS[c.contractRenewalType] || c.contractRenewalType || 'Keine'
  let renewalText = renewalLabel
  if (c.contractRenewalPeriod) {
    renewalText += ` (${c.contractRenewalPeriod})`
  }
  dataRows.push(['Verlaengerung', renewalText])

  doc.setFontSize(10)
  for (const [label, value] of dataRows) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(`${label}:`, MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(value, MARGIN + 50, y)
    y += 6
  }

  y += 4

  // ============================================
  // Vertragstext
  // ============================================
  if (c.contractBodyHtml) {
    y = checkPageBreak(doc, y, 20, pageWidth, pageHeight)
    y = addSectionTitle(doc, 'Vertragstext', y)

    const plainText = stripHtml(c.contractBodyHtml)
    const paragraphs = plainText.split(/\n{2,}/)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim()
      if (!trimmed) continue

      const lines = doc.splitTextToSize(trimmed, contentWidth)
      const blockHeight = lines.length * 4.5

      y = checkPageBreak(doc, y, Math.min(blockHeight, 20), pageWidth, pageHeight)
      for (const line of lines) {
        y = checkPageBreak(doc, y, 6, pageWidth, pageHeight)
        doc.text(line, MARGIN, y)
        y += 4.5
      }
      y += 3
    }

    y += 2
  }

  // ============================================
  // Positionen (autoTable)
  // ============================================
  if (items.length > 0) {
    y = checkPageBreak(doc, y, 40, pageWidth, pageHeight)
    y = addSectionTitle(doc, 'Positionen', y)

    const sortedItems = [...items].sort(
      (a, b) => (a.position || 0) - (b.position || 0)
    )

    const tableHead = [['Pos', 'Bezeichnung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']]
    const tableBody = sortedItems.map((item, idx) => [
      String(item.position ?? idx + 1),
      item.name || '',
      formatNumber(item.quantity),
      item.unit || 'Stueck',
      formatCurrency(item.unitPrice),
      formatCurrency(item.lineTotal),
    ])

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: {
        fillColor: [...HEADER_COLOR],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
      },
    })

    y = (doc as any).lastAutoTable.finalY + 8

    // ============================================
    // Summen (right-aligned)
    // ============================================
    y = checkPageBreak(doc, y, 25, pageWidth, pageHeight)

    const rightX = pageWidth - MARGIN
    const labelX = rightX - 65

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text('Netto:', labelX, y)
    doc.text(formatCurrency(c.subtotal), rightX, y, { align: 'right' })
    y += 6

    doc.setTextColor(...GRAY)
    doc.text('MwSt.:', labelX, y)
    doc.text(formatCurrency(c.taxTotal), rightX, y, { align: 'right' })
    y += 6

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(labelX, y - 2, rightX, y - 2)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Gesamt:', labelX, y + 2)
    doc.text(formatCurrency(c.total), rightX, y + 2, { align: 'right' })
    y += 12
  }

  // ============================================
  // Unterschriftsfelder
  // ============================================
  const sigBlockHeight = 35
  y = checkPageBreak(doc, y, sigBlockHeight + 10, pageWidth, pageHeight)

  // Push signature block towards bottom if there is room
  const minSigY = pageHeight - 50
  if (y < minSigY) {
    y = minSigY
  }

  const sigWidth = (contentWidth - 20) / 2
  const leftSigX = MARGIN
  const rightSigX = MARGIN + sigWidth + 20

  doc.setDrawColor(100, 100, 100)
  doc.setLineWidth(0.4)

  // Left: Auftraggeber
  doc.line(leftSigX, y, leftSigX + sigWidth, y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('Ort, Datum', leftSigX, y + 5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Auftraggeber', leftSigX, y + 10)

  // Right: Auftragnehmer
  doc.line(rightSigX, y, rightSigX + sigWidth, y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('Ort, Datum', rightSigX, y + 5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Auftragnehmer', rightSigX, y + 10)

  // ============================================
  // Headers & Footers (all pages)
  // ============================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()

    // Header on page 2+
    if (i > 1) {
      addHeader(doc, pw)
    }

    // Footer: Seite X von Y
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text(
      `Seite ${i} von ${totalPages}`,
      pw / 2,
      ph - 8,
      { align: 'center' }
    )
  }

  return doc
}

// ============================================
// Helper functions
// ============================================

function addHeader(doc: jsPDF, pageWidth: number) {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('xKMU digital solutions', MARGIN, 12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...HEADER_COLOR)
  doc.text('|  Vertrag', MARGIN + doc.getTextWidth('xKMU digital solutions  '), 12)

  // Thin separator line
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, 15, pageWidth - MARGIN, 15)
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  y += 4
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...HEADER_COLOR)
  doc.text(title, MARGIN, y)
  y += 8
  return y
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, pageWidth: number, pageHeight: number): number {
  if (y + needed > pageHeight - 30) {
    doc.addPage()
    addHeader(doc, pageWidth)
    return 30
  }
  return y
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  \u2022 ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&auml;/g, 'ae')
    .replace(/&ouml;/g, 'oe')
    .replace(/&uuml;/g, 'ue')
    .replace(/&Auml;/g, 'Ae')
    .replace(/&Ouml;/g, 'Oe')
    .replace(/&Uuml;/g, 'Ue')
    .replace(/&szlig;/g, 'ss')
    .replace(/&euro;/g, 'EUR')
    .replace(/&#\d+;/g, '')
    .trim()
}

function formatDate(value: string | Date | null): string {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('de-DE')
}

function formatNumber(value: string | number | null): string {
  if (value == null) return '1'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return '1'
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

function formatCurrency(value: string | number | null): string {
  if (value == null) return '0,00 EUR'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return '0,00 EUR'
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' EUR'
}
