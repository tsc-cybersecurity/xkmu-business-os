import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Prioritaet 1 - Grundlagen & groesste Cyberrisiken',
  2: 'Prioritaet 2 - Schutz sensitiver IT-Systeme',
  3: 'Prioritaet 3 - Informationsschutz intern/extern',
  4: 'Prioritaet 4 - Weitere Bereiche',
}

const STATUS_LABELS: Record<string, string> = {
  ja: 'Ja',
  nein: 'Nein',
  nicht_relevant: 'N/R',
}

interface CompanyData {
  name: string
  legalForm?: string | null
  street?: string | null
  houseNumber?: string | null
  postalCode?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  industry?: string | null
  employeeCount?: number | null
}

interface ConsultantData {
  firstName?: string | null
  lastName?: string | null
  email: string
}

interface RequirementData {
  id: number
  number: string
  category: number
  questionText: string
  helpText: string | null
  effort: string | null
}

interface AnswerData {
  requirementId: number
  status: string
  notes: string | null
}

interface ScoringData {
  currentScore: number
  maxScore: number
  categoryProgress: Record<number, number>
  jaCount: number
  neinCount: number
  nichtRelevantCount: number
  answeredRequirements: number
  totalRequirements: number
  riskLevel: { level: string; description: string }
}

interface PdfInput {
  company: CompanyData | null
  consultant: ConsultantData | null
  scoring: ScoringData
  requirements: RequirementData[]
  answers: AnswerData[]
  categoryNames: Record<number, string>
  categoryOrder: number[]
  categoryPriorities: Record<number, number>
  auditDate: string | null
}

