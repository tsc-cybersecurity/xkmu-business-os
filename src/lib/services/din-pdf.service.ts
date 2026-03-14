import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const TOPIC_NAMES: Record<number, string> = {
  1: 'Organisation & Sensibilisierung',
  2: 'Identitaets- & Berechtigungsmanagement',
  3: 'Datensicherung',
  4: 'Patch- & Aenderungsmanagement',
  5: 'Schutz vor Schadprogrammen',
  6: 'IT-Systeme & Netzwerke',
}

interface CompanyData {
  name: string
  legalForm?: string | null
  street?: string | null
  houseNumber?: string | null
  postalCode?: string | null
  city?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  industry?: string | null
  employeeCount?: number | null
  vatId?: string | null
}

interface ConsultantData {
  firstName?: string | null
  lastName?: string | null
  email: string
}

interface RequirementData {
  id: number
  number: string
  groupNumber?: string | null
  componentNumber?: number | null
  type: string
  topicArea: number
  officialAnforderungText?: string
  questionText: string
  recommendationText: string | null
  isStatusQuestion: boolean
  points?: number | null
}

interface AnswerData {
  requirementId: number
  status: string
  justification: string | null
}

interface GrantData {
  name: string
  provider: string
  purpose: string | null
  url: string | null
  region: string
}

interface ScoringData {
  currentScore: number
  maxScore: number
  topicProgress: Record<number, number>
  totalRequirements: number
  fulfilledRequirements: number
  notFulfilledRequirements: number
  irrelevantRequirements: number
  riskLevel: { level: string; description: string }
}

interface DinPdfInput {
  company: CompanyData | null
  consultant: ConsultantData | null
  scoring: ScoringData
  requirements: RequirementData[]
  answers: AnswerData[]
  grants: GrantData[]
  auditDate: string | null
}

