import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* eslint-disable @typescript-eslint/no-explicit-any */

const MARGIN = 20
const HEADER_COLOR = [0, 82, 155] as const // xKMU blue
const DARK = [30, 30, 30] as const
const GRAY = [80, 80, 80] as const
const LIGHT_GRAY = [150, 150, 150] as const

const PHASE_LABELS: Record<string, string> = {
  IMMEDIATE: 'Sofort (0\u201330 Min.)',
  SHORT: 'Kurzfristig (30 Min.\u20134 Std.)',
  MEDIUM: 'Mittelfristig (4\u201372 Std.)',
  LONG: 'Langfristig (> 72 Std.)',
}

const RESPONSIBLE_LABELS: Record<string, string> = {
  IT_ADMIN: 'IT-Verantwortlicher',
  MANAGEMENT: 'Geschaeftsfuehrung',
  HR: 'Personalabteilung',
  FINANCE: 'Finanzen',
  LEGAL: 'Rechtsabteilung',
  DATA_PROTECTION_OFFICER: 'Datenschutzbeauftragter',
  XKMU_SUPPORT: 'xKMU Notfallkontakt',
  ALL_STAFF: 'Alle Mitarbeiter',
  AFFECTED_USER: 'Betroffener MA',
  EXTERNAL_FORENSICS: 'Ext. Forensik-Dienstleister',
  EXTERNAL_LAWYER: 'Ext. Rechtsanwalt',
}

const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'NIEDRIG',
  MEDIUM: 'MITTEL',
  HIGH: 'HOCH',
  CRITICAL: 'KRITISCH',
  VARIABLE: 'VARIABEL',
}

const CATEGORY_LABELS: Record<string, string> = {
  EVIDENCE: 'Beweissicherung',
  LEGAL: 'Rechtlich',
  TECHNICAL: 'Technisch',
  COMMUNICATION: 'Kommunikation',
  FINANCIAL: 'Finanziell',
}

const LESSONS_CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: 'Technisch',
  PROCESS: 'Prozess',
  AWARENESS: 'Awareness',
  LEGAL: 'Rechtlich',
  ORGANISATIONAL: 'Organisation',
}