export function generateWibaPdf(input: PdfInput): jsPDF {
  const {
    company,
    consultant,
    scoring,
    requirements,
    answers,
    categoryNames,
    categoryOrder,
    categoryPriorities,
  } = input

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = 0

  const answerMap = new Map<number, AnswerData>()
  for (const a of answers) {
    answerMap.set(a.requirementId, a)
  }

  // ============================================
  // DECKBLATT
  // ============================================
  y = 50
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('BSI Weg in die Basis-Absicherung', pageWidth / 2, y, { align: 'center' })

  y += 15
  doc.setFontSize(26)
  doc.setTextColor(30, 30, 30)
  doc.text('WiBA-Bericht', pageWidth / 2, y, { align: 'center' })

  y += 12
  doc.setFontSize(16)
  doc.setTextColor(60, 60, 60)
  doc.text('IT-Sicherheitscheck', pageWidth / 2, y, { align: 'center' })

  // Company info box
  y += 25
  if (company) {
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(248, 248, 248)
    const boxHeight = 70
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'FD')

    y += 10
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text('Unternehmensdaten', margin + 8, y)

    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)

    const companyName = company.legalForm ? `${company.name} ${company.legalForm}` : company.name
    addInfoRow(doc, margin + 8, y, 'Firma:', companyName)
    y += 6

    if (company.street || company.city) {
      const addr = [
        company.street ? `${company.street} ${company.houseNumber || ''}`.trim() : '',
        company.postalCode || company.city ? `${company.postalCode || ''} ${company.city || ''}`.trim() : '',
      ].filter(Boolean).join(', ')
      addInfoRow(doc, margin + 8, y, 'Adresse:', addr)
      y += 6
    }

    if (company.phone) { addInfoRow(doc, margin + 8, y, 'Telefon:', company.phone); y += 6 }
    if (company.email) { addInfoRow(doc, margin + 8, y, 'E-Mail:', company.email); y += 6 }
    if (company.industry) { addInfoRow(doc, margin + 8, y, 'Branche:', company.industry); y += 6 }
    if (company.employeeCount) { addInfoRow(doc, margin + 8, y, 'Mitarbeiter:', String(company.employeeCount)); y += 6 }
    if (company.website) { addInfoRow(doc, margin + 8, y, 'Website:', company.website); y += 6 }
  }

  // Consultant + date
  y += (company ? 15 : 25)
  if (consultant) {
    const consultantName = [consultant.firstName, consultant.lastName].filter(Boolean).join(' ') || consultant.email
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text(`Berater: ${consultantName}`, pageWidth / 2, y, { align: 'center' })
    y += 6
  }

  const dateStr = input.auditDate
    ? new Date(input.auditDate).toLocaleDateString('de-DE')
    : new Date().toLocaleDateString('de-DE')
  doc.text(`Datum: ${dateStr}`, pageWidth / 2, y, { align: 'center' })

  // Score summary on cover
  y += 20
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(240, 245, 255)
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'FD')

  y += 10
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  const pct = scoring.maxScore > 0 ? Math.round((scoring.currentScore / scoring.maxScore) * 100) : 0
  doc.text(`Erfuellungsgrad: ${scoring.currentScore} / ${scoring.maxScore} (${pct}%)`, pageWidth / 2, y, { align: 'center' })

  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Bewertung: ${scoring.riskLevel.level} - ${scoring.riskLevel.description}`, pageWidth / 2, y, { align: 'center' })

  y += 8
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(
    `Ja: ${scoring.jaCount} | Nein: ${scoring.neinCount} | Nicht relevant: ${scoring.nichtRelevantCount} | Beantwortet: ${scoring.answeredRequirements} / ${scoring.totalRequirements}`,
    pageWidth / 2, y, { align: 'center' }
  )

  // Footer on cover
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Erstellt mit xKMU BusinessOS', pageWidth / 2, 280, { align: 'center' })

  // ============================================
  // SEITE 2: Uebersicht nach Kategorie
  // ============================================
  doc.addPage()
  y = 20

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Ergebnisuebersicht nach Kategorie', margin, y)
  y += 10

  // Category table grouped by priority
  const categoryTableData: (string | number)[][] = []
  for (const prio of [1, 2, 3, 4]) {
    const catsInPrio = categoryOrder.filter(c => categoryPriorities[c] === prio)
    if (catsInPrio.length === 0) continue

    // Add priority header row
    categoryTableData.push([PRIORITY_LABELS[prio], '', '', ''])

    for (const catId of catsInPrio) {
      const catReqs = requirements.filter(r => r.category === catId)
      const catJa = catReqs.filter(r => answerMap.get(r.id)?.status === 'ja').length
      const catNein = catReqs.filter(r => answerMap.get(r.id)?.status === 'nein').length
      const catNr = catReqs.filter(r => answerMap.get(r.id)?.status === 'nicht_relevant').length
      const progress = scoring.categoryProgress[catId] || 0
      categoryTableData.push([
        categoryNames[catId] || `Kategorie ${catId}`,
        `${catJa} / ${catNein} / ${catNr}`,
        `${catReqs.length}`,
        `${progress}%`,
      ])
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['Kategorie', 'Ja / Nein / N/R', 'Fragen', 'Erfuellung']],
    body: categoryTableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
    didParseCell: (data) => {
      // Style priority header rows
      if (data.section === 'body' && data.row.raw) {
        const firstCell = String((data.row.raw as (string | number)[])[0])
        if (firstCell.startsWith('Prioritaet')) {
          data.cell.styles.fillColor = [230, 235, 245]
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fontSize = 9
          if (data.column.index > 0) {
            data.cell.text = ['']
          }
        }
      }
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
    },
  })

  // ============================================
  // SEITEN 3+: Alle 257 Anforderungen mit Antworten
  // ============================================
  doc.addPage()
  y = 20
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Detaillierte Ergebnisse - Alle Prueffragen', margin, y)
  y += 5

  for (const prio of [1, 2, 3, 4]) {
    const catsInPrio = categoryOrder.filter(c => categoryPriorities[c] === prio)
    if (catsInPrio.length === 0) continue

    for (const catId of catsInPrio) {
      const catReqs = requirements.filter(r => r.category === catId)
      if (catReqs.length === 0) continue

      const tableData = catReqs.map(req => {
        const answer = answerMap.get(req.id)
        const status = answer ? (STATUS_LABELS[answer.status] || answer.status) : '-'
        const notes = answer?.notes || ''
        return [
          req.number,
          req.questionText,
          status,
          notes,
        ]
      })

      const catTitle = `P${prio} | ${categoryNames[catId] || `Kategorie ${catId}`}`

      autoTable(doc, {
        startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
          ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
          : y + 5,
        head: [[{ content: catTitle, colSpan: 4, styles: { fillColor: prio === 1 ? [180, 40, 40] : prio === 2 ? [200, 120, 30] : prio === 3 ? [180, 160, 30] : [120, 120, 120], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 } }]],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 85 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 45 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const val = String(data.cell.raw)
            if (val === 'Ja') {
              data.cell.styles.textColor = [0, 130, 0]
              data.cell.styles.fontStyle = 'bold'
            } else if (val === 'Nein') {
              data.cell.styles.textColor = [200, 0, 0]
              data.cell.styles.fontStyle = 'bold'
            } else if (val === 'N/R') {
              data.cell.styles.textColor = [120, 120, 120]
            }
          }
        },
      })
    }
  }

  // ============================================
  // HANDLUNGSEMPFEHLUNGEN
  // ============================================
  const neinReqs = requirements.filter(r => answerMap.get(r.id)?.status === 'nein')
  if (neinReqs.length > 0) {
    doc.addPage()
    y = 20
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Handlungsempfehlungen', margin, y)
    y += 5

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    y += 5
    doc.text(
      `${neinReqs.length} Prueffragen wurden mit "Nein" beantwortet. Fuer diese werden Massnahmen empfohlen.`,
      margin, y
    )
    y += 5

    for (const prio of [1, 2, 3, 4]) {
      const catsInPrio = categoryOrder.filter(c => categoryPriorities[c] === prio)
      for (const catId of catsInPrio) {
        const catNeinReqs = neinReqs.filter(r => r.category === catId)
        if (catNeinReqs.length === 0) continue

        const tableData = catNeinReqs.map(req => {
          const answer = answerMap.get(req.id)
          return [
            req.number,
            req.questionText,
            req.helpText || '',
            answer?.notes || '',
            req.effort || '-',
          ]
        })

        const catTitle = `P${prio} | ${categoryNames[catId]}`

        autoTable(doc, {
          startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
            ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
            : y + 5,
          head: [[{ content: catTitle, colSpan: 5, styles: { fillColor: [200, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 } }],
                 ['Nr.', 'Prueffrage', 'Hilfsmittel / Erlaeuterung', 'Notizen', 'Aufw.']],
          body: tableData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
          headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 50 },
            2: { cellWidth: 55 },
            3: { cellWidth: 30 },
            4: { cellWidth: 13, halign: 'center' },
          },
        })
      }
    }
  }

  // ============================================
  // Seitennummern (alle Seiten ausser Deckblatt)
  // ============================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Seite ${i - 1} von ${totalPages - 1}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
    doc.text(
      `WiBA-Bericht | ${company?.name || 'Unbekannt'} | ${dateStr}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    )
  }

  return doc
}

function addInfoRow(doc: jsPDF, x: number, y: number, label: string, value: string) {
  doc.setFont('helvetica', 'bold')
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.text(value, x + 30, y)
}
