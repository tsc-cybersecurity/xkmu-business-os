import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { EosService } from '@/lib/services/eos.service'
import { OkrService } from '@/lib/services/okr.service'
import { SopService } from '@/lib/services/sop.service'
import { logger } from '@/lib/utils/logger'
const MOD = 'ManagementSeed'

export async function seedManagementFramework() {
  logger.info('Seeding Management Framework...', { module: MOD })

  // Grab first user for owner references
  const [firstUser] = await db.select().from(users)
    .limit(1)
  const ownerId = firstUser?.id ?? null

  // ── VTO ──────────────────────────────────────────────────────────────
  const existingVto = await EosService.getVTO()
  if (!existingVto) {
    await EosService.upsertVTO({
      coreValues: ['Sicherheit', 'Pragmatismus', 'Kundenfokus', 'Innovation', 'Transparenz'],
      coreFocus: {
        purpose: 'KMU vor Cyberbedrohungen schuetzen und digital befaehigen',
        niche: 'IT-Sicherheit & Digitalisierung fuer kleine Unternehmen in Thueringen',
      },
      tenYearTarget: '500 KMU in Thueringen aktiv betreut, Marktfuehrer fuer KMU-Cybersicherheit in Mitteldeutschland',
      marketingStrategy: {
        targetMarket: 'KMU 5-250 MA in Thueringen/Sachsen/Sachsen-Anhalt',
        uniqueSellingPoint: 'All-in-One BusinessOS + Cybersicherheit aus einer Hand',
        provenProcess: 'DIN SPEC 27076 Quick-Check → Grundschutz++ → Managed Security',
        guarantee: '72h Incident Response Garantie',
      },
      threeYearPicture: {
        revenue: 750000, profit: 150000,
        measurables: ['50 aktive Kunden', '3 Mitarbeiter', 'NPS > 60'],
        whatDoesItLookLike: 'Etablierter Partner fuer KMU-Sicherheit mit eigenem SaaS-Produkt',
      },
      oneYearPlan: {
        revenue: 350000, profit: 70000,
        goals: ['20 neue DIN SPEC Audits', 'BusinessOS v2.0 Launch', '5 Managed Security Kunden', 'ISO 27001 Vorbereitung starten'],
      },
    }, ownerId ?? undefined)
    logger.info('VTO created', { module: MOD })
  } else {
    logger.info('VTO already exists, skipping...', { module: MOD })
  }

  // ── Rocks (Q2-2026) ─────────────────────────────────────────────────
  const existingRocks = await EosService.listRocks('Q2-2026')
  if (existingRocks.length === 0) {
    const rock1 = await EosService.createRock({
      title: 'Website-Relaunch xkmu.de',
      ownerId,
      quarter: 'Q2-2026',
      status: 'on-track',
      dueDate: '2026-06-30',
    })
    await EosService.addMilestone(rock1.id, { title: 'Design-Entwurf abgenommen', dueDate: '2026-05-15', sequence: 1 })
    await EosService.addMilestone(rock1.id, { title: 'Go-Live Termin eingehalten', dueDate: '2026-06-30', sequence: 2 })

    const rock2 = await EosService.createRock({
      title: '5 Neukunden DIN SPEC 27076',
      ownerId,
      quarter: 'Q2-2026',
      status: 'on-track',
      dueDate: '2026-06-30',
    })
    await EosService.addMilestone(rock2.id, { title: 'Akquise-Kampagne gestartet', dueDate: '2026-04-30', sequence: 1 })
    await EosService.addMilestone(rock2.id, { title: '3 Audits abgeschlossen', dueDate: '2026-05-31', sequence: 2 })
    await EosService.addMilestone(rock2.id, { title: '5 Audits abgeschlossen', dueDate: '2026-06-30', sequence: 3 })

    const rock3 = await EosService.createRock({
      title: 'BusinessOS SOP-Modul live',
      ownerId,
      quarter: 'Q2-2026',
      status: 'done',
      dueDate: '2026-06-30',
    })
    const ms1 = await EosService.addMilestone(rock3.id, { title: 'MVP fertiggestellt', dueDate: '2026-04-15', sequence: 1 })
    await EosService.toggleMilestone(ms1.id)
    const ms2 = await EosService.addMilestone(rock3.id, { title: 'Rollout an Pilotkunden', dueDate: '2026-05-01', sequence: 2 })
    await EosService.toggleMilestone(ms2.id)

    logger.info('3 Rocks with milestones created', { module: MOD })
  } else {
    logger.info('Rocks already exist for Q2-2026, skipping...', { module: MOD })
  }

  // ── Scorecard Metrics + 4 weeks sample data ─────────────────────────
  const existingMetrics = await EosService.listMetrics()
  if (existingMetrics.length === 0) {
    const metricsData = [
      { name: 'Neue Leads', goal: 10, unit: 'Stk', weeks: [8, 12, 9, 11] },
      { name: 'Angebote versendet', goal: 5, unit: 'Stk', weeks: [4, 6, 5, 7] },
      { name: 'Abschlussquote', goal: 40, unit: '%', weeks: [35, 42, 38, 45] },
      { name: 'Auslastung Team', goal: 75, unit: '%', weeks: [70, 78, 82, 74] },
      { name: 'Kundenzufriedenheit NPS', goal: 50, unit: 'Punkte', weeks: [48, 52, 45, 55] },
    ]
    const weekLabels = ['2026-W14', '2026-W13', '2026-W12', '2026-W11']

    for (const m of metricsData) {
      const metric = await EosService.createMetric({ name: m.name, goal: m.goal, unit: m.unit, ownerId })
      for (let i = 0; i < weekLabels.length; i++) {
        await EosService.upsertEntry(metric.id, weekLabels[i], m.weeks[i])
      }
    }
    logger.info('5 Scorecard metrics with sample data created', { module: MOD })
  } else {
    logger.info('Scorecard metrics already exist, skipping...', { module: MOD })
  }

  // ── Issues (IDS) ────────────────────────────────────────────────────
  const existingIssues = await EosService.listIssues()
  if (existingIssues.length === 0) {
    await EosService.createIssue({
      title: 'Onboarding-Prozess zu langsam',
      description: 'Neue Kunden warten teilweise 2 Wochen auf vollstaendiges Setup. Ziel: unter 3 Werktage.',
      priority: 'high',
      createdBy: ownerId,
    })
    await EosService.createIssue({
      title: 'Backup-Monitoring fehlt bei 3 Kunden',
      description: 'Bei drei Managed-Security-Kunden ist kein automatisches Backup-Monitoring eingerichtet.',
      priority: 'high',
      createdBy: ownerId,
    })
    const newsletter = await EosService.createIssue({
      title: 'Newsletter-Tool evaluieren',
      description: 'Aktuell kein professionelles Newsletter-Tool im Einsatz. Optionen pruefen.',
      priority: 'low',
      createdBy: ownerId,
    })
    await EosService.updateIssue(newsletter.id, {
      status: 'solved',
      solution: 'Entscheidung fuer Brevo',
    })
    logger.info('3 Issues created', { module: MOD })
  } else {
    logger.info('Issues already exist, skipping...', { module: MOD })
  }

  // ── OKR Cycle + Objectives + Key Results ────────────────────────────
  const existingCycle = await OkrService.getActiveCycle()
  if (!existingCycle) {
    const cycle = await OkrService.createCycle({
      name: 'Q2 2026',
      type: 'quarterly',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      isActive: true,
    })

    // Objective 1
    const obj1 = await OkrService.createObjective({
      cycleId: cycle.id,
      title: 'Marktposition in Thueringen ausbauen',
      ownerId,
    })
    await OkrService.addKeyResult(obj1.id, { title: '20 DIN SPEC Quick-Checks durchgefuehrt', startValue: 0, targetValue: 20, currentValue: 8, unit: 'Stk' })
    await OkrService.addKeyResult(obj1.id, { title: 'Website-Traffic auf 5000 Besucher/Monat', startValue: 1200, targetValue: 5000, currentValue: 2800, unit: 'Besucher' })
    await OkrService.addKeyResult(obj1.id, { title: '3 Kooperationspartner gewonnen', startValue: 0, targetValue: 3, currentValue: 1, unit: 'Partner' })

    // Objective 2
    const obj2 = await OkrService.createObjective({
      cycleId: cycle.id,
      title: 'Produktqualitaet BusinessOS steigern',
      ownerId,
    })
    await OkrService.addKeyResult(obj2.id, { title: 'Kundenzufriedenheit NPS >= 60', startValue: 42, targetValue: 60, currentValue: 51, unit: 'Punkte' })
    await OkrService.addKeyResult(obj2.id, { title: '0 kritische Bugs in Produktion', startValue: 5, targetValue: 0, currentValue: 2, unit: 'Bugs' })
    await OkrService.addKeyResult(obj2.id, { title: '95% Uptime SLA eingehalten', startValue: 92, targetValue: 95, currentValue: 94.5, unit: '%' })

    logger.info('OKR Cycle with 2 Objectives and 6 KRs created', { module: MOD })
  } else {
    logger.info('Active OKR cycle already exists, skipping...', { module: MOD })
  }

  // ── SOPs ─────────────────────────────────────────────────────────────
  const existingSops = await SopService.list()
  if (existingSops.length === 0) {
    // SOP 1: Onboarding neuer Kunde
    const sop1 = await SopService.create({
      title: 'Onboarding neuer Kunde',
      category: 'Vertrieb',
      status: 'approved',
      ownerId,
      purpose: 'Strukturierter Ablauf zur Aufnahme neuer Kunden in die Betreuung.',
      scope: 'Gilt fuer alle Neukunden ab Vertragsunterschrift.',
      reviewDate: '2026-10-01',
    })
    await SopService.setSteps(sop1.id, [
      { sequence: 1, title: 'Vertragsdaten erfassen', description: 'Kundendaten, Vertragslaufzeit und Leistungsumfang im CRM anlegen.', responsible: 'Vertrieb', estimatedMinutes: 15 },
      { sequence: 2, title: 'Willkommens-E-Mail versenden', description: 'Personalisierte Begruessung mit Zugangsdaten und Ansprechpartner senden.', responsible: 'Vertrieb', estimatedMinutes: 10 },
      { sequence: 3, title: 'Kick-off-Termin vereinbaren', description: 'Termin innerhalb von 5 Werktagen nach Vertragsstart koordinieren.', responsible: 'Projektleitung', estimatedMinutes: 10 },
      { sequence: 4, title: 'Technisches Setup durchfuehren', description: 'VPN-Zugang, Monitoring und Backup-Agenten beim Kunden einrichten.', responsible: 'IT-Team', estimatedMinutes: 60, warnings: ['Vor Einrichtung Firewall-Regeln mit Kunden abstimmen'] },
      { sequence: 5, title: 'Onboarding abschliessen', description: 'Checkliste pruefen, Status im CRM auf aktiv setzen, Feedback einholen.', responsible: 'Projektleitung', estimatedMinutes: 15, checklistItems: ['CRM-Status aktualisiert', 'Monitoring aktiv', 'Kunde hat Zugangsdaten'] },
    ])

    // SOP 2: Incident Response Ablauf
    const sop2 = await SopService.create({
      title: 'Incident Response Ablauf',
      category: 'IT & Cybersicherheit',
      status: 'approved',
      ownerId,
      purpose: 'Einheitlicher Ablauf bei IT-Sicherheitsvorfaellen zur Schadensminimierung.',
      scope: 'Alle gemeldeten Sicherheitsvorfaelle bei Kunden und intern.',
      reviewDate: '2026-07-01',
    })
    await SopService.setSteps(sop2.id, [
      { sequence: 1, title: 'Vorfall entgegennehmen', description: 'Meldung dokumentieren: Zeitpunkt, betroffene Systeme, Melder.', responsible: 'IT-Team', estimatedMinutes: 5 },
      { sequence: 2, title: 'Schweregrad bewerten', description: 'Einstufung nach Kritikalitaet (niedrig/mittel/hoch/kritisch) vornehmen.', responsible: 'IT-Sicherheit', estimatedMinutes: 10, warnings: ['Bei kritischen Vorfaellen sofort Geschaeftsfuehrung informieren'] },
      { sequence: 3, title: 'Eindaemmung einleiten', description: 'Betroffene Systeme isolieren, Zugaenge sperren, Beweise sichern.', responsible: 'IT-Team', estimatedMinutes: 30 },
      { sequence: 4, title: 'Ursachenanalyse durchfuehren', description: 'Logfiles auswerten, Angriffsvektor identifizieren, Timeline erstellen.', responsible: 'IT-Sicherheit', estimatedMinutes: 120 },
      { sequence: 5, title: 'Wiederherstellung', description: 'Systeme aus sauberen Backups wiederherstellen, Patches einspielen.', responsible: 'IT-Team', estimatedMinutes: 180 },
      { sequence: 6, title: 'Nachbereitung und Dokumentation', description: 'Lessons Learned erstellen, Massnahmen ableiten, Bericht an Kunden.', responsible: 'IT-Sicherheit', estimatedMinutes: 60, checklistItems: ['Bericht erstellt', 'Massnahmen definiert', 'DSGVO-Meldung geprueft'] },
    ])

    // SOP 3: Angebotserstellung
    const sop3 = await SopService.create({
      title: 'Angebotserstellung',
      category: 'Vertrieb',
      status: 'approved',
      ownerId,
      purpose: 'Standardisierter Prozess zur Erstellung und Nachverfolgung von Angeboten.',
      scope: 'Alle Angebote ab einem Volumen von 500 EUR.',
      reviewDate: '2026-09-01',
    })
    await SopService.setSteps(sop3.id, [
      { sequence: 1, title: 'Anforderungen klaeren', description: 'Kundenbedarf im Gespraech oder per E-Mail detailliert aufnehmen.', responsible: 'Vertrieb', estimatedMinutes: 30 },
      { sequence: 2, title: 'Kalkulation erstellen', description: 'Aufwand schaetzen, Preise aus Produktkatalog uebernehmen, Marge pruefen.', responsible: 'Vertrieb', estimatedMinutes: 30 },
      { sequence: 3, title: 'Angebot versenden', description: 'PDF-Angebot mit Vorlage erstellen und per E-Mail an den Kunden senden.', responsible: 'Vertrieb', estimatedMinutes: 15 },
      { sequence: 4, title: 'Follow-up nach 5 Tagen', description: 'Telefonisch oder per E-Mail nachfassen, offene Fragen klaeren.', responsible: 'Vertrieb', estimatedMinutes: 10, checklistItems: ['Angebot im CRM nachverfolgt', 'Ergebnis dokumentiert'] },
    ])

    // SOP 4: Blogpost-Workflow
    const sop4 = await SopService.create({
      title: 'Blogpost-Workflow',
      category: 'Marketing',
      status: 'draft',
      ownerId,
      purpose: 'Ablauf von der Themenidee bis zur Veroeffentlichung eines Blogposts.',
      scope: 'Alle Blog-Beitraege auf xkmu.de.',
    })
    await SopService.setSteps(sop4.id, [
      { sequence: 1, title: 'Thema recherchieren', description: 'SEO-Keyword-Recherche durchfuehren, Relevanz fuer Zielgruppe pruefen.', responsible: 'Marketing', estimatedMinutes: 30 },
      { sequence: 2, title: 'Entwurf schreiben', description: 'Artikel mit KI-Unterstuetzung erstellen, Mindestlaenge 800 Woerter.', responsible: 'Marketing', estimatedMinutes: 60 },
      { sequence: 3, title: 'Review und Freigabe', description: 'Fachliche Pruefung durch Experten, sprachliches Lektorat.', responsible: 'Geschaeftsfuehrung', estimatedMinutes: 20 },
      { sequence: 4, title: 'Veroeffentlichung und Promotion', description: 'Im CMS publizieren, auf LinkedIn und Newsletter teilen.', responsible: 'Marketing', estimatedMinutes: 15, checklistItems: ['SEO-Meta-Daten gesetzt', 'Social-Media-Post erstellt'] },
    ])

    // SOP 5: IT-Security Quick-Check Durchfuehrung
    const sop5 = await SopService.create({
      title: 'IT-Security Quick-Check Durchfuehrung',
      category: 'IT & Cybersicherheit',
      status: 'approved',
      ownerId,
      purpose: 'Standardisierter Ablauf fuer DIN SPEC 27076 Quick-Checks bei Kunden.',
      scope: 'Alle gebuchten DIN SPEC 27076 Audits.',
      reviewDate: '2026-08-01',
    })
    await SopService.setSteps(sop5.id, [
      { sequence: 1, title: 'Vorbereitung und Terminierung', description: 'Fragebogen vorbereiten, Termin mit Kunde abstimmen, Agenda versenden.', responsible: 'IT-Sicherheit', estimatedMinutes: 20 },
      { sequence: 2, title: 'Interview durchfuehren', description: 'Vor-Ort oder remote die 27 Anforderungen systematisch abfragen.', responsible: 'IT-Sicherheit', estimatedMinutes: 90, warnings: ['Ergebnisse direkt im Tool dokumentieren, nicht nachtraeglich'] },
      { sequence: 3, title: 'Ergebnis auswerten', description: 'Punktzahl berechnen, Handlungsempfehlungen priorisieren.', responsible: 'IT-Sicherheit', estimatedMinutes: 30 },
      { sequence: 4, title: 'Bericht erstellen', description: 'PDF-Bericht mit Ergebnissen, Ampeldarstellung und Massnahmenplan generieren.', responsible: 'IT-Sicherheit', estimatedMinutes: 30 },
      { sequence: 5, title: 'Ergebnisse praesentieren', description: 'Dem Kunden die Ergebnisse vorstellen und naechste Schritte besprechen.', responsible: 'IT-Sicherheit', estimatedMinutes: 45, checklistItems: ['Bericht uebergeben', 'Foerderfaehigkeit geprueft', 'Follow-up-Termin vereinbart'] },
    ])

    logger.info('5 SOPs with steps created', { module: MOD })
  } else {
    logger.info('SOPs already exist, skipping...', { module: MOD })
  }

  logger.info('Management Framework seed completed!', { module: MOD })
}