export function generateIrPlaybookPdf(scenario: any): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - 2 * MARGIN

  const s = scenario
  const actions: any[] = s.actions || []
  const escalation: any[] = s.escalation || []
  const recoverySteps: any[] = s.recovery_steps || []
  const checklist: any[] = s.checklist || []
  const lessonsLearned: any[] = s.lessons_learned || []
  const references: any[] = s.references || []

  // ============================================
  // PAGE 1: Title, Overview, Sofortmassnahmen
  // ============================================
  let y = 15

  // Header line
  addHeader(doc, pageWidth)
  y = 30

  // Title with color (strip emoji - jsPDF cannot render them)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const titleColor = s.color_hex ? hexToRgb(s.color_hex) : HEADER_COLOR
  doc.setTextColor(...titleColor)
  const scenarioNum = s.id ? parseInt(s.id.replace('S-', ''), 10) : ''
  const titleText = `Szenario ${scenarioNum}: ${s.title}`
  const titleLines = doc.splitTextToSize(titleText, contentWidth)
  doc.text(titleLines, MARGIN, y)
  y += titleLines.length * 7 + 1

  // Subtitle (italic)
  if (s.subtitle) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...titleColor)
    const subLines = doc.splitTextToSize(s.subtitle, contentWidth)
    doc.text(subLines, MARGIN, y)
    y += subLines.length * 5 + 4
  }

  // Schadenspotenzial box
  y += 4
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Schadenspotenzial', MARGIN, y)
  y += 3

  const severityText = s.severity_label || SEVERITY_LABELS[s.severity] || s.severity
  const damageRange = (s.avg_damage_eur_min != null || s.avg_damage_eur_max != null)
    ? `${formatEur(s.avg_damage_eur_min)} \u2013 ${formatEur(s.avg_damage_eur_max)}`
    : ''

  // Build description for the box from severity context
  const boxDesc: string[] = []
  if (damageRange) boxDesc.push(damageRange)
  if (s.dsgvo_relevant) boxDesc.push('DSGVO-meldepflichtig')
  if (s.nis2_relevant) boxDesc.push('NIS2-relevant')

  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(245, 245, 250)
  doc.roundedRect(MARGIN, y, contentWidth, 16, 2, 2, 'FD')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(severityText, MARGIN + 5, y + 6.5)

  if (boxDesc.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(boxDesc.join('. ') + '.', MARGIN + 5, y + 12)
  }

  y += 22

  // Overview text
  if (s.overview) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const overviewLines = doc.splitTextToSize(s.overview, contentWidth)
    if (y + overviewLines.length * 4.5 > 270) {
      doc.addPage()
      y = 30
      addHeader(doc, pageWidth)
    }
    doc.text(overviewLines, MARGIN, y)
    y += overviewLines.length * 4.5 + 6
  }

  // ============================================
  // SECTION 1: Sofortmassnahmen
  // ============================================
  y = checkPageBreak(doc, y, 20, pageWidth)
  y = addSectionTitle(doc, '1. Sofortmassnahmen', y)

  const actionsByPhase = groupBy(actions, 'phase')
  for (const phase of ['IMMEDIATE', 'SHORT', 'MEDIUM', 'LONG']) {
    const phaseActions = actionsByPhase[phase]
    if (!phaseActions || phaseActions.length === 0) continue

    const sorted = phaseActions.sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99))
    for (const action of sorted) {
      y = checkPageBreak(doc, y, 12, pageWidth)

      const timeLabel = action.time_label || PHASE_LABELS[phase] || phase
      const responsible = RESPONSIBLE_LABELS[action.responsible] || action.responsible || ''

      // Bullet with bold time label
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      const prefix = `\u2022 ${timeLabel}: `
      doc.text(prefix, MARGIN + 4, y)

      const prefixWidth = doc.getTextWidth(prefix)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)

      let actionText = action.action || ''
      if (action.do_not) actionText = `NICHT: ${actionText}`
      if (responsible) actionText += ` [${responsible}]`

      const remainingWidth = contentWidth - 4 - prefixWidth
      const actionLines = doc.splitTextToSize(actionText, remainingWidth)
      doc.text(actionLines[0], MARGIN + 4 + prefixWidth, y)

      if (actionLines.length > 1) {
        for (let i = 1; i < actionLines.length; i++) {
          y += 4
          y = checkPageBreak(doc, y, 6, pageWidth)
          doc.text(actionLines[i], MARGIN + 8, y)
        }
      }
      y += 5
    }
  }

  // ============================================
  // SECTION 2: Meldewege (Escalation Table)
  // ============================================
  if (escalation.length > 0) {
    y = checkPageBreak(doc, y, 40, pageWidth)
    y = addSectionTitle(doc, '2. Meldewege', y)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Informationskaskade \u2014 zeitkritische Abfolge:', MARGIN, y)
    y += 4

    // Build escalation table
    const escSorted = [...escalation].sort((a, b) => (a.level || 0) - (b.level || 0))
    const maxRecipients = Math.max(...escSorted.map((e: any) => e.recipients?.length || 0), 1)

    const head = escSorted.map((e: any) => {
      const deadline = e.deadline_hours != null ? ` \u2014 ${e.deadline_hours} Std.` : ''
      const label = e.label || `Stufe ${e.level}`
      return `${label}${deadline}`
    })

    const bodyRows: string[][] = []
    for (let ri = 0; ri < maxRecipients; ri++) {
      const row = escSorted.map((e: any) => {
        const recipient = e.recipients?.[ri]
        if (!recipient) return ''
        // Use human-readable role name, fall back to RESPONSIBLE_LABELS for enum values
        let text = RESPONSIBLE_LABELS[recipient.role] || recipient.role || ''
        if (recipient.legal_basis) text += ` (${recipient.legal_basis})`
        return text
      })
      bodyRows.push(row)
    }

    autoTable(doc, {
      startY: y,
      head: [head],
      body: bodyRows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [...HEADER_COLOR], textColor: [255, 255, 255], fontStyle: 'bold' },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ============================================
  // SECTION 3: Wiederherstellung
  // ============================================
  if (recoverySteps.length > 0) {
    y = checkPageBreak(doc, y, 20, pageWidth)
    y = addSectionTitle(doc, '3. Wiederherstellung', y)

    const sorted = [...recoverySteps].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    for (const step of sorted) {
      y = checkPageBreak(doc, y, 12, pageWidth)

      const responsible = RESPONSIBLE_LABELS[step.responsible] || step.responsible || ''
      const phaseLabel = step.phase_label ? `${step.phase_label}: ` : ''

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      const numText = `${step.sequence}. ${phaseLabel}`
      doc.text(numText, MARGIN + 4, y)

      const numWidth = doc.getTextWidth(numText)
      doc.setFont('helvetica', 'normal')

      let stepText = step.action || ''
      if (step.detail) stepText += ` \u2014 ${step.detail}`
      if (responsible) stepText += ` [${responsible}]`

      const stepLines = doc.splitTextToSize(stepText, contentWidth - 4 - numWidth)
      doc.text(stepLines[0], MARGIN + 4 + numWidth, y)

      if (stepLines.length > 1) {
        for (let i = 1; i < stepLines.length; i++) {
          y += 4
          y = checkPageBreak(doc, y, 6, pageWidth)
          doc.text(stepLines[i], MARGIN + 8, y)
        }
      }
      y += 5
    }
  }

  // ============================================
  // SECTION 4: Dokumentation & Nachbereitung
  // ============================================
  if (checklist.length > 0 || lessonsLearned.length > 0) {
    y = checkPageBreak(doc, y, 30, pageWidth)
    y = addSectionTitle(doc, '4. Dokumentation & Nachbereitung', y)

    // Pflichtdokumentation as autoTable for clean alignment
    if (checklist.length > 0) {
      y = checkPageBreak(doc, y, 30, pageWidth)

      // Section label
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text('Pflichtdokumentation', MARGIN, y)
      y += 3

      const sorted = [...checklist].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      const checklistData = sorted.map((item) => {
        const category = CATEGORY_LABELS[item.category] || item.category || ''
        const suffix = item.dsgvo_required ? ' [DSGVO]' : ''
        return ['\u25A1', `${item.item || ''}${suffix}`, category]
      })

      autoTable(doc, {
        startY: y,
        body: checklistData,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 8.5, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }, overflow: 'linebreak', lineColor: [230, 230, 230] },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center', fontSize: 10, cellPadding: { top: 2, bottom: 2, left: 1, right: 1 } },
          1: { cellWidth: contentWidth - 35 },
          2: { cellWidth: 28, halign: 'right', fontSize: 7, textColor: [...LIGHT_GRAY], fontStyle: 'italic' },
        },
        theme: 'plain',
        didDrawCell: (data) => {
          // Draw light bottom border for each row
          if (data.section === 'body') {
            doc.setDrawColor(230, 230, 230)
            doc.setLineWidth(0.2)
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
          }
        },
      })

      y = (doc as any).lastAutoTable.finalY + 8
    }

    // Lessons Learned box
    if (lessonsLearned.length > 0) {
      y = checkPageBreak(doc, y, 25, pageWidth)

      // Section label
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text('Lessons Learned \u2014 Prueffragen nach dem Vorfall', MARGIN, y)
      y += 5

      const lessonsByCategory = groupBy(lessonsLearned, 'category')
      for (const [category, items] of Object.entries(lessonsByCategory) as [string, any[]][]) {
        const catLabel = LESSONS_CATEGORY_LABELS[category] || category
        if (Object.keys(lessonsByCategory).length > 1) {
          y = checkPageBreak(doc, y, 10, pageWidth)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...GRAY)
          doc.text(catLabel, MARGIN + 4, y)
          y += 5
        }

        for (const item of items) {
          y = checkPageBreak(doc, y, 8, pageWidth)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...DARK)

          let text = `\u2022 ${item.question}`
          if (item.maps_to_control) text += ` [${item.maps_to_control}]`

          const lines = doc.splitTextToSize(text, contentWidth - 12)
          doc.text(lines[0], MARGIN + 6, y)
          if (lines.length > 1) {
            for (let i = 1; i < lines.length; i++) {
              y += 4
              doc.text(lines[i], MARGIN + 10, y)
            }
          }
          y += 5
        }
      }
    }
  }

  // ============================================
  // SECTION 5: Referenzen (if any)
  // ============================================
  if (references.length > 0) {
    y = checkPageBreak(doc, y, 20, pageWidth)
    y = addSectionTitle(doc, '5. Referenzen & Rechtsgrundlagen', y)

    const refsByType = groupBy(references, 'type')
    const typeLabels: Record<string, string> = {
      LEGAL: 'Rechtsgrundlagen',
      STANDARD: 'Standards & Normen',
      TOOL: 'Tools & Werkzeuge',
      AUTHORITY: 'Behoerden & Meldestellen',
      GUIDE: 'Leitfaeden & Anleitungen',
    }

    for (const [type, items] of Object.entries(refsByType) as [string, any[]][]) {
      y = checkPageBreak(doc, y, 10, pageWidth)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...GRAY)
      doc.text(typeLabels[type] || type, MARGIN + 4, y)
      y += 4

      for (const ref of items) {
        y = checkPageBreak(doc, y, 6, pageWidth)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...DARK)
        let refText = `\u2022 ${ref.name}`
        if (ref.url) refText += ` \u2014 ${ref.url}`
        const refLines = doc.splitTextToSize(refText, contentWidth - 8)
        for (const line of refLines) {
          y = checkPageBreak(doc, y, 5, pageWidth)
          doc.text(line, MARGIN + 8, y)
          y += 4
        }
        y += 1
      }
      y += 2
    }
  }

  // ============================================
  // Headers & Footers (all pages)
  // ============================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()

    // Header (page 2+)
    if (i > 1) {
      addHeader(doc, pw)
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(...LIGHT_GRAY)
    doc.text(
      `Vertraulich \u2014 Nur fuer internen Gebrauch  |  Seite ${i}`,
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
  doc.text('|  Incident Response Playbook', MARGIN + doc.getTextWidth('xKMU digital solutions  '), 12)

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

function checkPageBreak(doc: jsPDF, y: number, needed: number, pageWidth: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - 15) {
    doc.addPage()
    addHeader(doc, pageWidth)
    return 30
  }
  return y
}

function groupBy(arr: any[], key: string): Record<string, any[]> {
  return arr.reduce((acc, item) => {
    const k = item[key] as string
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, any[]>)
}

function hexToRgb(hex: string): readonly [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return HEADER_COLOR
  return [r, g, b] as const
}

function formatEur(value: number | null): string {
  if (value == null) return '?'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}