export function generateDinPdf(input: DinPdfInput): jsPDF {
  const { company, consultant, scoring, requirements, answers, grants } = input
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin

  const answerMap = new Map<number, AnswerData>()
  for (const a of answers) {
    answerMap.set(a.requirementId, a)
  }

  const dateStr = input.auditDate
    ? new Date(input.auditDate).toLocaleDateString('de-DE')
    : new Date().toLocaleDateString('de-DE')

  // Check if all TOP requirements are fulfilled
  const topReqs = requirements.filter(r => r.type === 'top' && !r.isStatusQuestion)
  const allTopFulfilled = topReqs.every(r => {
    const answer = answerMap.get(r.id)
    return answer?.status === 'fulfilled'
  })
  const maxReached = scoring.currentScore >= scoring.maxScore && scoring.maxScore > 0

  // ============================================
  // SEITE 1 (gem. DIN SPEC 27076, 6.4.2.2)
  // ============================================
  let y = 15

  // Datum rechtsbuendig (b)
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(dateStr, pageWidth - margin, y, { align: 'right' })

  // Ueberschrift (a) - exakt nach Norm
  y += 5
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  const title = 'Ergebnisbericht: Beratung zur IT- und Informationssicherheit'
  const subtitle = 'fuer Klein- und Kleinstunternehmen nach DIN SPEC 27076'
  doc.text(title, pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(11)
  doc.text(subtitle, pageWidth / 2, y, { align: 'center' })

  // Unternehmensdaten (c)
  y += 12
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Unternehmensdaten', margin, y)

  y += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)

  if (company) {
    // 1) Name (Firma)
    const companyName = company.legalForm ? `${company.name} ${company.legalForm}` : company.name
    addLabelValue(doc, margin, y, 'Firma:', companyName); y += 5.5

    // 2) Sitz (Strasse, PLZ, Stadt, Land)
    const address = [
      company.street ? `${company.street} ${company.houseNumber || ''}`.trim() : '',
      [company.postalCode, company.city].filter(Boolean).join(' '),
      company.country || '',
    ].filter(Boolean).join(', ')
    if (address) { addLabelValue(doc, margin, y, 'Sitz:', address); y += 5.5 }

    // 3) Rechtsform
    if (company.legalForm) { addLabelValue(doc, margin, y, 'Rechtsform:', company.legalForm); y += 5.5 }

    // 4) Handelsregister-Nummer (vatId as proxy)
    if (company.vatId) { addLabelValue(doc, margin, y, 'HR/USt-ID:', company.vatId); y += 5.5 }

    // 5) Branche
    if (company.industry) { addLabelValue(doc, margin, y, 'Branche:', company.industry); y += 5.5 }

    // 6) Anzahl Beschaeftigte
    if (company.employeeCount) { addLabelValue(doc, margin, y, 'Beschaeftigte:', String(company.employeeCount)); y += 5.5 }

    // Contact
    if (company.email) { addLabelValue(doc, margin, y, 'E-Mail:', company.email); y += 5.5 }
    if (company.phone) { addLabelValue(doc, margin, y, 'Telefon:', company.phone); y += 5.5 }
  }

  // Berater
  if (consultant) {
    const cName = [consultant.firstName, consultant.lastName].filter(Boolean).join(' ') || consultant.email
    addLabelValue(doc, margin, y, 'Berater:', cName); y += 5.5
  }

  // Risiko-Status (Punkt 10 - min. Schriftgroesse 30)
  y += 8
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(245, 245, 250)
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'FD')

  y += 11
  doc.setFontSize(30)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(
    `Ihr Unternehmen hat ${scoring.currentScore} / ${scoring.maxScore} Punkte erreicht`,
    pageWidth / 2, y, { align: 'center' }
  )

  // Erklaerungstext (Punkte 11/12/13)
  y += 12
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  let explanationText = ''
  if (maxReached) {
    // Punkt 11
    explanationText = 'Herzlichen Glueckwunsch! Ihr Unternehmen erfuellt alle Anforderungen nach DIN SPEC 27076, Anhang A. Ein guter Start fuer die Informationssicherheit in Ihrem Betrieb! Nehmen Sie nun die naechsten Ziele in den Blick und befragen Sie Ihren durchfuehrenden Dienstleister nach weiterfuehrenden Zertifizierungen und Massnahmen.'
  } else if (allTopFulfilled) {
    // Punkt 12
    explanationText = 'Setzen Sie umgehend die offenen Handlungsempfehlungen um (siehe Seite 2).'
  } else {
    // Punkt 13
    explanationText = 'Setzen Sie umgehend die Handlungsempfehlungen der TOP-Anforderungen und anschliessend alle weiteren Handlungsempfehlungen um (siehe Seite 2).'
  }

  const lines = doc.splitTextToSize(explanationText, contentWidth)
  doc.text(lines, margin, y)
  y += lines.length * 4

  // Spinnennetzdiagramm-Placeholder (Punkt 14)
  // jsPDF kann kein echtes Radar-Chart rendern, daher als Tabelle
  y += 6
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Erfuellungsgrad nach Themenbereich', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [['Themenbereich', 'Erfuellung']],
    body: Object.entries(TOPIC_NAMES).map(([id, name]) => {
      const progress = scoring.topicProgress[Number(id)] || 0
      return [name, `${progress}%`]
    }),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const pct = parseInt(String(data.cell.raw))
        if (pct >= 80) data.cell.styles.textColor = [0, 130, 0]
        else if (pct >= 50) data.cell.styles.textColor = [180, 130, 0]
        else data.cell.styles.textColor = [200, 0, 0]
      }
    },
  })

  // ============================================
  // SEITE 2: Handlungsempfehlungen (gem. DIN SPEC 27076, 6.4.2.2)
  // ============================================
  doc.addPage()
  y = 20

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Handlungsempfehlungen', margin, y)
  y += 8

  // a) Zuerst TOP-Handlungsempfehlungen
  const notFulfilledReqs = requirements.filter(
    r => !r.isStatusQuestion && answerMap.get(r.id)?.status === 'not_fulfilled'
  )
  const topNotFulfilled = notFulfilledReqs.filter(r => r.type === 'top')
  const regularNotFulfilled = notFulfilledReqs.filter(r => r.type !== 'top')

  if (topNotFulfilled.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 30, 30)
    doc.text('Priorisierte TOP-Handlungsempfehlungen', margin, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nr.', 'Themenbereich', 'Handlungsempfehlung']],
      body: topNotFulfilled.map(req => [
        req.number,
        TOPIC_NAMES[req.topicArea] || '',
        req.recommendationText || 'Massnahmen erforderlich',
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [180, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 45 },
        2: { cellWidth: 100 },
      },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Dann weitere Handlungsempfehlungen
  if (regularNotFulfilled.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(50, 50, 50)
    doc.text('Weitere Handlungsempfehlungen', margin, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Nr.', 'Themenbereich', 'Handlungsempfehlung']],
      body: regularNotFulfilled.map(req => [
        req.number,
        TOPIC_NAMES[req.topicArea] || '',
        req.recommendationText || 'Massnahmen erforderlich',
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 45 },
        2: { cellWidth: 100 },
      },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  if (notFulfilledReqs.length === 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 130, 0)
    doc.text('Alle Anforderungen wurden erfuellt. Keine Handlungsempfehlungen notwendig.', margin, y)
    y += 10
  }

  // b) Versicherungstext (gem. DIN SPEC 6.4.2.2, Seite 2, Punkt b)
  const certY = Math.max(y + 10, pageHeight - 70)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(60, 60, 60)

  const certText = 'Ich versichere, dass im Gespraech zur Erhebung des IST-Zustandes unseres Unternehmens eine objektive Rolle eingenommen und die Beratung nach bestem Wissen und Gewissen durchgefuehrt wurde.'
  const certLines = doc.splitTextToSize(certText, contentWidth)
  doc.text(certLines, margin, certY)

  // Unterschriftsfelder
  const sigY = certY + certLines.length * 4 + 12
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setDrawColor(100, 100, 100)

  // Links: Berater
  doc.line(margin, sigY, margin + 70, sigY)
  doc.setFontSize(8)
  doc.text('Datum, Unterschrift IT-Dienstleister', margin, sigY + 4)

  // Rechts: Unternehmen
  doc.line(pageWidth - margin - 70, sigY, pageWidth - margin, sigY)
  doc.text('Datum, Unterschrift Unternehmen', pageWidth - margin - 70, sigY + 4)

  // ============================================
  // ANHANG A: Detailergebnisse (gem. DIN SPEC 27076, 6.4.2.3)
  // ============================================
  doc.addPage()
  y = 20
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Anhang A: Ihre Ergebnisse im Detail', margin, y)
  y += 5

  // Tabelle: Themenbereich | Anforderung | Risiko-Status | Handlungsempfehlung
  const detailReqs = requirements.filter(r => !r.isStatusQuestion)

  for (let topic = 1; topic <= 6; topic++) {
    const topicReqs = detailReqs.filter(r => r.topicArea === topic)
    if (topicReqs.length === 0) continue

    const tableData = topicReqs.map(req => {
      const answer = answerMap.get(req.id)
      const points = req.points ?? (req.type === 'top' ? 3 : 1)
      let statusText = '-'
      let statusPoints = ''
      if (answer?.status === 'fulfilled') {
        statusText = 'Erfuellt'
        statusPoints = `+${points}`
      } else if (answer?.status === 'not_fulfilled') {
        statusText = 'Nicht erfuellt'
        statusPoints = req.type === 'top' ? `-${points}` : '0'
      } else if (answer?.status === 'irrelevant') {
        statusText = 'Nicht relevant'
        statusPoints = '-'
      }

      return {
        number: `${req.type === 'top' ? 'TOP ' : ''}${req.number}`,
        anforderung: req.questionText,
        status: `${statusText} (${statusPoints})`,
        empfehlung: answer?.status === 'not_fulfilled' ? (req.recommendationText || '') : '',
        notFulfilled: answer?.status === 'not_fulfilled',
        justification: answer?.justification || '',
      }
    })

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
        : y + 3,
      head: [[{
        content: TOPIC_NAMES[topic],
        colSpan: 4,
        styles: { fillColor: [40, 60, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      }],
      ['Nr.', 'Anforderung', 'Risiko-Status', 'Handlungsempfehlung']],
      body: tableData.map(r => [r.number, r.anforderung, r.status, r.empfehlung]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 55 },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 57 },
      },
      // Gem. DIN SPEC: nicht erfuellte Zeilen rot hinterlegen
      didParseCell: (data) => {
        if (data.section === 'body') {
          const rowData = tableData[data.row.index]
          if (rowData?.notFulfilled) {
            data.cell.styles.fillColor = [255, 230, 230]
          }
        }
      },
    })
  }

  // ============================================
  // ANHANG B: Foerdermittel (gem. DIN SPEC 27076, 6.4.2.4)
  // Querformat, Tabelle mit Foerdermittelgeber, Name, Gegenstand, URL
  // ============================================
  if (grants.length > 0) {
    doc.addPage('landscape')
    y = 20
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Anhang B: Uebersicht relevanter Foerdermoeglichkeiten', margin, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Foerdermittelgeber', 'Name der Foerdermoeglichkeit', 'Gegenstand der Foerderung', 'Weiterfuehrende Informationen']],
      body: grants.map(g => [
        g.provider,
        g.name,
        g.purpose || '',
        g.url || '',
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 11, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [40, 60, 100], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 60 },
        2: { cellWidth: 80 },
        3: { cellWidth: 60 },
      },
    })
  }

  // ============================================
  // Seitennummern (alle Seiten)
  // ============================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Seite ${i} von ${totalPages}`, pw / 2, ph - 8, { align: 'center' })
    if (i > 1) {
      doc.text(
        `DIN SPEC 27076 Ergebnisbericht | ${company?.name || 'Unbekannt'} | ${dateStr}`,
        margin, ph - 8
      )
    }
  }

  return doc
}

function addLabelValue(doc: jsPDF, x: number, y: number, label: string, value: string) {
  doc.setFont('helvetica', 'bold')
  doc.text(label, x, y)
  const labelWidth = doc.getTextWidth(label)
  doc.setFont('helvetica', 'normal')
  doc.text(value, x + labelWidth + 3, y)
}
