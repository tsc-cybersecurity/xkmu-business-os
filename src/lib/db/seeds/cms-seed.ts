/**
 * CMS Seed Script
 *
 * Seeds the CMS pages and blocks with the existing hardcoded content.
 * Run: npx tsx src/lib/db/seeds/cms-seed.ts
 *
 * Requires DATABASE_URL environment variable.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { cmsPages, cmsBlocks, tenants } from '../schema'
import { eq } from 'drizzle-orm'

async function seed() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL not set')
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

  // Get first tenant (system tenant)
  const [tenant] = await db.select().from(tenants).limit(1)
  if (!tenant) {
    console.error('No tenant found. Create a tenant first.')
    process.exit(1)
  }

  const tenantId = tenant.id
  console.log(`Seeding CMS for tenant: ${tenant.name} (${tenantId})`)

  // Define pages with their blocks
  const pages = [
    {
      slug: '/',
      title: 'Startseite',
      status: 'published',
      blocks: [
        {
          blockType: 'hero',
          sortOrder: 0,
          content: {
            backgroundImage: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop',
            overlayGradient: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.6), rgba(0,0,0,0.7))',
            badge: { icon: 'Building2', text: 'Professionelles Business Operating System' },
            headline: 'Ihr Unternehmen.',
            headlineHighlight: 'Eine Plattform.',
            subheadline: 'XKMU Business OS vereint CRM, Lead-Management, Produktkatalog und KI-gestuetzte Prozesse in einer modernen, mandantenfaehigen Loesung.',
            buttons: [
              { label: 'Zum Login', href: '/intern/login', variant: 'default' },
              { label: 'Kostenlos registrieren', href: '/intern/register', variant: 'outline' },
            ],
            stats: [
              { value: '100%', label: 'Open Source' },
              { value: 'Multi', label: 'Tenant' },
              { value: 'KI', label: 'Powered' },
            ],
          },
        },
        {
          blockType: 'features',
          sortOrder: 1,
          content: {
            sectionTitle: 'Alles, was Ihr Business braucht',
            sectionSubtitle: 'Eine All-in-One Plattform fuer modernes Kundenmanagement, Vertrieb und Prozessautomatisierung',
            columns: 3,
            items: [
              { icon: 'Building', title: 'CRM & Kontaktmanagement', description: 'Verwalten Sie Firmen und Kontaktpersonen zentral. Strukturierte Datenhaltung mit vollstaendiger Historie.' },
              { icon: 'TrendingUp', title: 'Lead-Management', description: 'Von der ersten Anfrage bis zum Abschluss. Lead-Scoring, Pipeline-Management und automatische Workflows.' },
              { icon: 'Bot', title: 'KI-Integration', description: 'Automatische Recherche, intelligente Textvervollstaendigung und KI-gestuetzte Analyse mit OpenRouter, Ollama & mehr.' },
              { icon: 'Package', title: 'Produktkatalog', description: 'Produkte und Dienstleistungen zentral verwalten. Kategorisierung, Preise und flexible Custom Fields.' },
              { icon: 'Zap', title: 'Webhooks & API', description: 'Vollstaendige REST API mit Dokumentation. Webhook-Integration fuer externe Automatisierungen.' },
              { icon: 'Users', title: 'Rollen & Berechtigungen', description: 'Granulares RBAC-System. Definieren Sie eigene Rollen mit spezifischen Berechtigungen pro Modul.' },
            ],
          },
        },
        {
          blockType: 'cta',
          sortOrder: 2,
          content: {
            headline: 'Bereit durchzustarten?',
            description: 'Starten Sie jetzt kostenlos und erleben Sie, wie XKMU Business OS Ihre Geschaeftsprozesse vereinfacht und automatisiert.',
            buttons: [
              { label: 'Jetzt registrieren', href: '/intern/register', variant: 'secondary' },
              { label: 'Zum Login', href: '/intern/login', variant: 'outline' },
            ],
            highlights: [
              { icon: 'Shield', title: 'Sicher & DSGVO-konform', subtitle: 'Ihre Daten bleiben geschuetzt' },
              { icon: 'Zap', title: 'Sofort einsatzbereit', subtitle: 'In Minuten startklar' },
              { icon: 'Globe', title: 'Open Source', subtitle: 'Volle Transparenz & Kontrolle' },
            ],
          },
        },
      ],
    },
    {
      slug: '/cyber-security',
      title: 'Cyber Security',
      status: 'published',
      blocks: [
        {
          blockType: 'placeholder',
          sortOrder: 0,
          content: {
            icon: 'Shield',
            title: 'Cyber Security',
            description: 'Schuetzen Sie Ihr Unternehmen vor digitalen Bedrohungen mit unseren umfassenden Sicherheitsloesungen.',
          },
        },
      ],
    },
    {
      slug: '/ki-automation',
      title: 'KI & Automation',
      status: 'published',
      blocks: [
        {
          blockType: 'placeholder',
          sortOrder: 0,
          content: {
            icon: 'Bot',
            title: 'KI & Automation',
            description: 'Nutzen Sie die Kraft kuenstlicher Intelligenz, um Ihre Geschaeftsprozesse zu automatisieren und zu optimieren.',
          },
        },
      ],
    },
    {
      slug: '/it-consulting',
      title: 'IT Consulting',
      status: 'published',
      blocks: [
        {
          blockType: 'placeholder',
          sortOrder: 0,
          content: {
            icon: 'Monitor',
            title: 'IT Consulting',
            description: 'Strategische IT-Beratung fuer die digitale Transformation Ihres Unternehmens.',
          },
        },
      ],
    },
    {
      slug: '/agb',
      title: 'Allgemeine Geschaeftsbedingungen',
      status: 'published',
      blocks: [
        {
          blockType: 'heading',
          sortOrder: 0,
          content: { text: 'Allgemeine Geschaeftsbedingungen', level: 1 },
        },
        {
          blockType: 'text',
          sortOrder: 1,
          content: {
            content: `## § 1 Geltungsbereich

Diese Allgemeinen Geschaeftsbedingungen (AGB) gelten fuer alle Vertraege ueber die Nutzung der XKMU Business OS Plattform, die zwischen dem Betreiber und den Nutzern geschlossen werden.

## § 2 Vertragsgegenstand

Der Betreiber stellt dem Nutzer eine cloudbasierte Business-Management-Plattform zur Verfuegung. Die konkreten Leistungen ergeben sich aus der Leistungsbeschreibung und dem gewaehlten Tarif.

## § 3 Vertragsschluss und Registrierung

(1) Der Vertragsschluss erfolgt durch die Registrierung auf der Plattform.
(2) Der Nutzer muss bei der Registrierung wahrheitsgemaesse Angaben machen.
(3) Der Nutzer erhaelt nach erfolgreicher Registrierung eine Bestaetigungs-E-Mail.

## § 4 Nutzungsrechte

(1) Der Nutzer erhaelt ein nicht-exklusives, zeitlich auf die Vertragslaufzeit beschraenktes Recht zur Nutzung der Software.
(2) Eine Weitergabe der Zugangsdaten an Dritte ist nicht gestattet.
(3) Der Nutzer darf die Software nicht reverse engineeren oder modifizieren.

## § 5 Datenschutz

Der Betreiber verpflichtet sich zur Einhaltung der geltenden Datenschutzbestimmungen, insbesondere der DSGVO. Weitere Informationen finden Sie in unserer Datenschutzerklaerung.

## § 6 Verfuegbarkeit

(1) Der Betreiber bemueht sich um eine hohe Verfuegbarkeit der Plattform.
(2) Wartungsarbeiten werden nach Moeglichkeit ausserhalb der ueblichen Geschaeftszeiten durchgefuehrt.
(3) Ein Anspruch auf 100%ige Verfuegbarkeit besteht nicht.

## § 7 Verguetung und Zahlungsbedingungen

(1) Die Verguetung richtet sich nach dem gewaehlten Tarif.
(2) Die Abrechnung erfolgt monatlich im Voraus.
(3) Bei Zahlungsverzug koennen Mahngebuehren erhoben werden.

## § 8 Vertragslaufzeit und Kuendigung

(1) Der Vertrag wird auf unbestimmte Zeit geschlossen.
(2) Der Vertrag kann von beiden Seiten mit einer Frist von 30 Tagen zum Monatsende gekuendigt werden.
(3) Das Recht zur ausserordentlichen Kuendigung bleibt unberuehrt.

## § 9 Haftung

(1) Der Betreiber haftet unbeschraenkt bei Vorsatz und grober Fahrlaessigkeit.
(2) Bei leichter Fahrlaessigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten.
(3) Die Haftung fuer Datenverlust ist auf den typischen Wiederherstellungsaufwand beschraenkt.

## § 10 Schlussbestimmungen

(1) Es gilt das Recht der Bundesrepublik Deutschland.
(2) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der uebrigen Bestimmungen unberuehrt.
(3) Aenderungen dieser AGB werden dem Nutzer per E-Mail mitgeteilt.`,
          },
          settings: { maxWidth: 768 },
        },
      ],
    },
    {
      slug: '/impressum',
      title: 'Impressum',
      status: 'published',
      blocks: [
        {
          blockType: 'heading',
          sortOrder: 0,
          content: { text: 'Impressum', level: 1 },
        },
        {
          blockType: 'text',
          sortOrder: 1,
          content: {
            content: `## Angaben gemaess § 5 TMG

[Ihr Firmenname]
[Ihre Strasse und Hausnummer]
[PLZ und Ort]

## Vertreten durch

[Name des Vertretungsberechtigten]

## Kontakt

Telefon: [Ihre Telefonnummer]
E-Mail: [Ihre E-Mail-Adresse]

## Umsatzsteuer-ID

Umsatzsteuer-Identifikationsnummer gemaess § 27 a Umsatzsteuergesetz:
[Ihre USt-IdNr.]

## Haftungsausschluss

### Haftung fuer Inhalte

Als Diensteanbieter sind wir gemaess § 7 Abs.1 TMG fuer eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.

### Haftung fuer Links

Unser Angebot enthaelt Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb koennen wir fuer diese fremden Inhalte auch keine Gewaehr uebernehmen.

### Urheberrecht

Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.`,
          },
          settings: { maxWidth: 768 },
        },
      ],
    },
    {
      slug: '/datenschutz',
      title: 'Datenschutzerklaerung',
      status: 'published',
      blocks: [
        {
          blockType: 'heading',
          sortOrder: 0,
          content: { text: 'Datenschutzerklaerung', level: 1 },
        },
        {
          blockType: 'text',
          sortOrder: 1,
          content: {
            content: `## 1. Datenschutz auf einen Blick

### Allgemeine Hinweise

Die folgenden Hinweise geben einen einfachen Ueberblick darueber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.

### Datenerfassung auf dieser Website

**Wer ist verantwortlich fuer die Datenerfassung auf dieser Website?**
Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten koennen Sie dem Impressum dieser Website entnehmen.

## 2. Hosting

Wir hosten die Inhalte unserer Website bei folgendem Anbieter:

### Externes Hosting

Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert.

## 3. Allgemeine Hinweise und Pflichtinformationen

### Datenschutz

Die Betreiber dieser Seiten nehmen den Schutz Ihrer persoenlichen Daten sehr ernst.

### SSL- bzw. TLS-Verschluesselung

Diese Seite nutzt aus Sicherheitsgruenden und zum Schutz der Uebertragung vertraulicher Inhalte eine SSL- bzw. TLS-Verschluesselung.

## 4. Datenerfassung auf dieser Website

### Cookies

Unsere Internetseiten verwenden Cookies. Cookies sind kleine Textdateien und richten auf Ihrem Endgeraet keinen Schaden an.

### Server-Log-Dateien

Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien.

### Kontaktformular

Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular bei uns gespeichert.

### Registrierung auf dieser Website

Sie koennen sich auf dieser Website registrieren, um zusaetzliche Funktionen auf der Seite zu nutzen.

## 5. Ihre Rechte

Sie haben jederzeit das Recht:
- Auskunft ueber Ihre bei uns gespeicherten personenbezogenen Daten zu verlangen
- die Berichtigung, Loeschung oder Einschraenkung der Verarbeitung zu verlangen
- der Verarbeitung zu widersprechen
- die Datenuebertragbarkeit zu verlangen
- eine erteilte Einwilligung zu widerrufen

## 6. Datenuebermittlung bei Vertragsschluss

Wir uebermitteln personenbezogene Daten an Dritte nur dann, wenn dies im Rahmen der Vertragsabwicklung notwendig ist.`,
          },
          settings: { maxWidth: 768 },
        },
      ],
    },
  ]

  // Insert pages and blocks
  for (const pageData of pages) {
    console.log(`  Creating page: ${pageData.slug}`)

    // Check if page already exists
    const existing = await db
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.slug, pageData.slug))
      .limit(1)

    if (existing.length > 0) {
      console.log(`    -> Already exists, skipping`)
      continue
    }

    const [page] = await db
      .insert(cmsPages)
      .values({
        tenantId,
        slug: pageData.slug,
        title: pageData.title,
        status: pageData.status,
        publishedAt: pageData.status === 'published' ? new Date() : null,
      })
      .returning()

    for (const blockData of pageData.blocks) {
      await db.insert(cmsBlocks).values({
        tenantId,
        pageId: page.id,
        blockType: blockData.blockType,
        sortOrder: blockData.sortOrder,
        content: blockData.content,
        settings: (blockData as any).settings || {},
        isVisible: true,
      })
    }

    console.log(`    -> Created with ${pageData.blocks.length} blocks`)
  }

  console.log('\nCMS seed completed!')
  await client.end()
  process.exit(0)
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
