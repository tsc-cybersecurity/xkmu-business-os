/**
 * CMS Website Seed – xKMU Webseitentexte
 *
 * Seeds all 28 public pages from the xKMU Webseitentexte document.
 * Handles existing pages (updates or skips) and creates missing ones.
 *
 * Run: npx tsx src/lib/db/seeds/cms-website-seed.ts
 *
 * Requires DATABASE_URL environment variable.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { cmsPages, cmsBlocks } from '../schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

// ─── Helper: Module detail page blocks ─────────────────────────────────────────

function moduleDetailBlocks(opts: {
  badge: string
  h1: string
  subtitle: string
  einleitung: string
  ziel: string
  tags: string[]
  deliverables: Array<{ id: string; title: string; description: string }>
  ctaModul: string
  backHref: string
}) {
  return [
    {
      blockType: 'hero',
      sortOrder: 0,
      content: {
        badge: { text: opts.badge },
        headline: opts.h1,
        headlineHighlight: '',
        subheadline: opts.subtitle,
        size: 'small',
      },
    },
    {
      blockType: 'text',
      sortOrder: 1,
      content: {
        content: opts.einleitung,
        alignment: 'left',
      },
      settings: { maxWidth: 768, paddingBottom: 0 },
    },
    {
      blockType: 'banner',
      sortOrder: 2,
      content: {
        text: opts.ziel,
        variant: 'brand',
        icon: 'Target',
      },
    },
    {
      blockType: 'service-cards',
      sortOrder: 3,
      content: {
        sectionTitle: 'Konkrete Ergebnisse – keine Folien',
        sectionSubtitle: 'Was Sie erhalten',
        columns: opts.deliverables.length === 1 ? 1 : opts.deliverables.length <= 2 ? 2 : 2,
        items: opts.deliverables.map((d) => ({
          badge: d.id,
          title: d.title,
          description: d.description,
        })),
      },
    },
    {
      blockType: 'cta',
      sortOrder: 4,
      content: {
        headline: `Interesse an ${opts.ctaModul}?`,
        description: 'In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.',
        buttons: [
          { label: 'Erstgespräch buchen', href: '/kontakt', variant: 'default' },
          { label: 'Zurück zur Übersicht', href: opts.backHref, variant: 'outline' },
        ],
      },
    },
  ]
}

// ─── Helper: Pillar overview page blocks ────────────────────────────────────────

function pillarBlocks(opts: {
  h1: string
  subtitle: string
  einleitung: string
  icon: string
  modules: Array<{
    badge: string
    title: string
    description: string
    deliverables: string[]
    href: string
  }>
}) {
  return [
    {
      blockType: 'hero',
      sortOrder: 0,
      content: {
        badge: { icon: opts.icon, text: opts.subtitle },
        headline: opts.h1,
        subheadline: opts.einleitung,
        size: 'medium',
      },
    },
    {
      blockType: 'service-cards',
      sortOrder: 1,
      content: {
        sectionTitle: 'Was Sie konkret erhalten',
        sectionSubtitle: 'Alle Module',
        columns: 2,
        items: opts.modules.map((m) => ({
          badge: m.badge,
          title: m.title,
          description: m.description,
          href: m.href,
          deliverables: m.deliverables.map((d) => ({ label: d, color: 'blue' })),
        })),
      },
    },
    {
      blockType: 'cta',
      sortOrder: 2,
      content: {
        headline: 'Passt etwas davon zu Ihrer Situation?',
        description: 'Im kostenlosen Erstgespräch klären wir, welches Modul den größten Hebel hat.',
        buttons: [
          { label: 'Erstgespräch buchen', href: '/kontakt', variant: 'default' },
        ],
      },
    },
  ]
}

// ─── Page definitions ───────────────────────────────────────────────────────────

const pages = [
  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. STARTSEITE
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    slug: '/',
    title: 'Startseite',
    seoTitle: 'xKMU – KI · IT · Cybersecurity für den Mittelstand',
    seoDescription: 'xKMU digital solutions bringt KI-Automatisierung, stabile IT und echte Sicherheit in Ihr Unternehmen.',
    status: 'published',
    blocks: [
      {
        blockType: 'hero',
        sortOrder: 0,
        content: {
          badge: { text: 'KI · IT · Cybersecurity aus einer Hand' },
          headline: 'Weniger Aufwand. Mehr Ergebnis.',
          headlineHighlight: 'Moderne IT für Ihr Unternehmen.',
          subheadline: 'xKMU digital solutions bringt KI-Automatisierung, stabile IT und echte Sicherheit in Ihr Unternehmen – keine Berater-Folien, sondern Ergebnisse, die laufen.',
          buttons: [
            { label: 'Kostenloses Erstgespräch buchen', href: '/kontakt', variant: 'default' },
            { label: 'Alle Leistungen ansehen', href: '#leistungen', variant: 'outline' },
          ],
          stats: [
            { value: '3', label: 'Beratungssäulen' },
            { value: '18', label: 'Service-Module' },
            { value: '52', label: 'konkrete Deliverables' },
            { value: 'ab 490 €', label: 'Starter-Paket (Festpreis)' },
          ],
          size: 'full',
        },
      },
      {
        blockType: 'banner',
        sortOrder: 1,
        content: {
          text: 'NIS-2 trifft Ihre Kunden – und damit auch Sie. Seit Dezember 2025 gilt das neue BSIG. NIS-2-pflichtige Unternehmen müssen Sicherheitsanforderungen an ihre Dienstleister weitergeben. xKMU hilft Ihnen, diese Anforderungen pragmatisch und nachweisbar zu erfüllen.',
          variant: 'warning',
          icon: 'AlertTriangle',
          buttonLabel: 'NIS-2 Compliance ansehen',
          buttonHref: '/cybersecurity',
        },
      },
      {
        blockType: 'features',
        sortOrder: 2,
        content: {
          sectionTitle: 'Drei Säulen. Ein Ansprechpartner.',
          sectionSubtitle: 'Kein Flickenteppich aus Einzelberatern. xKMU verbindet KI, IT und Sicherheit – abgestimmt auf die Realität kleiner und mittlerer Unternehmen.',
          columns: 3,
          items: [
            {
              icon: 'Bot',
              title: 'KI-Beratung',
              description: 'Von der Potenzialanalyse bis zur laufenden Automation. Wir identifizieren, wo KI wirklich hilft, setzen es um und befähigen Ihr Team – ohne KI-Wildwuchs, sondern mit klaren Regeln.',
              link: '/ki-beratung',
            },
            {
              icon: 'Monitor',
              title: 'IT-Beratung',
              description: 'Stabile, sichere und skalierbare IT – vom Arbeitsplatz bis zur Cloud-Infrastruktur. Mit Fokus auf Betriebssicherheit, Skalierbarkeit und Kostenkontrolle.',
              link: '/it-beratung',
            },
            {
              icon: 'Shield',
              title: 'Cybersecurity-Beratung',
              description: 'Angriffsflächen reduzieren, Vorfälle abwehren, NIS-2 und DSGVO technisch umsetzen. Pragmatisch – nicht nach Lehrbuch, sondern nach Risikolage.',
              link: '/cybersecurity',
            },
          ],
        },
      },
      {
        blockType: 'service-cards',
        sortOrder: 3,
        content: {
          sectionTitle: 'Was Sie konkret erhalten',
          sectionSubtitle: 'Jedes Modul liefert definierte Ergebnisse – keine vagen Empfehlungen, sondern Dokumente, Systeme und Prozesse, die direkt einsetzbar sind.',
          columns: 3,
          items: [
            { badge: 'A1', title: 'KI-Quick-Start & Potenzialanalyse', href: '/ki-beratung/a1', deliverables: [{ label: 'Use-Case-Backlog', color: 'purple' as const }, { label: 'KI-Roadmap', color: 'purple' as const }, { label: 'Leitplanken (Guardrails)', color: 'purple' as const }] },
            { badge: 'A2', title: 'KI-Implementierung – Automationen & Workflows', href: '/ki-beratung/a2', deliverables: [{ label: 'Laufende Automationen', color: 'purple' as const }, { label: 'Testprotokolle', color: 'purple' as const }, { label: 'Nutzerdokumentation', color: 'purple' as const }] },
            { badge: 'A3', title: 'KI-Assistenten & Chatbots', href: '/ki-beratung/a3', deliverables: [{ label: 'Bot-Setup + Blueprint', color: 'purple' as const }, { label: 'Gesprächsleitfäden', color: 'purple' as const }, { label: 'KPI-Set', color: 'purple' as const }] },
            { badge: 'A4', title: 'Prompting, Templates & Governance', href: '/ki-beratung/a4', deliverables: [{ label: 'Prompt-Playbook', color: 'purple' as const }, { label: 'Governance-Kit', color: 'purple' as const }] },
            { badge: 'A5', title: 'KI-Schulungen & Enablement', href: '/ki-beratung/a5', deliverables: [{ label: 'Schulungsunterlagen', color: 'purple' as const }, { label: 'Checklisten', color: 'purple' as const }] },
            { badge: 'B1', title: 'IT-Assessment & Stabilitätscheck', href: '/it-beratung/b1', deliverables: [{ label: 'IT-Health-Report', color: 'blue' as const }, { label: 'Maßnahmenplan', color: 'blue' as const }] },
            { badge: 'B2', title: 'IT-Architektur & Modernisierung', href: '/it-beratung/b2', deliverables: [{ label: 'Zielbild + Diagramme', color: 'blue' as const }, { label: 'Migrations-Roadmap', color: 'blue' as const }, { label: 'Runbooks', color: 'blue' as const }] },
            { badge: 'B3', title: 'Systemintegration & Prozess-IT', href: '/it-beratung/b3', deliverables: [{ label: 'Integrierte Prozesse', color: 'blue' as const }, { label: 'Betriebs-/Nutzerdoku', color: 'blue' as const }] },
            { badge: 'B4', title: 'Betrieb, Monitoring & Dokumentation', href: '/it-beratung/b4', deliverables: [{ label: 'Monitoring-Plan', color: 'blue' as const }, { label: 'Runbooks', color: 'blue' as const }, { label: 'Wiederanlaufplan', color: 'blue' as const }] },
            { badge: 'B5', title: 'IT-Standardisierung & Arbeitsplatz-IT', href: '/it-beratung/b5', deliverables: [{ label: 'Standardkonzept', color: 'blue' as const }, { label: 'On-/Offboarding-Prozess', color: 'blue' as const }] },
            { badge: 'C1', title: 'Security Quick Check', href: '/cybersecurity/c1', deliverables: [{ label: 'Risiko-Heatmap', color: 'green' as const }, { label: 'Maßnahmenkatalog', color: 'green' as const }, { label: 'Sofortmaßnahmenliste', color: 'green' as const }] },
            { badge: 'C2', title: 'Hardening & Sicherheitsbaselines', href: '/cybersecurity/c2', deliverables: [{ label: 'Baseline-Konzept', color: 'green' as const }, { label: 'Änderungsdokumentation', color: 'green' as const }] },
            { badge: 'C3', title: 'Backup, Recovery & Ransomware-Resilienz', href: '/cybersecurity/c3', deliverables: [{ label: 'Backup-/Recovery-Konzept', color: 'green' as const }, { label: 'Restore-Testprotokolle', color: 'green' as const }, { label: 'Wiederanlaufplan', color: 'green' as const }] },
            { badge: 'C4', title: 'Incident Response & Playbooks', href: '/cybersecurity/c4', deliverables: [{ label: 'IR-Handbuch', color: 'green' as const }, { label: 'Playbook-Sammlung', color: 'green' as const }] },
            { badge: 'C5', title: 'Security Awareness & Phishing-Schutz', href: '/cybersecurity/c5', deliverables: [{ label: 'Schulungsunterlagen', color: 'green' as const }, { label: 'Sicherheitsregeln', color: 'green' as const }] },
            { badge: 'C6', title: 'Datenschutz- & Compliance-Unterstützung', href: '/cybersecurity/c6', deliverables: [{ label: 'TOM-Umsetzungsnachweis', color: 'green' as const }, { label: 'Audit-Dokumentationspaket', color: 'green' as const }] },
          ],
        },
      },
      {
        blockType: 'features',
        sortOrder: 4,
        content: {
          sectionTitle: 'KI + IT + Security – aus einer Hand',
          sectionSubtitle: 'Drei Kombinations-Module, die bewusst Bereichsgrenzen überwinden. Was einzelne Berater nie leisten können.',
          columns: 3,
          items: [
            { icon: 'Sparkles', title: 'D1 – KI sicher einführen', description: 'KI + Security – gemeinsam, nicht nacheinander.', link: '/loesungen/d1' },
            { icon: 'Cog', title: 'D2 – Sicher automatisieren', description: 'IT + Security – Automationen die kontrolliert laufen.', link: '/loesungen/d2' },
            { icon: 'ShieldAlert', title: 'D3 – Incident-ready Organisation', description: 'IT + KI + Security – Gesamtpaket Notfallbereitschaft.', link: '/loesungen/d3' },
          ],
        },
      },
      {
        blockType: 'cta',
        sortOrder: 5,
        content: {
          headline: 'Bereit für den ersten Schritt?',
          description: '30 Minuten kostenlose Erstberatung – kein Verkaufsgespräch, sondern echter Nutzen. Sie schildern Ihre Situation, wir zeigen, was sinnvoll ist.',
          buttons: [
            { label: 'Erstgespräch buchen', href: '/kontakt', variant: 'default' },
            { label: 'Nachricht schreiben', href: '/kontakt', variant: 'outline' },
          ],
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. SÄULEN-ÜBERSICHTSSEITEN
  // ═══════════════════════════════════════════════════════════════════════════════

  // KI-Beratung
  {
    slug: '/ki-beratung',
    title: 'KI-Beratung',
    seoTitle: 'KI-Beratung | xKMU',
    seoDescription: 'Von der Potenzialanalyse bis zur laufenden Automation. Wir identifizieren, wo KI wirklich hilft, setzen es um und befähigen Ihr Team.',
    status: 'published',
    blocks: pillarBlocks({
      h1: 'KI-Beratung',
      subtitle: 'Artificial Intelligence & Automatisierung',
      einleitung: 'Von der Potenzialanalyse bis zur laufenden Automation. Wir identifizieren, wo KI wirklich hilft, setzen es um und befähigen Ihr Team – ohne KI-Wildwuchs, sondern mit klaren Regeln.',
      icon: 'Bot',
      modules: [
        { badge: 'A1', title: 'KI-Quick-Start & Potenzialanalyse', description: 'Use-Cases finden und priorisieren', deliverables: ['Use-Case-Backlog', 'KI-Roadmap', 'Leitplanken (Guardrails)'], href: '/ki-beratung/a1' },
        { badge: 'A2', title: 'KI-Implementierung – Automationen & Workflows', description: 'Routinen automatisieren, Fehler reduzieren', deliverables: ['Laufende Automationen', 'Testprotokolle', 'Nutzerdokumentation'], href: '/ki-beratung/a2' },
        { badge: 'A3', title: 'KI-Assistenten & Chatbots', description: 'Eigene Assistenten aufbauen und betreiben', deliverables: ['Bot-Setup + Blueprint', 'Gesprächsleitfäden', 'KPI-Set'], href: '/ki-beratung/a3' },
        { badge: 'A4', title: 'Prompting, Templates & Governance', description: 'KI einheitlich und sicher im Team nutzen', deliverables: ['Prompt-Playbook', 'Governance-Kit'], href: '/ki-beratung/a4' },
        { badge: 'A5', title: 'KI-Schulungen & Enablement', description: 'Teams befähigen – nachhaltig', deliverables: ['Schulungsunterlagen', 'Checklisten'], href: '/ki-beratung/a5' },
      ],
    }),
  },

  // IT-Beratung
  {
    slug: '/it-beratung',
    title: 'IT-Beratung',
    seoTitle: 'IT-Beratung | xKMU',
    seoDescription: 'Stabile, sichere und skalierbare IT – vom Arbeitsplatz bis zur Cloud-Infrastruktur. Mit Fokus auf Betriebssicherheit, Skalierbarkeit und Kostenkontrolle.',
    status: 'published',
    blocks: pillarBlocks({
      h1: 'IT-Beratung',
      subtitle: 'Infrastruktur, Betrieb & Modernisierung',
      einleitung: 'Stabile, sichere und skalierbare IT – vom Arbeitsplatz bis zur Cloud-Infrastruktur. Mit Fokus auf Betriebssicherheit, Skalierbarkeit und Kostenkontrolle.',
      icon: 'Monitor',
      modules: [
        { badge: 'B1', title: 'IT-Assessment & Stabilitätscheck', description: 'Klarheit über Zustand, Risiken und Quick-Fixes', deliverables: ['IT-Health-Report', 'Maßnahmenplan'], href: '/it-beratung/b1' },
        { badge: 'B2', title: 'IT-Architektur & Modernisierung', description: 'Cloud, Hybrid, M365 – zukunftsfähig planen', deliverables: ['Zielbild + Diagramme', 'Migrations-Roadmap', 'Runbooks'], href: '/it-beratung/b2' },
        { badge: 'B3', title: 'Systemintegration & Prozess-IT', description: 'Systeme verbinden, Medienbrüche beseitigen', deliverables: ['Integrierte Prozesse', 'Betriebs-/Nutzerdoku'], href: '/it-beratung/b3' },
        { badge: 'B4', title: 'Betrieb, Monitoring & Dokumentation', description: 'Weniger Ausfälle, schnellere Fehlerbehebung', deliverables: ['Monitoring-Plan', 'Runbooks', 'Wiederanlaufplan'], href: '/it-beratung/b4' },
        { badge: 'B5', title: 'IT-Standardisierung & Arbeitsplatz-IT', description: 'Einheitliche Arbeitsplätze, weniger Supportaufwand', deliverables: ['Standardkonzept', 'On-/Offboarding-Prozess'], href: '/it-beratung/b5' },
      ],
    }),
  },

  // Cybersecurity-Beratung
  {
    slug: '/cybersecurity',
    title: 'Cybersecurity-Beratung',
    seoTitle: 'Cybersecurity-Beratung | xKMU',
    seoDescription: 'Angriffsflächen reduzieren, Vorfälle abwehren, NIS-2 und DSGVO technisch umsetzen. Pragmatisch – nicht nach Lehrbuch, sondern nach Risikolage.',
    status: 'published',
    blocks: pillarBlocks({
      h1: 'Cybersecurity-Beratung',
      subtitle: 'Schutz, Resilienz & Compliance',
      einleitung: 'Angriffsflächen reduzieren, Vorfälle abwehren, NIS-2 und DSGVO technisch umsetzen. Pragmatisch – nicht nach Lehrbuch, sondern nach Risikolage.',
      icon: 'Shield',
      modules: [
        { badge: 'C1', title: 'Security Quick Check', description: 'Top-Risiken schnell sichtbar machen', deliverables: ['Risiko-Heatmap', 'Maßnahmenkatalog', 'Sofortmaßnahmenliste'], href: '/cybersecurity/c1' },
        { badge: 'C2', title: 'Hardening & Sicherheitsbaselines', description: 'Angriffsfläche systematisch reduzieren', deliverables: ['Baseline-Konzept', 'Änderungsdokumentation'], href: '/cybersecurity/c2' },
        { badge: 'C3', title: 'Backup, Recovery & Ransomware-Resilienz', description: 'Im Ernstfall wirklich handlungsfähig sein', deliverables: ['Backup-/Recovery-Konzept', 'Restore-Testprotokolle', 'Wiederanlaufplan'], href: '/cybersecurity/c3' },
        { badge: 'C4', title: 'Incident Response & Playbooks', description: 'Klarer Plan für jeden Notfall', deliverables: ['IR-Handbuch', 'Playbook-Sammlung'], href: '/cybersecurity/c4' },
        { badge: 'C5', title: 'Security Awareness & Phishing-Schutz', description: 'Mitarbeiter als Schutzschild – ohne Schulungsfolter', deliverables: ['Schulungsunterlagen', 'Sicherheitsregeln'], href: '/cybersecurity/c5' },
        { badge: 'C6', title: 'Datenschutz- & Compliance-Unterstützung', description: 'DSGVO und NIS-2 technisch umsetzen', deliverables: ['TOM-Umsetzungsnachweis', 'Audit-Dokumentationspaket'], href: '/cybersecurity/c6' },
      ],
    }),
  },

  // Kombinations-Module
  {
    slug: '/loesungen',
    title: 'Kombinations-Module',
    seoTitle: 'Kombinations-Module | xKMU',
    seoDescription: 'KI + IT + Security aus einer Hand. Drei Module, die bewusst Bereichsgrenzen überwinden.',
    status: 'published',
    blocks: pillarBlocks({
      h1: 'Kombinations-Module',
      subtitle: 'KI + IT + Security aus einer Hand',
      einleitung: 'Drei Module, die bewusst Bereichsgrenzen überwinden. Was einzelne Berater nie leisten können: KI, IT und Security gleichzeitig, aufeinander abgestimmt.',
      icon: 'Zap',
      modules: [
        { badge: 'D1', title: 'KI sicher einführen', description: 'KI + Security – gemeinsam, nicht nacheinander', deliverables: ['KI-Nutzungsrichtlinie', 'Datenklassifikation', 'Prompt-Standards', 'Schnittstellenabsicherung'], href: '/loesungen/d1' },
        { badge: 'D2', title: 'Sicher automatisieren', description: 'IT + Security – Automationen die kontrolliert laufen', deliverables: ['Dokumentierte Automationen', 'Sicherheitskonzept', 'Wartungskonzept'], href: '/loesungen/d2' },
        { badge: 'D3', title: 'Incident-ready Organisation', description: 'IT + KI + Security – Gesamtpaket Notfallbereitschaft', deliverables: ['IT-Betrieb + Backup + IR', 'Awareness + Meldewege', 'Review-Meeting-Konzept'], href: '/loesungen/d3' },
      ],
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. MODUL-DETAILSEITEN – KI-Beratung (A1–A5)
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    slug: '/ki-beratung/a1',
    title: 'KI-Quick-Start & Potenzialanalyse',
    seoTitle: 'A1 – KI-Quick-Start & Potenzialanalyse | xKMU',
    seoDescription: 'Gemeinsam erfassen wir Ihre Abläufe, identifizieren Zeitfresser und bewerten konkrete KI-Anwendungsfälle nach Machbarkeit, Nutzen und Risiko.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul A1 · KI-Beratung',
      h1: 'KI-Quick-Start & Potenzialanalyse',
      subtitle: 'Use-Cases finden und priorisieren',
      einleitung: 'Viele Unternehmen wissen, dass KI helfen könnte – aber nicht wo und wie. Die Potenzialanalyse schafft in kurzer Zeit Klarheit: Gemeinsam erfassen wir Ihre Abläufe, identifizieren Zeitfresser und Engpässe und bewerten konkrete KI-Anwendungsfälle nach Machbarkeit, Nutzen, Datenlage und Risiko. Das Ergebnis ist eine priorisierte Liste mit Quick-Wins und einer realistischen Roadmap für die nächsten 30, 60 und 90 Tage.',
      ziel: 'In kurzer Zeit herausfinden, wo KI wirklich lohnt – und was zuerst umgesetzt wird.',
      tags: ['KI'],
      deliverables: [
        { id: 'A1-1', title: 'Use-Case-Backlog + Priorisierung', description: 'Sie erhalten eine übersichtliche, strukturierte Liste aller KI-Möglichkeiten, die wir gemeinsam in Ihrem Unternehmen identifiziert haben – sortiert nach dem, was wirklich etwas bringt. Jeder Eintrag zeigt klar, welchen Nutzen Sie erwarten können, wie aufwändig die Umsetzung ist und wo das größte Potenzial liegt.' },
        { id: 'A1-2', title: 'KI-Roadmap + Aufwand/Nutzen-Schätzung', description: 'Ihr persönlicher Fahrplan für die nächsten 30, 60 und 90 Tage – sowie ein Ausblick auf sechs Monate. Die Roadmap zeigt, was wann umgesetzt wird, wie viel Zeit und Budget Sie dafür einplanen sollten und welche Verbesserungen Sie konkret erwarten können.' },
        { id: 'A1-3', title: 'Leitplanken (Guardrails)', description: 'Dieses Dokument legt fest, welche Daten in KI-Systeme eingegeben werden dürfen und welche nicht, wer was freigeben muss und wie die Qualität sichergestellt wird. Ein kurzes, praxisnah formuliertes Regelwerk, das Ihre Mitarbeiter tatsächlich verstehen und einhalten können.' },
      ],
      ctaModul: 'Modul A1',
      backHref: '/ki-beratung',
    }),
  },

  {
    slug: '/ki-beratung/a2',
    title: 'KI-Implementierung – Automationen & Workflows',
    seoTitle: 'A2 – KI-Implementierung | xKMU',
    seoDescription: 'Aus der Potenzialanalyse werden echte Lösungen. Wir bauen Automationen, die tatsächlich laufen.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul A2 · KI-Beratung',
      h1: 'KI-Implementierung – Automationen & Workflows',
      subtitle: 'Routinen automatisieren, Fehler reduzieren',
      einleitung: 'Aus der Potenzialanalyse (A1) werden hier echte Lösungen. Wir bauen Automationen, die tatsächlich laufen: E-Mail-Sortierung, Lead-Qualifizierung, Dokumentenverarbeitung, Content-Produktion. Jede Automation wird vollständig getestet, mit Fehlerhandling ausgestattet und so dokumentiert, dass Ihr Team sie selbst warten kann.',
      ziel: 'Wiederkehrende Arbeit reduzieren, Fehler vermeiden, Durchlaufzeiten verkürzen.',
      tags: ['KI'],
      deliverables: [
        { id: 'A2-1', title: 'Laufende Automationen inkl. Dokumentation', description: 'Die vereinbarten Automatisierungen sind fertig eingerichtet und laufen. Sie erhalten dazu eine vollständige Dokumentation: Was genau passiert wann, welche Systeme miteinander verbunden sind, wie Fehler erkannt und behandelt werden.' },
        { id: 'A2-2', title: 'Testprotokolle + Betriebshinweise', description: 'Bevor eine Automation live geht, testen wir sie gründlich. Sie erhalten ein klares Protokoll sowie praktische Betriebshinweise: Was tun, wenn etwas nicht funktioniert? Wo schaue ich zuerst nach?' },
        { id: 'A2-3', title: 'Bedien- und Nutzerdokumentation', description: 'Eine Anleitung, die wirklich jeder versteht – ohne IT-Vorkenntnisse. Ihre Mitarbeiter erfahren, was die neue Automation macht und wie sie Probleme melden.' },
      ],
      ctaModul: 'Modul A2',
      backHref: '/ki-beratung',
    }),
  },

  {
    slug: '/ki-beratung/a3',
    title: 'KI-Assistenten & Chatbots',
    seoTitle: 'A3 – KI-Assistenten & Chatbots | xKMU',
    seoDescription: 'Wir richten Ihren KI-Assistenten vollständig ein: Intents, Wissensquellen, Eskalationslogik und Analytics.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul A3 · KI-Beratung',
      h1: 'KI-Assistenten & Chatbots',
      subtitle: 'Eigene Assistenten aufbauen und betreiben',
      einleitung: 'Ein KI-Assistent ist nur so gut wie seine Wissensgrundlage und seine Grenzen. Wir richten Ihren Assistenten vollständig ein: Intents definieren, Wissensquellen strukturieren, Eskalationslogik einbauen und Analytics aktivieren. Sie erhalten einen Assistenten, der das beantwortet, was er beantworten soll – und weiß, wann er einen Menschen einschalten muss.',
      ziel: 'Schnellere Antworten, konsistente Kommunikation, weniger Supportlast.',
      tags: ['KI'],
      deliverables: [
        { id: 'A3-1', title: 'Bot-Setup + Wissensbasis-Blueprint', description: 'Vollständig eingerichtetes Bot-System inklusive konfigurierter Wissensquellen, Intents, Tonalitätsvorgaben und Grenzen. Der Blueprint beschreibt die Struktur der Wissensdatenbank für spätere Pflege.' },
        { id: 'A3-2', title: 'Gesprächsleitfäden & Eskalationslogik', description: 'Alle Gesprächspfade des Bots sind dokumentiert: Standardantworten, Übergabepunkte an einen Menschen, Weiterleitungsregeln. Sie behalten immer die Kontrolle.' },
        { id: 'A3-3', title: 'KPI-Set (Erfolgsmessung)', description: 'Wie gut läuft Ihr Assistent wirklich? Das KPI-Set zeigt Deflection Rate, Nutzerzufriedenheit und häufige Abbruchpunkte – mit Erklärung, wie Sie diese regelmäßig abrufen.' },
      ],
      ctaModul: 'Modul A3',
      backHref: '/ki-beratung',
    }),
  },

  {
    slug: '/ki-beratung/a4',
    title: 'Prompting, Templates & Governance',
    seoTitle: 'A4 – Prompting, Templates & Governance | xKMU',
    seoDescription: 'Rollenbasierte Prompt-Bibliothek, fertige Templates und ein Governance-Kit für den sicheren KI-Einsatz im Team.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul A4 · KI-Beratung',
      h1: 'Prompting, Templates & Governance',
      subtitle: 'KI einheitlich und sicher im Team nutzen',
      einleitung: 'Ohne Struktur wird KI im Unternehmen zum Wildwuchs: Jeder nutzt andere Tools, andere Prompts, andere Qualitätsstandards. Wir lösen das mit einer rollenbasierten Prompt-Bibliothek, fertigen Templates für wiederkehrende Aufgaben und einem Governance-Kit, das klar regelt, wer was nutzen darf und wie Outputs freigegeben werden.',
      ziel: 'Einheitliche Qualität, weniger Risiko, schnellere Ergebnisse im Team.',
      tags: ['KI'],
      deliverables: [
        { id: 'A4-1', title: 'Prompt-Playbook + Template-Sammlung', description: 'Rollenbasierte Bibliothek einsatzbereiter Prompts für Vertrieb, Support, Backoffice und Marketing. Jede Vorlage ist erklärt, mit Beispiel versehen und für Ihre Abläufe angepasst.' },
        { id: 'A4-2', title: 'Governance-Kit', description: 'Nutzungsrichtlinie (was ist erlaubt, was nicht), Freigabeablauf für sensible Inhalte und Rollenzuweisung. Kein juristisches Kauderwelsch – ein Dokument, das Ihr Team tatsächlich liest.' },
      ],
      ctaModul: 'Modul A4',
      backHref: '/ki-beratung',
    }),
  },

  {
    slug: '/ki-beratung/a5',
    title: 'KI-Schulungen & Enablement',
    seoTitle: 'A5 – KI-Schulungen & Enablement | xKMU',
    seoDescription: 'Kurze, praxisnahe Schulungen, zugeschnitten auf echte Aufgaben. Ihr Team lernt, was es wirklich braucht.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul A5 · KI-Beratung',
      h1: 'KI-Schulungen & Enablement',
      subtitle: 'Teams befähigen – nachhaltig',
      einleitung: 'Die beste KI-Lösung nützt nichts, wenn niemand sie nutzt. Unsere Schulungen sind kurz, praxisnah und auf echte Aufgaben zugeschnitten. Ob Grundlagen für alle oder spezialisierte Trainings für Vertrieb und Marketing – Ihr Team lernt, was es wirklich braucht.',
      ziel: 'Mitarbeiter befähigen, damit Lösungen langfristig genutzt werden.',
      tags: ['KI'],
      deliverables: [
        { id: 'A5-1', title: 'Schulungsunterlagen + Übungen', description: 'Vollständige Trainingsmaterialien je Zielgruppe: Präsentationen, Handouts, praxisnahe Übungsaufgaben an realen Unternehmensdaten.' },
        { id: 'A5-2', title: 'Checklisten (Qualität, Datenschutz, Freigabe)', description: 'Drei kompakte Checklisten für den Alltag: Was prüfe ich vor einem KI-Output? Welche Daten darf ich eingeben? Was braucht eine Freigabe? Kurz gehalten – zum Ausdrucken oder als digitale Erinnerung.' },
      ],
      ctaModul: 'Modul A5',
      backHref: '/ki-beratung',
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. MODUL-DETAILSEITEN – IT-Beratung (B1–B5)
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    slug: '/it-beratung/b1',
    title: 'IT-Assessment & Stabilitätscheck',
    seoTitle: 'B1 – IT-Assessment & Stabilitätscheck | xKMU',
    seoDescription: 'Das Assessment legt alles offen – ehrlich, verständlich und mit klarer Prioritätenliste.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul B1 · IT-Beratung',
      h1: 'IT-Assessment & Stabilitätscheck',
      subtitle: 'Klarheit über Zustand, Risiken und Quick-Fixes',
      einleitung: 'Viele IT-Probleme entstehen nicht über Nacht. Sie wachsen langsam: ein System zu viel, eine Lizenz zu teuer, ein Backup das nie getestet wurde. Das Assessment legt alles offen – ehrlich, verständlich und mit klarer Prioritätenliste. Grundlage für alle weiteren IT-Projekte.',
      ziel: 'Klarheit über Zustand, Risiken, technische Schulden und Quick-Fixes.',
      tags: ['IT'],
      deliverables: [
        { id: 'B1-1', title: 'IT-Health-Report', description: 'Strukturierter Bericht über den aktuellen Zustand der IT: Inventar, erkannte Schwachstellen, Performance-Probleme und Schatten-IT. Mit Risikobewertung und Prioritätenliste.' },
        { id: 'B1-2', title: 'Maßnahmenplan (Quick-Wins + Roadmap)', description: 'Sofort umsetzbare Quick-Wins, mittelfristige Stabilisierungsmaßnahmen und strategische Modernisierungsschritte. Jede Maßnahme mit Aufwand, Nutzen und Verantwortlichkeit.' },
      ],
      ctaModul: 'Modul B1',
      backHref: '/it-beratung',
    }),
  },

  {
    slug: '/it-beratung/b2',
    title: 'IT-Architektur & Modernisierung',
    seoTitle: 'B2 – IT-Architektur & Modernisierung | xKMU',
    seoDescription: 'Klares Zielbild für Ihre IT, Migrationsplan und Betriebsleitfaden – zukunftsfähig planen.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul B2 · IT-Beratung',
      h1: 'IT-Architektur & Modernisierung',
      subtitle: 'Cloud, Hybrid, M365 – zukunftsfähig planen',
      einleitung: 'IT, die zufällig gewachsen ist, kostet täglich Geld und Nerven. Wir entwickeln ein klares Zielbild, zeigen den Weg dahin und begleiten die Migration – mit minimalem Ausfall und maximalem Ergebnis.',
      ziel: 'Zukunftsfähige IT, die nicht zufällig gewachsen ist.',
      tags: ['IT'],
      deliverables: [
        { id: 'B2-1', title: 'Zielbild + Architekturdiagramme', description: 'Klare Beschreibung und grafische Übersicht, wie Ihre IT in Zukunft aussehen soll. Gemeinsame Orientierung für alle Beteiligten.' },
        { id: 'B2-2', title: 'Migrations-Roadmap + Umsetzungsplan', description: 'Phasenweiser Migrationsplan: Reihenfolge, Abhängigkeiten, Cutover-Planung, Downtime-Minimierung, Rollback-Szenarien.' },
        { id: 'B2-3', title: 'Standards & Betriebsleitfaden (Runbooks)', description: 'Verbindliche Konfigurationsstandards und operative Runbooks für wiederkehrende IT-Aufgaben – damit der Betrieb nicht vom Wissen einzelner Personen abhängt.' },
      ],
      ctaModul: 'Modul B2',
      backHref: '/it-beratung',
    }),
  },

  {
    slug: '/it-beratung/b3',
    title: 'Systemintegration & Prozess-IT',
    seoTitle: 'B3 – Systemintegration & Prozess-IT | xKMU',
    seoDescription: 'Systeme verbinden, Medienbrüche beseitigen, Abläufe vereinheitlichen.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul B3 · IT-Beratung',
      h1: 'Systemintegration & Prozess-IT',
      subtitle: 'Systeme verbinden, Medienbrüche beseitigen',
      einleitung: 'Wenn Daten manuell zwischen Systemen kopiert werden, entstehen Fehler, Verzögerungen und Frust. Wir integrieren Ihre Tools – mit klarer Dokumentation, damit Änderungen auch in einem Jahr noch nachvollziehbar sind.',
      ziel: 'Systeme verbinden, Medienbrüche entfernen, Abläufe vereinheitlichen.',
      tags: ['IT'],
      deliverables: [
        { id: 'B3-1', title: 'Integrierte Prozesse (dokumentiert)', description: 'Vollständige Dokumentation der realisierten Systemintegrationen: Datenflüsse, Routing-Logik, Feldmappings und Fehlerbehandlung.' },
        { id: 'B3-2', title: 'Betriebs- und Nutzerdokumentation', description: 'Technische Betriebsdoku für IT-Ansprechpartner und verständliche Nutzerdoku für Fachabteilungen – damit jeder weiß, was er wissen muss.' },
      ],
      ctaModul: 'Modul B3',
      backHref: '/it-beratung',
    }),
  },

  {
    slug: '/it-beratung/b4',
    title: 'Betrieb, Monitoring & Dokumentation',
    seoTitle: 'B4 – Betrieb, Monitoring & Dokumentation | xKMU',
    seoDescription: 'Monitoring, Alarmschwellen, Backup-Prüfung und Dokumentation für weniger Ausfälle.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul B4 · IT-Beratung',
      h1: 'Betrieb, Monitoring & Dokumentation',
      subtitle: 'Weniger Ausfälle, schnellere Fehlerbehebung',
      einleitung: 'Guter IT-Betrieb bedeutet: Probleme erkennen, bevor Kunden sie bemerken. Wir richten Ihr Monitoring ein, definieren Alarmschwellen, prüfen Backup-Prozesse und dokumentieren alles so, dass auch neue Kollegen oder externe Dienstleister sofort arbeiten können.',
      ziel: 'Weniger Ausfälle, schnellere Fehlerbehebung, klare Verantwortlichkeiten.',
      tags: ['IT'],
      deliverables: [
        { id: 'B4-1', title: 'Monitoring-Plan + Alarmierungslogik', description: 'Definiert was überwacht wird, ab welchem Punkt ein Alarm ausgelöst wird und wer benachrichtigt wird. Einschließlich der fertig eingerichteten Überwachung.' },
        { id: 'B4-2', title: 'Runbooks + Systemdokumentation', description: 'Schritt-für-Schritt-Anleitungen für alle wiederkehrenden IT-Aufgaben plus vollständige Systemübersicht mit Admin-Zugängen und Abhängigkeiten.' },
        { id: 'B4-3', title: 'Wiederanlaufplan', description: 'Was tun, wenn die IT ausfällt? Klare Antworten: Reihenfolge, Schritte, Zuständigkeiten, Notfallkontakte – kurz genug, um unter Stress lesbar zu sein.' },
      ],
      ctaModul: 'Modul B4',
      backHref: '/it-beratung',
    }),
  },

  {
    slug: '/it-beratung/b5',
    title: 'IT-Standardisierung & Arbeitsplatz-IT',
    seoTitle: 'B5 – IT-Standardisierung & Arbeitsplatz-IT | xKMU',
    seoDescription: 'Einheitliche Standards, weniger Supportaufwand, höhere Produktivität.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul B5 · IT-Beratung',
      h1: 'IT-Standardisierung & Arbeitsplatz-IT',
      subtitle: 'Einheitliche Arbeitsplätze, weniger Supportaufwand',
      einleitung: 'Jeder Arbeitsplatz ein bisschen anders eingerichtet – das kostet täglich Zeit. Wir schaffen einheitliche Standards, die den Supportaufwand senken und gleichzeitig die Sicherheit erhöhen.',
      ziel: 'Weniger Supportaufwand, konsistenter Arbeitsplatz, höhere Produktivität.',
      tags: ['IT'],
      deliverables: [
        { id: 'B5-1', title: 'Standardkonzept + Checklisten', description: 'Konzept für den standardisierten Arbeitsplatz: Gerätetypen, Konfigurationsvorgaben, Passwort- und Geräterichtlinien. Checklisten für Einrichtung und Abnahme.' },
        { id: 'B5-2', title: 'On-/Offboarding-Prozess', description: 'Neuer Mitarbeiter → sofort arbeitsfähig. Ausscheidender Mitarbeiter → kein Zugriff mehr. Klare Checkliste für beide Fälle.' },
      ],
      ctaModul: 'Modul B5',
      backHref: '/it-beratung',
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. MODUL-DETAILSEITEN – Cybersecurity (C1–C6)
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    slug: '/cybersecurity/c1',
    title: 'Security Quick Check',
    seoTitle: 'C1 – Security Quick Check | xKMU',
    seoDescription: 'In kurzer Zeit ein klarer Überblick: Was sind Ihre größten Risiken? Was muss sofort angegangen werden?',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul C1 · Cybersecurity-Beratung',
      h1: 'Security Quick Check',
      subtitle: 'Top-Risiken schnell sichtbar machen',
      einleitung: 'Sie wissen, dass Cybersicherheit wichtig ist – aber wo anfangen? Der Quick Check gibt in kurzer Zeit einen klaren Überblick: Was sind Ihre größten Risiken? Was muss sofort angegangen werden? Und was kann warten?',
      ziel: 'Schnell sichtbare Risiken finden und priorisieren.',
      tags: ['Security'],
      deliverables: [
        { id: 'C1-1', title: 'Risiko-Heatmap (Top 10 Risiken)', description: 'Visuelle Übersicht Ihrer zehn größten Sicherheitsrisiken nach Wahrscheinlichkeit und potenziellem Schaden. Klar und verständlich – kein Fachchinesisch.' },
        { id: 'C1-2', title: 'Maßnahmenkatalog', description: 'Konkrete Empfehlungen nach Aufwand, Wirkung und Dringlichkeit sortiert. Jeder Eintrag erklärt klar, warum er wichtig ist und was er bedeutet.' },
        { id: 'C1-3', title: 'Sofortmaßnahmenliste', description: 'Die wichtigsten Sicherheitsverbesserungen, die Sie innerhalb von sieben Tagen umsetzen können – ohne großen Aufwand, aber mit sofortiger Wirkung.' },
      ],
      ctaModul: 'Modul C1',
      backHref: '/cybersecurity',
    }),
  },

  {
    slug: '/cybersecurity/c2',
    title: 'Hardening & Sicherheitsbaselines',
    seoTitle: 'C2 – Hardening & Sicherheitsbaselines | xKMU',
    seoDescription: 'Angriffsfläche systematisch reduzieren. Identitäten, Geräte, Cloud-Dienste – alles auf sicherem Stand.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul C2 · Cybersecurity-Beratung',
      h1: 'Hardening & Sicherheitsbaselines',
      subtitle: 'Angriffsfläche systematisch reduzieren',
      einleitung: 'Die meisten Angriffe nutzen bekannte Schwachstellen in Standardkonfigurationen. Hardening schließt diese Lücken systematisch: Identitäten, Geräte, Cloud-Dienste – alles auf sicherem Stand, dokumentiert und überprüfbar.',
      ziel: 'Angriffsfläche reduzieren, Standardkonfigurationen absichern.',
      tags: ['Security'],
      deliverables: [
        { id: 'C2-1', title: 'Baseline-Konzept + umgesetzte Standards', description: 'Dokumentiertes Sicherheits-Baseline-Konzept inklusive Nachweis der tatsächlich umgesetzten Härtungsmaßnahmen: Identitäten, Clients, Cloud, Logging.' },
        { id: 'C2-2', title: 'Änderungsdokumentation + Abnahmecheckliste', description: 'Lückenlose Dokumentation aller Konfigurationsänderungen. Abnahmecheckliste bestätigt, dass alle vereinbarten Maßnahmen umgesetzt wurden.' },
      ],
      ctaModul: 'Modul C2',
      backHref: '/cybersecurity',
    }),
  },

  {
    slug: '/cybersecurity/c3',
    title: 'Backup, Recovery & Ransomware-Resilienz',
    seoTitle: 'C3 – Backup, Recovery & Ransomware-Resilienz | xKMU',
    seoDescription: 'Solide Backup-Strategie, getestete Wiederherstellung – im Ernstfall wirklich handlungsfähig.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul C3 · Cybersecurity-Beratung',
      h1: 'Backup, Recovery & Ransomware-Resilienz',
      subtitle: 'Im Ernstfall wirklich handlungsfähig sein',
      einleitung: 'Ein Backup, das nie getestet wurde, ist kein Backup. Wir erstellen eine solide Backup-Strategie, testen die Wiederherstellung und dokumentieren alles – damit Sie im Ernstfall nicht improvisieren müssen.',
      ziel: 'Im Ernstfall wieder arbeitsfähig sein – nicht nur "Backup vorhanden".',
      tags: ['Security'],
      deliverables: [
        { id: 'C3-1', title: 'Backup-/Recovery-Konzept', description: 'Vollständiges Konzept: 3-2-1-Strategie, Offline/Immutable Copies, Frequenzen, Aufbewahrungsdauern, Trennung von Produktivsystemen.' },
        { id: 'C3-2', title: 'Restore-Testprotokolle', description: 'Dokumentierter Beweis, dass Ihre Backups wirklich funktionieren: System, Datenstand, Datum, Ergebnis, Wiederherstellungsdauer.' },
        { id: 'C3-3', title: 'Wiederanlaufplan', description: 'Prioritätenliste der Systeme, Wiederherstellungsschritte, Zeitzeile, Notfallkontakte, Kommunikationsvorlage. Lesbar auch unter Stress.' },
      ],
      ctaModul: 'Modul C3',
      backHref: '/cybersecurity',
    }),
  },

  {
    slug: '/cybersecurity/c4',
    title: 'Incident Response & Playbooks',
    seoTitle: 'C4 – Incident Response & Playbooks | xKMU',
    seoDescription: 'IR-Handbuch und Playbook-Sammlung für Phishing, Kontoübernahme, Ransomware und Datenabfluss.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul C4 · Cybersecurity-Beratung',
      h1: 'Incident Response & Playbooks',
      subtitle: 'Klarer Plan für jeden Notfall',
      einleitung: 'Ein Sicherheitsvorfall ist der falsche Moment, um erst nachzudenken. Unser IR-Handbuch gibt Ihrem Team in genau diesem Moment Struktur. Die Playbooks decken die häufigsten Szenarien Schritt für Schritt ab – auch für Mitarbeiter ohne IT-Hintergrund.',
      ziel: 'Keine Panik im Vorfall – klarer Ablauf, klare Rollen.',
      tags: ['Security'],
      deliverables: [
        { id: 'C4-1', title: 'Incident-Response-Handbuch', description: 'Übergreifendes Notfallhandbuch: Meldewege, Entscheidungsbaum, Rollenverteilung, externe Partner, BSI-Meldepflicht. Alles an einem Ort.' },
        { id: 'C4-2', title: 'Playbook-Sammlung + Checklisten', description: 'Schritt-für-Schritt-Anleitungen für Phishing, Kontoübernahme, Ransomware und Datenabfluss. Erkennungsmerkmale, Sofortmaßnahmen, Kommunikation, Lessons Learned.' },
      ],
      ctaModul: 'Modul C4',
      backHref: '/cybersecurity',
    }),
  },

  {
    slug: '/cybersecurity/c5',
    title: 'Security Awareness & Phishing-Schutz',
    seoTitle: 'C5 – Security Awareness & Phishing-Schutz | xKMU',
    seoDescription: 'Kurze, konkrete Impulse, die im Gedächtnis bleiben. Trainings auf echte Bedrohungen zugeschnitten.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul C5 · Cybersecurity-Beratung',
      h1: 'Security Awareness & Phishing-Schutz',
      subtitle: 'Mitarbeiter als Schutzschild – ohne Schulungsfolter',
      einleitung: 'Die meisten Angriffe beginnen mit einem Klick. Awareness entsteht aber nicht durch einmalige Pflichtschulungen – sondern durch kurze, konkrete Impulse, die im Gedächtnis bleiben. Unsere Trainings sind auf echte Bedrohungen zugeschnitten, nicht auf Theorie.',
      ziel: 'Menschlicher Faktor als Schutzschild – ohne Schulungsfolter.',
      tags: ['Security'],
      deliverables: [
        { id: 'C5-1', title: 'Schulungsunterlagen + Kurzleitfäden', description: 'Trainingsmaterial mit echten Beispielen: Phishing-Mails, Social Engineering, Passwortfehler. Erkennungsregeln und Meldeprozess. Kurz, visuell, alltagstauglich.' },
        { id: 'C5-2', title: 'Sicherheitsregeln für den Alltag', description: '1–2-seitiges Regelblatt: die wichtigsten Do\'s und Don\'ts zu Passwörtern, E-Mails, Links und Home Office. Zum Ausdrucken oder als digitales Dokument.' },
      ],
      ctaModul: 'Modul C5',
      backHref: '/cybersecurity',
    }),
  },

  {
    slug: '/cybersecurity/c6',
    title: 'Datenschutz- & Compliance-Unterstützung',
    seoTitle: 'C6 – Datenschutz- & Compliance-Unterstützung | xKMU',
    seoDescription: 'TOMs operationalisieren, Compliance-Fähigkeit herstellen – DSGVO und NIS-2 technisch umsetzen.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul C6 · Cybersecurity-Beratung',
      h1: 'Datenschutz- & Compliance-Unterstützung',
      subtitle: 'DSGVO und NIS-2 technisch umsetzen',
      einleitung: 'Datenschutz und Compliance sind mehr als Richtlinien – sie müssen technisch und organisatorisch gelebt werden. Wir helfen dabei, TOMs konkret umzusetzen und prüfbare Nachweise zu erstellen. Hinweis: xKMU leistet keine Rechtsberatung, unterstützt aber umfassend bei der technischen und organisatorischen Umsetzung.',
      ziel: 'TOMs operationalisieren, Compliance-Fähigkeit herstellen – ohne Rechtsberatung.',
      tags: ['Security'],
      deliverables: [
        { id: 'C6-1', title: 'TOM-Umsetzungsnachweis (technisch)', description: 'Nachweis der technisch umgesetzten Maßnahmen gemäß DSGVO: Zugangskontrolle, Verschlüsselung, Protokollierung, Löschkonzept. Mit Status und Nachweis.' },
        { id: 'C6-2', title: 'Audit-Dokumentationspaket', description: 'Alle relevanten Dokumente für interne Prüfungen oder externe Audits: Richtlinien, TOM-Nachweis, Rollen-/Rechtekonzept, Löschkonzept. Vollständig und abrufbar.' },
      ],
      ctaModul: 'Modul C6',
      backHref: '/cybersecurity',
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. MODUL-DETAILSEITEN – Kombinations-Module (D1–D3)
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    slug: '/loesungen/d1',
    title: 'KI sicher einführen',
    seoTitle: 'D1 – KI sicher einführen | xKMU',
    seoDescription: 'KI einführen ohne Sicherheitsrisiken – beides gleichzeitig regeln.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul D1 · Kombinations-Module',
      h1: 'KI sicher einführen',
      subtitle: 'KI + Security – gemeinsam, nicht nacheinander',
      einleitung: 'Wer KI einführt, ohne die Sicherheitsfragen zu klären, schafft Risiken. Wer Security regelt, ohne die KI-Nutzung zu berücksichtigen, greift zu kurz. Wir machen beides gleichzeitig – abgestimmt, effizient, und mit klaren Regeln für Ihr Team.',
      ziel: 'KI einführen ohne Sicherheitsrisiken – beides gleichzeitig regeln.',
      tags: ['KI', 'Security'],
      deliverables: [
        { id: 'D1-1', title: 'KI-Nutzungsrichtlinie + Rollenmodell', description: 'Verbindliche Unternehmensrichtlinie: erlaubte Tools, verbotene Datenkategorien, Freigabeprozesse. Rollenmodell definiert, wer welche Systeme nutzen darf.' },
        { id: 'D1-2', title: 'Datenklassifikationskonzept', description: 'Klare Kategorisierung: Was darf in externe KI-Systeme? Was nur in interne/private Instanzen? Was gar nicht? Mit konkreten Beispielen je Datenkategorie.' },
        { id: 'D1-3', title: 'Prompt-Standards + Freigabeprozesse + Logging', description: 'Qualitätsstandards für Prompts, definierter Freigabeprozess für sensible Outputs und Logging-Konzept: Was wird protokolliert, wo, wie lange?' },
        { id: 'D1-4', title: 'Schnittstellenabsicherung', description: 'API-Key-Management, Secrets-Verwaltung, Least-Privilege-Zugriffe für Automations-Accounts, Review-Prozess für neue Integrationen.' },
      ],
      ctaModul: 'Modul D1',
      backHref: '/loesungen',
    }),
  },

  {
    slug: '/loesungen/d2',
    title: 'Sicher automatisieren',
    seoTitle: 'D2 – Sicher automatisieren | xKMU',
    seoDescription: 'Automationen mit eingebautem Sicherheitsnetz – nicht nur funktional, sondern beherrschbar.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul D2 · Kombinations-Module',
      h1: 'Sicher automatisieren',
      subtitle: 'IT + Security – Automationen die kontrolliert laufen',
      einleitung: 'Automationen laufen im Hintergrund – ohne Aufsicht. Genau deshalb müssen sie von Anfang an sicher und kontrollierbar sein. Wir bauen Ihre Automationen mit eingebautem Monitoring, klaren Zugriffsrechten und einem Plan für laufende Wartung.',
      ziel: 'Automationen mit eingebautem Sicherheitsnetz – nicht nur funktional, sondern beherrschbar.',
      tags: ['IT', 'Security'],
      deliverables: [
        { id: 'D2-1', title: 'Dokumentierte Automationen (sicherheitskonform)', description: 'Fertige Workflows mit integriertem Monitoring, Fehlerhandling-Pfaden und Rollback-Mechanismen. Vollständig dokumentiert.' },
        { id: 'D2-2', title: 'Sicherheitskonzept für Automationen', description: 'Least-Privilege-Zugriffe, Auditierbarkeit und regelmäßige Überprüfungspunkte. Wer prüft die Automationen wann?' },
        { id: 'D2-3', title: 'Wartungs- und Update-Konzept', description: 'Prozess für den laufenden Betrieb: Wer prüft was in welchem Rhythmus? Wie werden Änderungen dokumentiert und getestet?' },
      ],
      ctaModul: 'Modul D2',
      backHref: '/loesungen',
    }),
  },

  {
    slug: '/loesungen/d3',
    title: 'Incident-ready Organisation',
    seoTitle: 'D3 – Incident-ready Organisation | xKMU',
    seoDescription: 'Handlungsfähig im Ernstfall – IT-Betrieb, Backup und IR aufeinander abgestimmt.',
    status: 'published',
    blocks: moduleDetailBlocks({
      badge: 'Modul D3 · Kombinations-Module',
      h1: 'Incident-ready Organisation',
      subtitle: 'IT + KI + Security – Gesamtpaket Notfallbereitschaft',
      einleitung: 'Notfallbereitschaft ist kein einmaliges Projekt. Sie braucht abgestimmte Prozesse über alle Bereiche: IT-Betrieb, Datensicherung und Incident Response. Wir liefern alles als zusammenhängendes Paket – und halten es durch quartalsweise Reviews aktuell.',
      ziel: 'Handlungsfähig im Ernstfall – IT-Betrieb, Backup und IR aufeinander abgestimmt.',
      tags: ['IT', 'KI', 'Security'],
      deliverables: [
        { id: 'D3-1', title: 'IT-Betriebskonzept + Backup/Recovery + IR-Playbooks', description: 'Integriertes Gesamtpaket: IT-Betriebsdoku, vollständiges Backup-/Recovery-Konzept mit Restore-Tests und szenariospezifische IR-Playbooks – aufeinander abgestimmt.' },
        { id: 'D3-2', title: 'Awareness-Material + Meldewege + technische Mindeststandards', description: 'Mitarbeiter-Schulungsmaterial, dokumentierte Meldewege und technische Mindeststandards als gemeinsame Baseline der gesamten Organisation.' },
        { id: 'D3-3', title: 'Review-Meeting-Konzept', description: 'Quartalsweise Überprüfungsstruktur: feste Agenda, Protokollvorlagen, KPI-Tracking. Damit Sicherheit nie den Anschluss an die Wirklichkeit verliert.' },
      ],
      ctaModul: 'Modul D3',
      backHref: '/loesungen',
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. PAKETE & PREISE
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    slug: '/pakete',
    title: 'Pakete & Preise',
    seoTitle: 'Pakete & Preise | xKMU',
    seoDescription: 'Starter ab 490 €, Growth ab 95 €/Std., Scale auf Anfrage, Retainer ab 250 €/Monat.',
    status: 'published',
    blocks: [
      {
        blockType: 'hero',
        sortOrder: 0,
        content: {
          badge: { text: 'Transparente Preise' },
          headline: 'Das passende Paket für jede Phase',
          subheadline: 'Kein verstecktes Pricing. Kein Stundensatz-Roulette beim Einstieg. Sie wissen vorher, was Sie bekommen.',
          size: 'small',
        },
      },
      {
        blockType: 'pricing',
        sortOrder: 1,
        content: {
          sectionTitle: '',
          plans: [
            {
              name: 'Starter',
              price: 'ab 490 €',
              period: 'Festpreis',
              description: 'Klarheit schaffen. Potenziale sehen. Sofort wissen, was als nächstes zu tun ist.',
              features: [
                'KI-Potenzialanalyse oder IT-Assessment oder Security Quick Check',
                'Strukturierter Ergebnisbericht',
                'Konkreter Maßnahmenplan',
                '30-Tage-Roadmap',
              ],
              buttonLabel: 'Jetzt starten',
              buttonHref: '/kontakt',
              highlighted: false,
            },
            {
              name: 'Growth',
              price: '95 €',
              period: 'Stunde',
              description: 'Umsetzung. 1–3 priorisierte Maßnahmen, die wirklich laufen – mit Dokumentation und Einweisung.',
              features: [
                '1–3 priorisierte Umsetzungen',
                'Vollständige Dokumentation',
                'Schulung & Einweisung',
                'Go-Live + Follow-up',
              ],
              buttonLabel: 'Growth buchen',
              buttonHref: '/kontakt',
              highlighted: true,
            },
            {
              name: 'Scale',
              price: 'auf Anfrage',
              period: '',
              description: 'Systematisch und dauerhaft. Mehrere Workstreams, KPI-Tracking, regelmäßige Reviews.',
              features: [
                'Roadmap über mehrere Monate',
                'Mehrere parallele Workstreams',
                'Regelmäßige Review-Meetings',
                'KPI-Tracking & Reporting',
              ],
              buttonLabel: 'Anfragen',
              buttonHref: '/kontakt',
              highlighted: false,
            },
            {
              name: 'Retainer',
              price: 'ab 250 €',
              period: 'Monat',
              description: 'Fester Ansprechpartner, monatliche Office Hours, laufende Optimierungen und Health-Checks.',
              features: [
                'Monatliche Office Hours (KI/IT/Security)',
                'Laufende Health-Checks',
                'Support für kleine Anpassungen',
                'Security-Reviews & KPI-Reports',
              ],
              buttonLabel: 'Retainer buchen',
              buttonHref: '/kontakt',
              highlighted: false,
            },
          ],
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. REFERENZEN & CASE STUDIES
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    slug: '/referenzen',
    title: 'Referenzen & Case Studies',
    seoTitle: 'Referenzen & Case Studies | xKMU',
    seoDescription: 'Wie xKMU in der Praxis wirkt – konkrete Situationen, konkrete Maßnahmen, konkrete Resultate.',
    status: 'published',
    blocks: [
      {
        blockType: 'hero',
        sortOrder: 0,
        content: {
          badge: { text: 'Echte Projekte' },
          headline: 'Ergebnisse, keine Versprechen',
          subheadline: 'Wie xKMU in der Praxis wirkt – konkrete Situationen, konkrete Maßnahmen, konkrete Resultate.',
          size: 'small',
        },
      },
      {
        blockType: 'cards',
        sortOrder: 1,
        content: {
          columns: 3,
          items: [
            {
              icon: 'MessageSquare',
              title: 'Fahrschule: Weniger Telefon, mehr planbare Termine',
              description: '**KI-Beratung · Modul A2, A3**\n\nTäglich viele Standardanfragen per Telefon, WhatsApp und E-Mail – alles blieb am Inhaber hängen. xKMU hat die häufigsten Anfragen analysiert, einen strukturierten Eingang eingerichtet und einen KI-Assistenten für Wiederholfragen aufgebaut.\n\n**Ergebnis:** Weniger Standardanrufe, schnellere Antworten, mehr Planbarkeit',
            },
            {
              icon: 'Wrench',
              title: 'Handwerksbetrieb: Schnellere Angebote, weniger Chaos',
              description: '**KI-Beratung · IT-Beratung · Modul A2, B3**\n\nAnfragen aus mehreren Kanälen, kein klarer Prozess, Angebote blieben liegen. xKMU hat einen zentralen Eingang, klare Kategorien und KI-Textbausteine für Angebote und Antworten eingeführt.\n\n**Ergebnis:** Schnellerer Angebotsversand und spürbar mehr Struktur im Alltag',
            },
            {
              icon: 'ShieldCheck',
              title: 'Dienstleister: Von 0 auf NIS-2-ready',
              description: '**Cybersecurity · Modul C1, C3, C4**\n\nKein Backup-Konzept, kein Notfallplan, keine Richtlinien – und Kunden, die zunehmend Nachweise fordern. xKMU hat in drei Modulen die Grundlage geschaffen: Quick Check, Recovery-Konzept und IR-Playbooks.\n\n**Ergebnis:** Audit-fähige Dokumentation und klarer Notfallplan in 6 Wochen',
            },
          ],
        },
      },
      {
        blockType: 'cta',
        sortOrder: 2,
        content: {
          headline: 'Passt etwas davon zu Ihrer Situation?',
          description: 'Im kostenlosen Erstgespräch klären wir, welches Modul den größten Hebel hat.',
          buttons: [
            { label: 'Erstgespräch buchen', href: '/kontakt', variant: 'default' },
          ],
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. KONTAKT
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    slug: '/kontakt',
    title: 'Kontakt',
    seoTitle: 'Kontakt | xKMU',
    seoDescription: 'Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns!',
    status: 'published',
    blocks: [
      {
        blockType: 'hero',
        sortOrder: 0,
        content: {
          badge: { icon: 'Mail', text: 'Wir freuen uns auf Ihre Nachricht' },
          headline: 'Kontakt',
          subheadline: 'Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns – wir melden uns schnellstmöglich.',
          size: 'small',
        },
      },
      {
        blockType: 'contact-form',
        sortOrder: 1,
        content: {
          interestTags: [
            'KI-Beratung', 'KI-Automatisierung', 'KI-Assistenten & Chatbots',
            'IT-Assessment', 'IT-Architektur & Cloud', 'Systemintegration',
            'Security Quick Check', 'Hardening & Baselines', 'Backup & Recovery',
            'Incident Response', 'Security Awareness', 'Datenschutz & Compliance',
            'NIS-2 Unterstützung', 'Kombinations-Modul', 'Managed Services',
          ],
          submitLabel: 'Nachricht senden',
          successHeadline: 'Vielen Dank für Ihre Nachricht!',
          successMessage: 'Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.',
          privacyUrl: '/datenschutz',
        },
      },
    ],
  },
]

// ─── Slugs to remove (old naming) ───────────────────────────────────────────────

const obsoleteSlugs = ['/ki-automation', '/it-consulting', '/cyber-security']

// ─── Main seed function ─────────────────────────────────────────────────────────

async function seed() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    logger.error('DATABASE_URL not set', undefined, { module: 'CmsWebsiteSeed' })
    process.exit(1)
  }

  const sslEnv = process.env.DATABASE_SSL
  let ssl: 'require' | false = false
  if (sslEnv === 'require') ssl = 'require'
  else if (sslEnv === 'false' || sslEnv === '0') ssl = false
  else if (process.env.DOCKER === 'true' || process.env.COOLIFY === 'true') ssl = false
  else if (process.env.NODE_ENV === 'production') ssl = 'require'

  const client = postgres(connectionString, { ssl })
  const db = drizzle(client)

  logger.info('Seeding CMS website pages...')

  // 1. Remove obsolete pages
  for (const slug of obsoleteSlugs) {
    const existing = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(eq(cmsPages.slug, slug))
      .limit(1)

    if (existing.length > 0) {
      // Blocks are cascade-deleted via FK
      await db.delete(cmsPages).where(eq(cmsPages.id, existing[0].id))
      logger.info(`  Removed obsolete page: ${slug}`)
    }
  }

  // 2. Upsert all pages
  let created = 0
  let updated = 0
  let skipped = 0

  for (const pageData of pages) {
    const existing = await db
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(eq(cmsPages.slug, pageData.slug))
      .limit(1)

    let pageId: string

    if (existing.length > 0) {
      // Update existing page metadata
      pageId = existing[0].id
      await db
        .update(cmsPages)
        .set({
          title: pageData.title,
          seoTitle: pageData.seoTitle || null,
          seoDescription: pageData.seoDescription || null,
          status: pageData.status,
          publishedAt: pageData.status === 'published' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(cmsPages.id, pageId))

      // Delete existing blocks, re-create
      await db.delete(cmsBlocks).where(eq(cmsBlocks.pageId, pageId))
      updated++
      logger.info(`  Updated page: ${pageData.slug}`)
    } else {
      // Create new page
      const [page] = await db
        .insert(cmsPages)
        .values({
          slug: pageData.slug,
          title: pageData.title,
          seoTitle: pageData.seoTitle || null,
          seoDescription: pageData.seoDescription || null,
          status: pageData.status,
          publishedAt: pageData.status === 'published' ? new Date() : null,
        })
        .returning()

      pageId = page.id
      created++
      logger.info(`  Created page: ${pageData.slug}`)
    }

    // Insert blocks
    for (const blockData of pageData.blocks) {
      await db.insert(cmsBlocks).values({
        pageId,
        blockType: blockData.blockType,
        sortOrder: blockData.sortOrder,
        content: blockData.content,
        settings: (blockData as { settings?: Record<string, unknown> }).settings || {},
        isVisible: true,
      })
    }

    // Update published snapshot
    const allBlocks = await db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.pageId, pageId))

    await db
      .update(cmsPages)
      .set({
        publishedBlocks: allBlocks,
        hasDraftChanges: false,
      })
      .where(eq(cmsPages.id, pageId))
  }

  logger.info(`\nCMS Website seed completed!`)
  logger.info(`  Created: ${created} pages`)
  logger.info(`  Updated: ${updated} pages`)
  logger.info(`  Total blocks: ${pages.reduce((sum, p) => sum + p.blocks.length, 0)}`)
  logger.info(`  Obsolete removed: ${obsoleteSlugs.length}`)

  await client.end()
  process.exit(0)
}

seed().catch((error) => {
  logger.error('Seed failed', error, { module: 'CmsWebsiteSeed' })
  process.exit(1)
})
