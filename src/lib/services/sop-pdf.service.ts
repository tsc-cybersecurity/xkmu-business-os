import jsPDF from 'jspdf'

/* eslint-disable @typescript-eslint/no-explicit-any */

const M = 20, HC = [0, 82, 155] as const, DK = [30, 30, 30] as const
const GR = [80, 80, 80] as const, LG = [150, 150, 150] as const

export interface SopWithDetails {
  id: string; title: string; category: string
  version?: string | null; status?: string | null
  purpose?: string | null; scope?: string | null
  reviewDate?: Date | string | null
  steps: Array<{
    sequence: number; title: string; description?: string | null
    responsible?: string | null; estimatedMinutes?: number | null
    warnings?: string[] | null; checklistItems?: string[] | null
  }>
}

const SL: Record<string, string> = { draft: 'Entwurf', approved: 'Freigegeben', review: 'In Pruefung', archived: 'Archiviert' }

export function generateSopPdf(sop: SopWithDetails): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pw = doc.internal.pageSize.getWidth(), cw = pw - 2 * M
  let y = 15; hdr(doc, pw); y = 30

  // Title
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...HC)
  const tl = doc.splitTextToSize(sop.title, cw - 30)
  doc.text(tl, M, y); y += tl.length * 7 + 2

  // Version badge
  if (sop.version) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.setFillColor(230, 240, 255); doc.setDrawColor(180, 200, 230)
    const b = `v${sop.version}`, bw = doc.getTextWidth(b) + 6
    doc.roundedRect(M, y - 3.5, bw, 5.5, 1.5, 1.5, 'FD')
    doc.setTextColor(...HC); doc.text(b, M + 3, y); y += 8
  }

  // Metadata box
  doc.setFillColor(245, 245, 250); doc.setDrawColor(200, 200, 200)
  doc.roundedRect(M, y, cw, 18, 2, 2, 'FD')
  doc.setFontSize(9); doc.setTextColor(...DK)
  const meta = [['Kategorie', sop.category], ['Status', SL[sop.status || ''] || sop.status || '-'],
    ['Prueftermin', sop.reviewDate ? new Date(sop.reviewDate).toLocaleDateString('de-DE') : '-']]
  const colW = cw / meta.length
  for (let i = 0; i < meta.length; i++) {
    const x = M + 5 + i * colW
    doc.setFont('helvetica', 'bold'); doc.text(meta[i][0], x, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GR)
    doc.text(meta[i][1], x, y + 12); doc.setTextColor(...DK)
  }
  y += 24

  // Purpose & Scope
  for (const [label, text] of [['Zweck', sop.purpose], ['Geltungsbereich', sop.scope]] as const) {
    if (!text) continue
    y = pgBrk(doc, y, 20, pw); y = secTitle(doc, label, y)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DK)
    const lines = doc.splitTextToSize(text, cw)
    doc.text(lines, M, y); y += lines.length * 4.5 + 4
  }

  // Steps
  if (sop.steps.length > 0) {
    y = pgBrk(doc, y, 20, pw); y = secTitle(doc, 'Schritte', y)
    const sorted = [...sop.steps].sort((a, b) => a.sequence - b.sequence)
    for (const s of sorted) {
      y = pgBrk(doc, y, 30, pw)
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...HC)
      doc.text(`${s.sequence}. ${s.title}`, M, y); y += 5
      if (s.description) {
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DK)
        const dl = doc.splitTextToSize(s.description, cw - 8)
        doc.text(dl, M + 4, y); y += dl.length * 4 + 2
      }
      const det: string[] = []
      if (s.responsible) det.push(`Verantwortlich: ${s.responsible}`)
      if (s.estimatedMinutes) det.push(`Dauer: ${s.estimatedMinutes} Min.`)
      if (det.length) {
        doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GR)
        doc.text(det.join('  |  '), M + 4, y); y += 5
      }
      for (const w of (s.warnings?.filter(Boolean) || [])) {
        y = pgBrk(doc, y, 8, pw)
        doc.setFillColor(255, 248, 220)
        const wl = doc.splitTextToSize(`Achtung: ${w}`, cw - 16), bh = wl.length * 4 + 3
        doc.roundedRect(M + 4, y - 3, cw - 8, bh, 1, 1, 'F')
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(140, 100, 0)
        doc.text(wl, M + 8, y); y += bh + 2
      }
      for (const c of (s.checklistItems?.filter(Boolean) || [])) {
        y = pgBrk(doc, y, 6, pw)
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DK)
        doc.setDrawColor(140, 140, 140); doc.setLineWidth(0.3)
        doc.rect(M + 6, y - 2.5, 2.8, 2.8); doc.text(c, M + 12, y); y += 4
      }
      y += 3
    }
  }

  // Footers
  const tp = doc.getNumberOfPages()
  for (let i = 1; i <= tp; i++) {
    doc.setPage(i); if (i > 1) hdr(doc, pw)
    doc.setFontSize(8); doc.setTextColor(...LG)
    doc.text(`Vertraulich | Seite ${i} von ${tp}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
  }
  return doc
}

function hdr(doc: jsPDF, pw: number) {
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GR)
  doc.text('xKMU digital solutions', M, 12); doc.setTextColor(...HC)
  doc.text('|  Standard Operating Procedure', M + doc.getTextWidth('xKMU digital solutions  '), 12)
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(M, 15, pw - M, 15)
}

function secTitle(doc: jsPDF, t: string, y: number): number {
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...HC)
  doc.text(t, M, y + 4); return y + 11
}

function pgBrk(doc: jsPDF, y: number, n: number, pw: number): number {
  if (y + n > doc.internal.pageSize.getHeight() - 15) { doc.addPage(); hdr(doc, pw); return 30 }
  return y
}
