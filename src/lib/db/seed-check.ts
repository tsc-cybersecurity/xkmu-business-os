import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { tenants, users, cmsPages, cmsBlocks, cmsNavigationItems, blogPosts, aiPromptTemplates, productCategories, dinRequirements, dinGrants, roles, rolePermissions, companies, persons, leads, products, activities, cmsBlockTypeDefinitions, cmsBlockTemplates, wibaRequirements } from './schema'
import { eq, and, count } from 'drizzle-orm'
import { requirementsSeedData } from './seeds/din-requirements.seed'
import { grantsSeedData } from './seeds/din-grants.seed'
import { wibaRequirementsSeedData } from './seeds/wiba-requirements.seed'
import { DEFAULT_ROLE_PERMISSIONS, MODULES } from '../types/permissions'
import { DEFAULT_TEMPLATES } from '../services/ai-prompt-template.defaults'
import { seedManagementFramework } from './seeds/management-framework.seed'
import { seedDeliverableCatalog } from './seeds/deliverable-catalog.seed'
import { seedSopCatalog } from './seeds/sop-catalog.seed'
import { logger } from '@/lib/utils/logger'
const adminEmail = process.env.SEED_ADMIN_EMAIL
const adminPassword = process.env.SEED_ADMIN_PASSWORD
if (!adminEmail || !adminPassword) {
  throw new Error(
    'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables must be set before seeding. ' +
    'Set them in your .env file or pass them to docker compose.'
  )
}

const SEED_DATA = {
  // First-run only: single-tenant app, slug + name reflect xKMU identity
  tenant: {
    name: 'xKMU digital solutions',
    slug: 'xkmu-digital-solutions',
    status: 'active',
  },
  user: {
    email: adminEmail,
    password: adminPassword,
    firstName: 'xKMU',
    lastName: 'Admin',
    role: 'owner',
  },
}

const CMS_PAGES = [
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
          description: 'Starten Sie jetzt kostenlos und erleben Sie, wie XKMU Business OS Ihre Geschäftsprozesse vereinfacht und automatisiert.',
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
    slug: '/agb',
    title: 'Allgemeine Geschäftsbedingungen',
    status: 'published',
    blocks: [
      { blockType: 'heading', sortOrder: 0, content: { text: 'Allgemeine Geschäftsbedingungen', level: 1 } },
      { blockType: 'text', sortOrder: 1, content: { content: '## § 1 Geltungsbereich\n\nDiese Allgemeinen Geschäftsbedingungen (AGB) gelten fuer alle Vertraege ueber die Nutzung der XKMU Business OS Plattform, die zwischen dem Betreiber und den Nutzern geschlossen werden.\n\n## § 2 Vertragsgegenstand\n\nDer Betreiber stellt dem Nutzer eine cloudbasierte Business-Management-Plattform zur Verfuegung. Die konkreten Leistungen ergeben sich aus der Leistungsbeschreibung und dem gewaehlten Tarif.\n\n## § 3 Vertragsschluss und Registrierung\n\n(1) Der Vertragsschluss erfolgt durch die Registrierung auf der Plattform.\n(2) Der Nutzer muss bei der Registrierung wahrheitsgemaesse Angaben machen.\n(3) Der Nutzer erhaelt nach erfolgreicher Registrierung eine Bestaetigungs-E-Mail.\n\n## § 4 Nutzungsrechte\n\n(1) Der Nutzer erhaelt ein nicht-exklusives, zeitlich auf die Vertragslaufzeit beschraenktes Recht zur Nutzung der Software.\n(2) Eine Weitergabe der Zugangsdaten an Dritte ist nicht gestattet.\n(3) Der Nutzer darf die Software nicht reverse engineeren oder modifizieren.\n\n## § 5 Datenschutz\n\nDer Betreiber verpflichtet sich zur Einhaltung der geltenden Datenschutzbestimmungen, insbesondere der DSGVO. Weitere Informationen finden Sie in unserer Datenschutzerklaerung.' }, settings: { maxWidth: 768 } },
    ],
  },
  {
    slug: '/impressum',
    title: 'Impressum',
    status: 'published',
    blocks: [
      { blockType: 'heading', sortOrder: 0, content: { text: 'Impressum', level: 1 } },
      { blockType: 'text', sortOrder: 1, content: { content: '## Angaben gemaess § 5 TMG\n\n[Ihr Firmenname]\n[Ihre Strasse und Hausnummer]\n[PLZ und Ort]\n\n## Vertreten durch\n\n[Name des Vertretungsberechtigten]\n\n## Kontakt\n\nTelefon: [Ihre Telefonnummer]\nE-Mail: [Ihre E-Mail-Adresse]\n\n## Umsatzsteuer-ID\n\nUmsatzsteuer-Identifikationsnummer gemaess § 27 a Umsatzsteuergesetz:\n[Ihre USt-IdNr.]\n\n## Haftungsausschluss\n\n### Haftung fuer Inhalte\n\nAls Diensteanbieter sind wir gemaess § 7 Abs.1 TMG fuer eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.\n\n### Haftung fuer Links\n\nUnser Angebot enthaelt Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.\n\n### Urheberrecht\n\nDie durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.' }, settings: { maxWidth: 768 } },
    ],
  },
  {
    slug: '/datenschutz',
    title: 'Datenschutzerklaerung',
    status: 'published',
    blocks: [
      { blockType: 'heading', sortOrder: 0, content: { text: 'Datenschutzerklaerung', level: 1 } },
      { blockType: 'text', sortOrder: 1, content: { content: '## 1. Datenschutz auf einen Blick\n\n### Allgemeine Hinweise\n\nDie folgenden Hinweise geben einen einfachen Ueberblick darueber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.\n\n### Datenerfassung auf dieser Website\n\n**Wer ist verantwortlich für die Datenerfassung auf dieser Website?**\nDie Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.\n\n## 2. Hosting\n\nWir hosten die Inhalte unserer Website bei folgendem Anbieter:\n\n### Externes Hosting\n\nDiese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert.\n\n## 3. Allgemeine Hinweise und Pflichtinformationen\n\n### Datenschutz\n\nDie Betreiber dieser Seiten nehmen den Schutz Ihrer persoenlichen Daten sehr ernst.\n\n## 4. Datenerfassung auf dieser Website\n\n### Cookies\n\nUnsere Internetseiten verwenden Cookies. Cookies sind kleine Textdateien und richten auf Ihrem Endgeraet keinen Schaden an.\n\n## 5. Ihre Rechte\n\nSie haben jederzeit das Recht:\n- Auskunft ueber Ihre bei uns gespeicherten personenbezogenen Daten zu verlangen\n- die Berichtigung, Loeschung oder Einschraenkung der Verarbeitung zu verlangen\n- der Verarbeitung zu widersprechen\n- die Datenuebertragbarkeit zu verlangen\n- eine erteilte Einwilligung zu widerrufen' }, settings: { maxWidth: 768 } },
    ],
  },
]

function getSslConfig(): 'require' | false {
  const sslEnv = process.env.DATABASE_SSL
  if (sslEnv === 'false' || sslEnv === '0') return false
  if (sslEnv === 'require') return 'require'
  if (process.env.DOCKER === 'true' || process.env.COOLIFY === 'true') return false
  if (process.env.NODE_ENV === 'production') return 'require'
  return false
}

async function seedCmsPages(db: ReturnType<typeof drizzle>) {
  let created = 0
  for (const pageData of CMS_PAGES) {
    const existing = await db
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.slug, pageData.slug))
      .limit(1)

    if (existing.length > 0) continue

    const [page] = await db
      .insert(cmsPages)
      .values({
        slug: pageData.slug,
        title: pageData.title,
        status: pageData.status,
        publishedAt: pageData.status === 'published' ? new Date() : null,
      })
      .returning()

    for (const blockData of pageData.blocks) {
      await db.insert(cmsBlocks).values({
        pageId: page.id,
        blockType: blockData.blockType,
        sortOrder: blockData.sortOrder,
        content: blockData.content,
        settings: (blockData as { settings?: Record<string, unknown> }).settings || {},
        isVisible: true,
      })
    }
    created++
  }
  return created
}

async function seedDinData(db: ReturnType<typeof drizzle>) {
  let seeded = false

  // Seed Requirements
  const [{ total: reqCount }] = await db.select({ total: count() }).from(dinRequirements)
  if (Number(reqCount) === 0) {
    await db.insert(dinRequirements).values(requirementsSeedData)
    logger.info(`Created ${requirementsSeedData.length} DIN SPEC 27076 requirements`)
    seeded = true
  }

  // Seed Grants
  const [{ total: grantCount }] = await db.select({ total: count() }).from(dinGrants)
  if (Number(grantCount) === 0) {
    await db.insert(dinGrants).values(grantsSeedData)
    logger.info(`Created ${grantsSeedData.length} Foerderprogramme`)
    seeded = true
  }

  if (!seeded) {
    logger.info('DIN SPEC data already exists, skipping...')
  }
}

async function seedWibaData(db: ReturnType<typeof drizzle>) {
  let seeded = false

  try {
    // Seed WiBA Requirements
    const [{ total: wibaReqCount }] = await db.select({ total: count() }).from(wibaRequirements)
    if (Number(wibaReqCount) === 0) {
      for (let i = 0; i < wibaRequirementsSeedData.length; i += 50) {
        const batch = wibaRequirementsSeedData.slice(i, i + 50)
        await db.insert(wibaRequirements).values(batch)
      }
      logger.info(`Created ${wibaRequirementsSeedData.length} WiBA requirements`)
      seeded = true
    }

    if (!seeded) {
      logger.info('WiBA data already exists, skipping...')
    }
  } catch (error) {
    logger.info('WiBA tables not yet available, skipping seed (will seed on next restart)')
  }
}

async function seedAuditorRole(db: ReturnType<typeof drizzle>) {
  const auditorConfig = DEFAULT_ROLE_PERMISSIONS['auditor']
  if (!auditorConfig) return

  // Check if role already exists for this tenant
  const [existing] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.name, 'auditor')))
    .limit(1)

  if (existing) {
    logger.info('Auditor role already exists, skipping...')
    return
  }

  const [role] = await db
    .insert(roles)
    .values({
      name: 'auditor',
      displayName: auditorConfig.displayName,
      description: auditorConfig.description,
      isSystem: true,
    })
    .returning()

  const permissionRows = MODULES.map((module) => ({
    roleId: role.id,
    module,
    canCreate: auditorConfig.permissions[module]?.create ?? false,
    canRead: auditorConfig.permissions[module]?.read ?? false,
    canUpdate: auditorConfig.permissions[module]?.update ?? false,
    canDelete: auditorConfig.permissions[module]?.delete ?? false,
  }))

  await db.insert(rolePermissions).values(permissionRows)
  logger.info(`Created auditor role with ${permissionRows.length} permissions`)
}

// ============================================
// Navigation Seed Data
// ============================================
const NAVIGATION_ITEMS = [
  // Header
  { location: 'header', label: 'KI-Beratung', href: '/ki-beratung', sortOrder: 0 },
  { location: 'header', label: 'IT-Beratung', href: '/it-beratung', sortOrder: 1 },
  { location: 'header', label: 'Cybersecurity', href: '/cybersecurity', sortOrder: 2 },
  { location: 'header', label: 'Kombinations-Module', href: '/loesungen', sortOrder: 3 },
  { location: 'header', label: 'Pakete & Preise', href: '/pakete', sortOrder: 4 },
  { location: 'header', label: 'IT-News', href: '/it-news', sortOrder: 5 },
  // Footer
  { location: 'footer', label: 'Kostenlos starten', href: '/intern/register', sortOrder: 0 },
  { location: 'footer', label: 'API-Dokumentation', href: '/api-docs', sortOrder: 1 },
  { location: 'footer', label: 'Impressum', href: '/impressum', sortOrder: 2 },
  { location: 'footer', label: 'Kontakt', href: '/kontakt', sortOrder: 3 },
  { location: 'footer', label: 'AGB', href: '/agb', sortOrder: 4 },
  { location: 'footer', label: 'Datenschutz', href: '/datenschutz', sortOrder: 5 },
]

async function seedNavigation(db: ReturnType<typeof drizzle>) {
  const [{ total }] = await db.select({ total: count() }).from(cmsNavigationItems)
  if (Number(total) > 0) {
    logger.info('Navigation already exists, skipping...')
    return 0
  }

  const items = NAVIGATION_ITEMS.map((item) => ({
    location: item.location,
    label: item.label,
    href: item.href,
    sortOrder: item.sortOrder,
    openInNewTab: false,
    isVisible: true,
  }))

  await db.insert(cmsNavigationItems).values(items)
  logger.info(`Created ${items.length} navigation items`)
  return items.length
}

// ============================================
// Blog Seed Data
// ============================================
const BLOG_POSTS = [
  {
    title: 'Willkommen bei XKMU Business OS',
    slug: 'willkommen-bei-xkmu-business-os',
    excerpt: 'Erfahren Sie, wie XKMU Business OS Ihre Geschäftsprozesse vereinfacht und automatisiert.',
    content: `# Willkommen bei XKMU Business OS

XKMU Business OS ist eine moderne, mandantenfaehige Business-Management-Plattform, die speziell fuer kleine und mittelstaendische Unternehmen entwickelt wurde.

## Was bietet XKMU Business OS?

### CRM & Kontaktmanagement
Verwalten Sie Ihre Firmen- und Personenkontakte zentral. Mit strukturierter Datenhaltung, vollstaendiger Historie und KI-gestuetzter Recherche.

### Lead-Management
Vom ersten Kontakt bis zum Abschluss – verfolgen Sie Ihre Leads durch die gesamte Sales Pipeline mit Scoring und automatischen Workflows.

### KI-Integration
Nutzen Sie kuenstliche Intelligenz fuer automatische Recherche, Content-Erstellung, SEO-Optimierung und intelligente Geschäftsanalysen.

### Angebote & Rechnungen
Erstellen Sie professionelle Angebote und Rechnungen mit automatischer Nummernvergabe und Status-Workflows.

### Blog & CMS
Veröffentlichen Sie Inhalte auf Ihrer Website mit dem integrierten Block-basierten CMS und Blog-System.

## Erste Schritte

1. **Kontakte anlegen** – Erfassen Sie Ihre Firmen und Ansprechpartner
2. **Produkte definieren** – Legen Sie Ihren Produktkatalog an
3. **Leads verfolgen** – Nutzen Sie die Sales Pipeline
4. **KI aktivieren** – Konfigurieren Sie einen KI-Provider unter Einstellungen

Viel Erfolg mit XKMU Business OS!`,
    category: 'Allgemein',
    tags: ['XKMU', 'Getting Started', 'Business OS'],
    status: 'published',
    seoTitle: 'Willkommen bei XKMU Business OS - Ihr Business Management System',
    seoDescription: 'XKMU Business OS vereint CRM, Lead-Management, KI-Integration und mehr in einer modernen Plattform fuer KMU.',
    seoKeywords: 'Business OS, CRM, KMU, Lead-Management, KI',
  },
  {
    title: 'IT-Sicherheit fuer KMU: 5 Massnahmen, die sofort wirken',
    slug: 'it-sicherheit-fuer-kmu-5-massnahmen',
    excerpt: 'Kleine und mittelstaendische Unternehmen sind besonders haeufig Ziel von Cyberangriffen. Diese 5 Massnahmen schuetzen Ihr Unternehmen sofort.',
    content: `# IT-Sicherheit fuer KMU: 5 Massnahmen, die sofort wirken

Cyberangriffe treffen laengst nicht mehr nur Grosskonzerne. Gerade kleine und mittelstaendische Unternehmen (KMU) sind ein beliebtes Ziel, weil sie oft weniger in IT-Sicherheit investieren.

## 1. Starke Passwoerter und Zwei-Faktor-Authentifizierung

Verwenden Sie fuer alle Systeme individuelle, komplexe Passwoerter und aktivieren Sie wo moeglich die Zwei-Faktor-Authentifizierung (2FA). Ein Passwort-Manager hilft bei der Verwaltung.

## 2. Regelmaessige Backups

Sichern Sie Ihre Daten regelmaessig – idealerweise nach der 3-2-1-Regel: 3 Kopien, auf 2 verschiedenen Medien, davon 1 extern. Testen Sie regelmaessig die Wiederherstellung.

## 3. Software aktuell halten

Installieren Sie Sicherheitsupdates zeitnah. Veraltete Software ist eines der haeufigsten Einfallstore fuer Angreifer. Automatische Updates erleichtern dies erheblich.

## 4. Mitarbeiter schulen

Der Mensch ist oft das schwaechste Glied. Schulen Sie Ihre Mitarbeiter regelmaessig zu Phishing-Erkennung, sicherem Umgang mit E-Mails und dem Melden verdaechtiger Aktivitäten.

## 5. DIN SPEC 27076 Audit durchfuehren

Der standardisierte IT-Sicherheitscheck nach DIN SPEC 27076 gibt Ihnen einen klaren Ueberblick ueber den Stand Ihrer IT-Sicherheit und zeigt konkrete Handlungsfelder auf.

## Fazit

IT-Sicherheit muss nicht teuer oder kompliziert sein. Mit diesen fuenf Massnahmen legen Sie eine solide Grundlage für den Schutz Ihres Unternehmens.`,
    category: 'IT-Sicherheit',
    tags: ['Cybersecurity', 'KMU', 'IT-Sicherheit', 'DIN SPEC 27076'],
    status: 'published',
    seoTitle: 'IT-Sicherheit fuer KMU: 5 sofort wirksame Massnahmen',
    seoDescription: 'Schuetzen Sie Ihr KMU vor Cyberangriffen mit diesen 5 einfachen und sofort umsetzbaren IT-Sicherheitsmassnahmen.',
    seoKeywords: 'IT-Sicherheit, KMU, Cybersecurity, Backup, Passwoerter, DIN SPEC 27076',
  },
  {
    title: 'KI im Mittelstand: Praktische Anwendungsfaelle',
    slug: 'ki-im-mittelstand-praktische-anwendungsfaelle',
    excerpt: 'Kuenstliche Intelligenz ist kein Hype mehr, sondern ein praktisches Werkzeug. So nutzen KMU bereits heute KI im Alltag.',
    content: `# KI im Mittelstand: Praktische Anwendungsfaelle

Kuenstliche Intelligenz (KI) ist laengst kein Zukunftsthema mehr. Auch kleine und mittelstaendische Unternehmen können heute von KI profitieren – ohne Millionenbudgets.

## Automatische Kundenrecherche

KI kann öffentlich verfügbare Informationen zu potenziellen Kunden sammeln und strukturieren. Das spart Vertriebsmitarbeitern wertvolle Zeit bei der Lead-Qualifizierung.

## Content-Erstellung

Blog-Beitraege, Social-Media-Posts und Newsletter-Texte lassen sich mit KI-Unterstuetzung deutlich schneller erstellen. Die KI liefert Entwürfe, die der Mensch verfeinert.

## Dokumentenanalyse

Geschäftsberichte, Vertraege und andere Dokumente können per KI analysiert werden. Relevante Kennzahlen und Informationen werden automatisch extrahiert.

## SEO-Optimierung

KI generiert passende Meta-Titel, Beschreibungen und Keywords fuer Webseiten und Blog-Beitraege – basierend auf dem vorhandenen Inhalt.

## Personalisierte Ansprache

Ob E-Mail, LinkedIn-Nachricht oder Telefonleitfaden: KI hilft bei der Erstellung personalisierter Outreach-Texte fuer jeden Lead.

## Einstieg leicht gemacht

Mit XKMU Business OS können Sie direkt loslegen. Die Plattform integriert verschiedene KI-Anbieter (Gemini, OpenAI, Ollama u.a.) und bietet anpassbare Prompt-Vorlagen fuer alle Anwendungsfaelle.`,
    category: 'KI & Automation',
    tags: ['KI', 'Mittelstand', 'Automation', 'Digitalisierung'],
    status: 'published',
    seoTitle: 'KI im Mittelstand: Praktische Anwendungsfaelle fuer KMU',
    seoDescription: 'Wie kleine und mittelstaendische Unternehmen kuenstliche Intelligenz praktisch einsetzen können – von Kundenrecherche bis Content-Erstellung.',
    seoKeywords: 'KI, Mittelstand, KMU, Automation, kuenstliche Intelligenz, Digitalisierung',
  },
]

async function seedBlogPosts(db: ReturnType<typeof drizzle>, authorId: string) {
  const [{ total }] = await db.select({ total: count() }).from(blogPosts)
  if (Number(total) > 0) {
    logger.info('Blog posts already exist, skipping...')
    return 0
  }

  let created = 0
  for (const post of BLOG_POSTS) {
    await db.insert(blogPosts).values({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      tags: post.tags,
      status: post.status,
      publishedAt: new Date(),
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoKeywords: post.seoKeywords,
      source: 'manual',
      authorId,
    })
    created++
  }
  logger.info(`Created ${created} blog posts`)
  return created
}

// ============================================
// AI Prompt Templates Seed Data (Slugs aus DEFAULT_TEMPLATES)
// ============================================
const AI_PROMPT_TEMPLATE_SLUGS = Object.keys(DEFAULT_TEMPLATES)

async function seedAiPromptTemplates(db: ReturnType<typeof drizzle>) {
  const [{ total }] = await db.select({ total: count() }).from(aiPromptTemplates)
  if (Number(total) > 0) {
    logger.info('AI prompt templates already exist, skipping...')
    return 0
  }

  let created = 0
  for (const slug of AI_PROMPT_TEMPLATE_SLUGS) {
    const defaults = DEFAULT_TEMPLATES[slug]
    await db.insert(aiPromptTemplates).values({ slug,
      name: defaults.name,
      description: defaults.description,
      systemPrompt: defaults.systemPrompt,
      userPrompt: defaults.userPrompt,
      outputFormat: defaults.outputFormat,
      isActive: true,
    })
    created++
  }
  logger.info(`Created ${created} AI prompt templates`)
  return created
}

// ============================================
// Product Categories Seed Data
// ============================================
const PRODUCT_CATEGORIES = [
  { name: 'IT-Dienstleistungen', slug: 'it-dienstleistungen', description: 'Beratung, Entwicklung und Support' },
  { name: 'Software', slug: 'software', description: 'Softwareprodukte und Lizenzen' },
  { name: 'Cloud-Services', slug: 'cloud-services', description: 'Cloud-Hosting, SaaS und Infrastruktur' },
  { name: 'Security', slug: 'security', description: 'IT-Sicherheitsprodukte und -dienstleistungen' },
  { name: 'Hardware', slug: 'hardware', description: 'IT-Hardware und Zubehoer' },
]

async function seedProductCategories(db: ReturnType<typeof drizzle>) {
  const [{ total }] = await db.select({ total: count() }).from(productCategories)
  if (Number(total) > 0) {
    logger.info('Product categories already exist, skipping...')
    return 0
  }

  let created = 0
  for (const cat of PRODUCT_CATEGORIES) {
    await db.insert(productCategories).values({ name: cat.name,
      slug: cat.slug,
      description: cat.description,
    })
    created++
  }
  logger.info(`Created ${created} product categories`)
  return created
}

// ============================================
// CMS Block Type Definitions (Global)
// ============================================
const BLOCK_TYPE_DEFAULTS = [
  { slug: 'hero', name: 'Hero', description: 'Grosser Einleitungsbereich mit Bild, Headline und CTA-Buttons', icon: 'LayoutTemplate', category: 'content', fields: ['headline', 'headlineHighlight', 'subheadline', 'buttons', 'stats'], defaultContent: { headline: 'Willkommen', headlineHighlight: 'auf unserer Seite', subheadline: 'Beschreibungstext hier...', buttons: [{ label: 'Mehr erfahren', href: '#', variant: 'default' }] }, defaultSettings: {}, isActive: true, sortOrder: 0 },
  { slug: 'features', name: 'Features', description: 'Feature-Grid mit Icons, Titeln und Beschreibungen', icon: 'Star', category: 'content', fields: ['sectionTitle', 'sectionSubtitle', 'columns', 'items'], defaultContent: { sectionTitle: 'Unsere Features', sectionSubtitle: 'Was wir bieten', columns: 3, items: [{ icon: 'Star', title: 'Feature 1', description: 'Beschreibung' }] }, defaultSettings: {}, isActive: true, sortOrder: 1 },
  { slug: 'cta', name: 'Call-to-Action', description: 'Call-to-Action Bereich mit Headline, Beschreibung und Buttons', icon: 'MousePointerClick', category: 'content', fields: ['headline', 'description', 'buttons', 'highlights'], defaultContent: { headline: 'Bereit loszulegen?', description: 'Kontaktieren Sie uns noch heute.', buttons: [{ label: 'Kontakt', href: '#', variant: 'default' }] }, defaultSettings: {}, isActive: true, sortOrder: 2 },
  { slug: 'text', name: 'Text', description: 'Freitext-Block mit Markdown-Unterstuetzung', icon: 'Type', category: 'content', fields: ['content', 'alignment'], defaultContent: { content: 'Hier steht Ihr **Text** mit _Markdown_-Formatierung.', alignment: 'left' }, defaultSettings: {}, isActive: true, sortOrder: 3 },
  { slug: 'heading', name: 'Ueberschrift', description: 'Ueberschrift mit optionalem Untertitel', icon: 'Heading', category: 'content', fields: ['text', 'level', 'subtitle'], defaultContent: { text: 'Ueberschrift', level: 2, subtitle: 'Optionaler Untertitel' }, defaultSettings: {}, isActive: true, sortOrder: 4 },
  { slug: 'image', name: 'Bild', description: 'Einzelbild mit Alt-Text und optionaler Bildunterschrift', icon: 'ImageIcon', category: 'media', fields: ['src', 'alt', 'caption', 'width'], defaultContent: { src: '', alt: 'Beispielbild', caption: 'Bildunterschrift', width: 'container' }, defaultSettings: {}, isActive: true, sortOrder: 5 },
  { slug: 'cards', name: 'Karten', description: 'Karten-Grid mit Icons, Titeln und Beschreibungen', icon: 'SquareStack', category: 'content', fields: ['columns', 'items'], defaultContent: { columns: 3, items: [{ icon: 'Box', title: 'Karte 1', description: 'Beschreibung', link: '' }] }, defaultSettings: {}, isActive: true, sortOrder: 6 },
  { slug: 'testimonials', name: 'Referenzen', description: 'Kundenstimmen und Referenzen mit Bewertungen', icon: 'MessageSquareQuote', category: 'content', fields: ['sectionTitle', 'columns', 'items'], defaultContent: { sectionTitle: 'Was unsere Kunden sagen', columns: 2, items: [{ name: 'Max Mustermann', role: 'CEO', company: 'Beispiel GmbH', quote: 'Hervorragende Zusammenarbeit und erstklassige Ergebnisse.', rating: 5 }] }, defaultSettings: {}, isActive: true, sortOrder: 7 },
  { slug: 'pricing', name: 'Preistabelle', description: 'Preistabelle mit Paketen, Features und CTA-Buttons', icon: 'CreditCard', category: 'interactive', fields: ['sectionTitle', 'plans'], defaultContent: { sectionTitle: 'Unsere Pakete', plans: [{ name: 'Starter', price: '29€', period: 'Monat', description: 'Fuer Einsteiger', features: ['Feature 1', 'Feature 2'], buttonLabel: 'Waehlen', buttonHref: '#' }, { name: 'Professional', price: '79€', period: 'Monat', description: 'Fuer Profis', features: ['Alles aus Starter', 'Feature 3', 'Feature 4'], buttonLabel: 'Waehlen', buttonHref: '#', highlighted: true }] }, defaultSettings: {}, isActive: true, sortOrder: 8 },
  { slug: 'faq', name: 'FAQ', description: 'Haeufige Fragen als aufklappbares Akkordeon', icon: 'HelpCircle', category: 'interactive', fields: ['sectionTitle', 'items'], defaultContent: { sectionTitle: 'Haeufige Fragen', items: [{ question: 'Wie kann ich starten?', answer: 'Registrieren Sie sich einfach und legen Sie los.' }, { question: 'Gibt es eine Testphase?', answer: 'Ja, Sie können unseren Service 14 Tage kostenlos testen.' }] }, defaultSettings: {}, isActive: true, sortOrder: 9 },
  { slug: 'stats', name: 'Kennzahlen', description: 'Kennzahlen und Statistiken als grosse Zahlenwerte', icon: 'BarChart3', category: 'content', fields: ['sectionTitle', 'columns', 'variant', 'items'], defaultContent: { sectionTitle: 'In Zahlen', columns: 4, variant: 'cards', items: [{ value: '500+', label: 'Kunden' }, { value: '99.9%', label: 'Uptime' }, { value: '24/7', label: 'Support' }, { value: '50+', label: 'Integrationen' }] }, defaultSettings: {}, isActive: true, sortOrder: 10 },
  { slug: 'team', name: 'Team', description: 'Teammitglieder mit Foto, Rolle und Bio', icon: 'Users', category: 'content', fields: ['sectionTitle', 'columns', 'items'], defaultContent: { sectionTitle: 'Unser Team', columns: 3, items: [{ name: 'Anna Schmidt', role: 'Geschäftsfuehrung', bio: 'Ueber 15 Jahre Erfahrung.' }, { name: 'Tom Mueller', role: 'Technik', bio: 'Full-Stack Entwickler.' }] }, defaultSettings: {}, isActive: true, sortOrder: 11 },
  { slug: 'timeline', name: 'Zeitleiste', description: 'Vertikale Zeitleiste fuer Prozesse oder Geschichte', icon: 'GitBranch', category: 'content', fields: ['sectionTitle', 'items'], defaultContent: { sectionTitle: 'So funktioniert es', items: [{ icon: 'Search', title: 'Schritt 1: Analyse', description: 'Wir analysieren Ihre Anforderungen.' }, { icon: 'Settings', title: 'Schritt 2: Umsetzung', description: 'Wir setzen die Loesung um.' }, { icon: 'CheckCircle', title: 'Schritt 3: Launch', description: 'Wir gehen gemeinsam live.' }] }, defaultSettings: {}, isActive: true, sortOrder: 12 },
  { slug: 'logocloud', name: 'Logo-Cloud', description: 'Logo-Leiste fuer Partner, Kunden oder Technologien', icon: 'Building2', category: 'content', fields: ['sectionTitle', 'items'], defaultContent: { sectionTitle: 'Unsere Partner', items: [{ name: 'Partner 1' }, { name: 'Partner 2' }, { name: 'Partner 3' }, { name: 'Partner 4' }] }, defaultSettings: {}, isActive: true, sortOrder: 13 },
  { slug: 'video', name: 'Video', description: 'Video-Einbettung (YouTube, Vimeo oder direkt)', icon: 'Play', category: 'media', fields: ['src', 'title', 'caption', 'width', 'aspectRatio'], defaultContent: { src: '', title: 'Video', caption: '', width: 'container', aspectRatio: '16:9' }, defaultSettings: {}, isActive: true, sortOrder: 14 },
  { slug: 'gallery', name: 'Galerie', description: 'Bildergalerie mit Lightbox und optionalen Bildunterschriften', icon: 'GalleryHorizontalEnd', category: 'media', fields: ['sectionTitle', 'columns', 'items'], defaultContent: { sectionTitle: 'Galerie', columns: 3, items: [] }, defaultSettings: {}, isActive: true, sortOrder: 15 },
  { slug: 'banner', name: 'Banner', description: 'Ankuendigungs-Banner mit Icon, Text und optionalem Button', icon: 'Megaphone', category: 'content', fields: ['text', 'variant', 'icon', 'buttonLabel', 'buttonHref'], defaultContent: { text: 'Wichtige Ankuendigung: Neues Update verfügbar!', variant: 'brand', icon: 'Megaphone', buttonLabel: 'Mehr erfahren', buttonHref: '#' }, defaultSettings: {}, isActive: true, sortOrder: 16 },
  { slug: 'divider', name: 'Trenner', description: 'Visueller Trenner zwischen Sektionen', icon: 'Minus', category: 'layout', fields: ['style', 'label'], defaultContent: { style: 'gradient', label: '' }, defaultSettings: {}, isActive: true, sortOrder: 17 },
  { slug: 'comparison', name: 'Vergleich', description: 'Vergleichstabelle fuer Features oder Pakete', icon: 'Table2', category: 'interactive', fields: ['sectionTitle', 'columns', 'rows'], defaultContent: { sectionTitle: 'Funktionsvergleich', columns: [{ name: 'Starter', highlighted: false }, { name: 'Professional', highlighted: true }], rows: [{ feature: 'Benutzer', values: ['1', 'Unbegrenzt'] }, { feature: 'Support', values: ['E-Mail', 'Prioritaet'] }, { feature: 'API-Zugang', values: ['nein', 'ja'] }] }, defaultSettings: {}, isActive: true, sortOrder: 18 },
  { slug: 'placeholder', name: 'Platzhalter', description: 'Platzhalter-Block fuer zukuenftige Inhalte', icon: 'Box', category: 'layout', fields: ['icon', 'title', 'description'], defaultContent: { icon: 'Box', title: 'Platzhalter', description: 'Dieser Bereich wird bald gefuellt.' }, defaultSettings: {}, isActive: true, sortOrder: 19 },
]

async function seedCmsBlockTypeDefinitions(db: ReturnType<typeof drizzle>) {
  const [{ total }] = await db.select({ total: count() }).from(cmsBlockTypeDefinitions)
  if (Number(total) > 0) {
    logger.info('CMS block type definitions already exist, skipping...')
    return 0
  }

  for (const def of BLOCK_TYPE_DEFAULTS) {
    await db.insert(cmsBlockTypeDefinitions).values(def)
  }
  logger.info(`Created ${BLOCK_TYPE_DEFAULTS.length} CMS block type definitions`)
  return BLOCK_TYPE_DEFAULTS.length
}

// ============================================
// CMS Block Templates (global)
// ============================================
const BLOCK_TEMPLATES = [
  { name: 'Hero Standard', blockType: 'hero', content: { backgroundImage: '', overlayGradient: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.6), rgba(0,0,0,0.7))', badge: { icon: 'Building2', text: 'Willkommen' }, headline: 'Ihr Unternehmen.', headlineHighlight: 'Unsere Loesung.', subheadline: 'Professionelle Dienstleistungen fuer Ihren Erfolg.', buttons: [{ label: 'Mehr erfahren', href: '#', variant: 'default' }, { label: 'Kontakt', href: '/kontakt', variant: 'outline' }], stats: [{ value: '10+', label: 'Jahre Erfahrung' }, { value: '100+', label: 'Kunden' }, { value: '24/7', label: 'Support' }] }, settings: {}, isSystem: true },
  { name: 'Feature 3-Spalten', blockType: 'features', content: { sectionTitle: 'Unsere Leistungen', sectionSubtitle: 'Was wir fuer Sie tun können', columns: 3, items: [{ icon: 'Shield', title: 'Sicherheit', description: 'Umfassender Schutz fuer Ihre IT-Infrastruktur.' }, { icon: 'Zap', title: 'Performance', description: 'Optimierung Ihrer Systeme fuer maximale Leistung.' }, { icon: 'Users', title: 'Support', description: 'Persoenliche Betreuung durch unser Expertenteam.' }] }, settings: {}, isSystem: true },
  { name: 'CTA Newsletter', blockType: 'cta', content: { headline: 'Bleiben Sie informiert', description: 'Abonnieren Sie unseren Newsletter und erhalten Sie die neuesten Informationen direkt in Ihr Postfach.', buttons: [{ label: 'Newsletter abonnieren', href: '#newsletter', variant: 'secondary' }], highlights: [{ icon: 'Mail', title: 'Woechentlich', subtitle: 'Aktuelle Neuigkeiten' }, { icon: 'Shield', title: 'Kein Spam', subtitle: 'Jederzeit abmeldbar' }] }, settings: {}, isSystem: true },
  { name: 'FAQ Allgemein', blockType: 'faq', content: { sectionTitle: 'Haeufig gestellte Fragen', items: [{ question: 'Wie kann ich den Service nutzen?', answer: 'Registrieren Sie sich kostenlos und starten Sie sofort.' }, { question: 'Welche Zahlungsmethoden werden akzeptiert?', answer: 'Wir akzeptieren Ueberweisung, Kreditkarte und SEPA-Lastschrift.' }, { question: 'Gibt es eine kostenlose Testphase?', answer: 'Ja, alle Pakete können 14 Tage kostenfrei getestet werden.' }, { question: 'Wie erreiche ich den Support?', answer: 'Per E-Mail, Telefon oder ueber das Kontaktformular auf unserer Website.' }] }, settings: {}, isSystem: true },
  { name: 'Preise 3 Pakete', blockType: 'pricing', content: { sectionTitle: 'Unsere Tarife', plans: [{ name: 'Starter', price: '29€', period: 'Monat', description: 'Fuer Einsteiger', features: ['1 Benutzer', 'E-Mail-Support', 'Grundfunktionen'], buttonLabel: 'Jetzt starten', buttonHref: '#' }, { name: 'Professional', price: '79€', period: 'Monat', description: 'Fuer Teams', features: ['5 Benutzer', 'Prioritaets-Support', 'Alle Funktionen', 'API-Zugang'], buttonLabel: 'Jetzt starten', buttonHref: '#', highlighted: true }, { name: 'Enterprise', price: 'Individuell', period: '', description: 'Fuer Grossunternehmen', features: ['Unbegrenzte Benutzer', 'Dedizierter Support', 'Custom Integrationen', 'SLA'], buttonLabel: 'Kontakt', buttonHref: '/kontakt' }] }, settings: {}, isSystem: true },
  { name: 'Kennzahlen Unternehmen', blockType: 'stats', content: { sectionTitle: 'Unser Unternehmen in Zahlen', columns: 4, variant: 'cards', items: [{ value: '15+', label: 'Jahre Erfahrung' }, { value: '500+', label: 'Zufriedene Kunden' }, { value: '99.9%', label: 'Verfügbarkeit' }, { value: '50+', label: 'Mitarbeiter' }] }, settings: {}, isSystem: true },
  { name: 'Team 3 Personen', blockType: 'team', content: { sectionTitle: 'Unser Team', columns: 3, items: [{ name: 'Max Mustermann', role: 'Geschäftsfuehrer', bio: 'Ueber 20 Jahre Erfahrung in der IT-Branche.' }, { name: 'Erika Musterfrau', role: 'Technische Leitung', bio: 'Expertin fuer Cloud-Architekturen und DevOps.' }, { name: 'Thomas Beispiel', role: 'Vertriebsleitung', bio: 'Spezialist fuer Kundenbeziehungen im Mittelstand.' }] }, settings: {}, isSystem: true },
  { name: 'Prozess Zeitleiste', blockType: 'timeline', content: { sectionTitle: 'Unser Vorgehen', items: [{ icon: 'Search', title: 'Analyse', description: 'Wir analysieren Ihre Ist-Situation und Anforderungen.' }, { icon: 'Lightbulb', title: 'Konzept', description: 'Wir erstellen ein massgeschneidertes Loesungskonzept.' }, { icon: 'Settings', title: 'Umsetzung', description: 'Wir implementieren die Loesung professionell.' }, { icon: 'CheckCircle', title: 'Betrieb', description: 'Wir begleiten Sie im laufenden Betrieb.' }] }, settings: {}, isSystem: true },

  // --- Hero (3 neue) ---
  { name: 'Hero Beratung', blockType: 'hero', content: { backgroundImage: '', overlayGradient: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.5))', badge: { icon: 'Lightbulb', text: 'Beratung' }, headline: 'Strategische Beratung.', headlineHighlight: 'Messbare Ergebnisse.', subheadline: 'Wir begleiten Sie bei der digitalen Transformation Ihres Unternehmens.', buttons: [{ label: 'Erstgespräch buchen', href: '#kontakt', variant: 'default' }, { label: 'Referenzen ansehen', href: '#referenzen', variant: 'outline' }], stats: [{ value: '200+', label: 'Projekte' }, { value: '98%', label: 'Zufriedenheit' }, { value: '15+', label: 'Berater' }] }, settings: {}, isSystem: true },
  { name: 'Hero Handwerk', blockType: 'hero', content: { backgroundImage: '', overlayGradient: 'linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0.55))', badge: { icon: 'Building', text: 'Handwerk' }, headline: 'Qualitaet vom Meister.', headlineHighlight: 'Zuverlaessig & fair.', subheadline: 'Ihr regionaler Partner fuer professionelle Handwerksleistungen.', buttons: [{ label: 'Angebot anfragen', href: '#kontakt', variant: 'default' }, { label: 'Unsere Leistungen', href: '#leistungen', variant: 'outline' }], stats: [{ value: '30+', label: 'Jahre Erfahrung' }, { value: '5.000+', label: 'Auftraege' }, { value: '100%', label: 'Meisterbetrieb' }] }, settings: {}, isSystem: true },
  { name: 'Hero IT-Dienstleister', blockType: 'hero', content: { backgroundImage: '', overlayGradient: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.5))', badge: { icon: 'Monitor', text: 'IT-Services' }, headline: 'IT die funktioniert.', headlineHighlight: 'Einfach. Sicher. Zuverlaessig.', subheadline: 'Managed IT-Services, Cloud-Loesungen und Cybersecurity für den Mittelstand.', buttons: [{ label: 'IT-Check starten', href: '#it-check', variant: 'default' }, { label: 'Services entdecken', href: '#services', variant: 'outline' }], stats: [{ value: '99.9%', label: 'Uptime' }, { value: '< 2h', label: 'Reaktionszeit' }, { value: '24/7', label: 'Monitoring' }] }, settings: {}, isSystem: true },

  // --- Features (2 neue) ---
  { name: 'Leistungen 4-Spalten', blockType: 'features', content: { sectionTitle: 'Unsere Leistungen', sectionSubtitle: 'Umfassende Services aus einer Hand', columns: 4, items: [{ icon: 'Monitor', title: 'IT-Betreuung', description: 'Rundum-Betreuung Ihrer IT-Infrastruktur.' }, { icon: 'Cloud', title: 'Cloud Services', description: 'Migration und Betrieb Ihrer Cloud-Umgebung.' }, { icon: 'Shield', title: 'IT-Sicherheit', description: 'Schutz vor Cyberbedrohungen und Datenverlust.' }, { icon: 'Phone', title: 'VoIP & TK', description: 'Moderne Telefonanlagen und Unified Communications.' }] }, settings: {}, isSystem: true },
  { name: 'Vorteile 2-Spalten', blockType: 'features', content: { sectionTitle: 'Warum wir?', sectionSubtitle: 'Das unterscheidet uns vom Wettbewerb', columns: 2, items: [{ icon: 'CheckCircle', title: 'Persoenliche Betreuung', description: 'Feste Ansprechpartner statt anonymer Hotline. Wir kennen Ihre Systeme.' }, { icon: 'Zap', title: 'Schnelle Reaktion', description: 'Garantierte Reaktionszeiten und proaktives Monitoring Ihrer Systeme.' }] }, settings: {}, isSystem: true },

  // --- Cards (3 neue) ---
  { name: 'Dienstleistungen Karten', blockType: 'cards', content: { columns: 3, items: [{ icon: 'Monitor', title: 'Webentwicklung', description: 'Moderne Websites und Webanwendungen.', link: '/leistungen/web' }, { icon: 'Server', title: 'Hosting', description: 'Sicheres und schnelles Webhosting.', link: '/leistungen/hosting' }, { icon: 'Shield', title: 'Security', description: 'IT-Sicherheit und Penetrationstests.', link: '/leistungen/security' }, { icon: 'Cloud', title: 'Cloud', description: 'Cloud-Migration und -Management.', link: '/leistungen/cloud' }, { icon: 'Database', title: 'Datenbanken', description: 'Datenbank-Design und -Optimierung.', link: '/leistungen/datenbanken' }, { icon: 'Code', title: 'Software', description: 'Individuelle Softwareentwicklung.', link: '/leistungen/software' }] }, settings: {}, isSystem: true },
  { name: 'Kontakt Informationen', blockType: 'cards', content: { columns: 3, items: [{ icon: 'Phone', title: 'Telefon', description: '+49 123 456 789\nMo-Fr 8:00 - 18:00 Uhr' }, { icon: 'Mail', title: 'E-Mail', description: 'info@beispiel.de\nAntwort innerhalb 24h' }, { icon: 'MapPin', title: 'Adresse', description: 'Musterstrasse 1\n12345 Musterstadt' }] }, settings: {}, isSystem: true },
  { name: 'Branchen Karten', blockType: 'cards', content: { columns: 4, items: [{ icon: 'Building', title: 'Handwerk', description: 'Digitalisierung fuer Handwerksbetriebe.' }, { icon: 'Building2', title: 'Dienstleister', description: 'IT-Loesungen fuer Dienstleistungsunternehmen.' }, { icon: 'TrendingUp', title: 'Handel', description: 'E-Commerce und Warenwirtschaft.' }, { icon: 'Heart', title: 'Gesundheit', description: 'IT fuer Praxen und Pflegeeinrichtungen.' }] }, settings: {}, isSystem: true },

  // --- Testimonials (2 neue) ---
  { name: 'Referenzen Kunden', blockType: 'testimonials', content: { sectionTitle: 'Das sagen unsere Kunden', sectionSubtitle: 'Echte Stimmen zufriedener Partner', columns: 3, items: [{ name: 'Stefan Maier', role: 'Geschäftsfuehrer', company: 'Maier Elektrotechnik GmbH', quote: 'Seit der Zusammenarbeit laeuft unsere IT reibungslos. Klare Empfehlung!', rating: 5 }, { name: 'Dr. Anna Weber', role: 'Praxisinhaberin', company: 'Zahnarztpraxis Weber', quote: 'Professionell, zuverlaessig und immer erreichbar. Genau was wir brauchen.', rating: 5 }, { name: 'Markus Lehmann', role: 'IT-Leiter', company: 'Lehmann Logistik AG', quote: 'Die Cloud-Migration hat unsere Prozesse enorm beschleunigt.', rating: 4 }] }, settings: {}, isSystem: true },
  { name: 'Referenzen 2-Spalten', blockType: 'testimonials', content: { sectionTitle: 'Kundenstimmen', columns: 2, items: [{ name: 'Claudia Richter', role: 'Geschäftsfuehrerin', company: 'Richter Consulting', quote: 'Die Beratung war erstklassig und die Umsetzung termingerecht. Wir konnten unsere Effizienz um 40% steigern.', rating: 5 }, { name: 'Thomas Braun', role: 'CTO', company: 'InnoTech Solutions', quote: 'Kompetentes Team mit tiefem technischen Verstaendnis. Die Security-Analyse hat uns die Augen geoeffnet.', rating: 5 }] }, settings: {}, isSystem: true },

  // --- CTA (3 neue) ---
  { name: 'CTA Beratungsgespraech', blockType: 'cta', content: { headline: 'Kostenlose Erstberatung', description: 'Lassen Sie uns gemeinsam herausfinden, wie wir Ihr Unternehmen voranbringen können. 30 Minuten, unverbindlich.', buttons: [{ label: 'Termin vereinbaren', href: '#termin', variant: 'default' }], highlights: [{ icon: 'Clock', title: '30 Min', subtitle: 'Kostenlos' }, { icon: 'CheckCircle', title: 'Unverbindlich', subtitle: 'Keine Kosten' }, { icon: 'Users', title: 'Persoenlich', subtitle: 'Vor Ort oder remote' }] }, settings: {}, isSystem: true },
  { name: 'CTA Angebot anfordern', blockType: 'cta', content: { headline: 'Individuelles Angebot erhalten', description: 'Beschreiben Sie uns Ihr Projekt und wir erstellen Ihnen ein massgeschneidertes Angebot innerhalb von 48 Stunden.', buttons: [{ label: 'Angebot anfordern', href: '#angebot', variant: 'default' }, { label: 'FAQ lesen', href: '#faq', variant: 'outline' }], highlights: [{ icon: 'FileText', title: 'Transparent', subtitle: 'Keine versteckten Kosten' }, { icon: 'Zap', title: '48h', subtitle: 'Schnelle Antwort' }] }, settings: {}, isSystem: true },
  { name: 'CTA Download Whitepaper', blockType: 'cta', content: { headline: 'Kostenloses Whitepaper', description: 'Erfahren Sie in unserem Leitfaden, wie Sie Ihre IT-Sicherheit in 10 Schritten verbessern können.', buttons: [{ label: 'Jetzt herunterladen', href: '#download', variant: 'default' }], highlights: [{ icon: 'FileText', title: '24 Seiten', subtitle: 'Praxis-Leitfaden' }, { icon: 'Shield', title: 'IT-Sicherheit', subtitle: 'Aktuell 2025' }] }, settings: {}, isSystem: true },

  // --- Text (2 neue) ---
  { name: 'Ueber uns Text', blockType: 'text', content: { content: '## Ueber unser Unternehmen\n\nSeit ueber 15 Jahren sind wir Ihr zuverlaessiger Partner fuer IT-Dienstleistungen im Mittelstand. Mit einem Team aus erfahrenen Spezialisten betreuen wir Unternehmen in der gesamten DACH-Region.\n\n### Unsere Mission\n\nWir machen Technologie einfach. Unsere Kunden sollen sich auf ihr Kerngeschäft konzentrieren können, waehrend wir uns um die IT kuemmern.\n\n### Unsere Werte\n\n- **Zuverlaessigkeit** - Wir halten, was wir versprechen\n- **Transparenz** - Klare Kommunikation und faire Preise\n- **Innovation** - Immer am Puls der Technik\n- **Partnerschaft** - Langfristige Zusammenarbeit auf Augenhoehe', alignment: 'left' }, settings: {}, isSystem: true },
  { name: 'Impressum Text', blockType: 'text', content: { content: '## Impressum\n\n**Muster GmbH**\nMusterstrasse 1\n12345 Musterstadt\n\nTelefon: +49 123 456 789\nE-Mail: info@muster-gmbh.de\n\n**Geschäftsfuehrer:** Max Mustermann\n\n**Registergericht:** Amtsgericht Musterstadt\n**Registernummer:** HRB 12345\n\n**USt-IdNr.:** DE123456789\n\n### Haftungsausschluss\n\nDie Inhalte dieser Website werden mit groesster Sorgfalt erstellt. Fuer die Richtigkeit, Vollstaendigkeit und Aktualitaet der Inhalte können wir jedoch keine Gewaehr uebernehmen.', alignment: 'left' }, settings: {}, isSystem: true },

  // --- Heading (2 neue) ---
  { name: 'Seitenheader Leistungen', blockType: 'heading', content: { text: 'Unsere Leistungen', level: 'h1', subtitle: 'Professionelle IT-Services fuer Ihren Geschäftserfolg', alignment: 'center' }, settings: {}, isSystem: true },
  { name: 'Seitenheader Ueber uns', blockType: 'heading', content: { text: 'Ueber uns', level: 'h1', subtitle: 'Lernen Sie unser Team und unsere Geschichte kennen', alignment: 'center' }, settings: {}, isSystem: true },

  // --- Logocloud (2 neue) ---
  { name: 'Partnerlogos Technologie', blockType: 'logocloud', content: { sectionTitle: 'Technologie-Partner', sectionSubtitle: 'Wir arbeiten mit den Besten', items: [{ name: 'Microsoft', image: '', href: '#' }, { name: 'Google Cloud', image: '', href: '#' }, { name: 'Amazon AWS', image: '', href: '#' }, { name: 'Cisco', image: '', href: '#' }, { name: 'VMware', image: '', href: '#' }, { name: 'Sophos', image: '', href: '#' }] }, settings: {}, isSystem: true },
  { name: 'Kundenlogos Referenzen', blockType: 'logocloud', content: { sectionTitle: 'Unsere Kunden', sectionSubtitle: 'Vertrauen von fuehrenden Unternehmen', items: [{ name: 'Kunde 1', image: '', href: '#' }, { name: 'Kunde 2', image: '', href: '#' }, { name: 'Kunde 3', image: '', href: '#' }, { name: 'Kunde 4', image: '', href: '#' }, { name: 'Kunde 5', image: '', href: '#' }, { name: 'Kunde 6', image: '', href: '#' }, { name: 'Kunde 7', image: '', href: '#' }, { name: 'Kunde 8', image: '', href: '#' }] }, settings: {}, isSystem: true },

  // --- FAQ (2 neue) ---
  { name: 'FAQ IT-Dienstleistungen', blockType: 'faq', content: { sectionTitle: 'Haeufige Fragen zu unseren IT-Services', items: [{ question: 'Was ist Managed IT?', answer: 'Bei Managed IT uebernehmen wir die komplette Betreuung Ihrer IT-Infrastruktur. Das umfasst Monitoring, Wartung, Updates und Support zu einem festen monatlichen Preis.' }, { question: 'Wie schnell können Sie bei Problemen helfen?', answer: 'Unsere garantierte Reaktionszeit betraegt je nach SLA zwischen 1 und 4 Stunden. Kritische Stoerungen werden priorisiert behandelt.' }, { question: 'Bieten Sie auch Cloud-Loesungen an?', answer: 'Ja, wir sind zertifizierter Partner von Microsoft Azure, AWS und Google Cloud. Wir beraten Sie herstellerneutral und finden die optimale Loesung.' }, { question: 'Was kostet eine IT-Betreuung?', answer: 'Die Kosten richten sich nach der Anzahl der Arbeitsplaetze und dem gewuenschten Service-Level. Ab ca. 50 EUR pro Arbeitsplatz/Monat erhalten Sie eine Rundum-Betreuung.' }, { question: 'Können Sie auch vor Ort kommen?', answer: 'Selbstverstaendlich. Wir loesen zwar 90% aller Probleme remote, aber fuer Installationen und komplexe Themen kommen wir gerne zu Ihnen.' }] }, settings: {}, isSystem: true },
  { name: 'FAQ Bestellprozess', blockType: 'faq', content: { sectionTitle: 'Fragen zum Bestellprozess', items: [{ question: 'Wie bestelle ich?', answer: 'Sie können direkt ueber unseren Online-Shop bestellen oder uns per E-Mail/Telefon kontaktieren. Wir erstellen Ihnen gerne ein individuelles Angebot.' }, { question: 'Welche Zahlungsarten gibt es?', answer: 'Wir akzeptieren Ueberweisung, Kreditkarte (Visa, Mastercard), SEPA-Lastschrift und PayPal. Fuer Geschäftskunden bieten wir Zahlung auf Rechnung.' }, { question: 'Wie lang sind die Lieferzeiten?', answer: 'Standardprodukte liefern wir innerhalb von 2-5 Werktagen. Fuer individuelle Loesungen erstellen wir einen Projektplan mit konkreten Meilensteinen.' }, { question: 'Kann ich meine Bestellung stornieren?', answer: 'Standardbestellungen können innerhalb von 14 Tagen storniert werden. Bei individuellen Projekten gelten die vertraglich vereinbarten Konditionen.' }] }, settings: {}, isSystem: true },

  // --- Stats (3 neue) ---
  { name: 'Kennzahlen Projekterfolge', blockType: 'stats', content: { sectionTitle: 'Unsere Projekterfolge', columns: 4, variant: 'cards', items: [{ value: '350+', label: 'Projekte abgeschlossen', description: 'Erfolgreich umgesetzt' }, { value: '99.8%', label: 'Kundenzufriedenheit', description: 'Basierend auf Umfragen' }, { value: '< 4h', label: 'Durchschn. Reaktionszeit', description: 'Bei kritischen Anfragen' }, { value: '40%', label: 'Kosteneinsparung', description: 'Im Durchschnitt fuer Kunden' }] }, settings: {}, isSystem: true },
  { name: 'Kennzahlen Brand', blockType: 'stats', content: { sectionTitle: 'Wir in Zahlen', columns: 3, variant: 'brand', items: [{ value: '2010', label: 'Gegruendet' }, { value: '45+', label: 'Mitarbeiter' }, { value: '3', label: 'Standorte' }] }, settings: {}, isSystem: true },
  { name: 'Zertifizierungen Kennzahlen', blockType: 'stats', content: { sectionTitle: 'Unsere Zertifizierungen', sectionSubtitle: 'Gepruefte Qualitaet und Sicherheit', columns: 3, variant: 'cards', items: [{ value: 'ISO 27001', label: 'Informationssicherheit', description: 'Zertifiziert seit 2019' }, { value: 'BSI', label: 'IT-Grundschutz', description: 'Basiszertifizierung' }, { value: 'DSGVO', label: 'Datenschutz', description: 'Vollstaendig konform' }] }, settings: {}, isSystem: true },

  // --- Team (2 neue) ---
  { name: 'Team Geschäftsfuehrung', blockType: 'team', content: { sectionTitle: 'Geschäftsfuehrung', sectionSubtitle: 'Die Koepfe hinter dem Unternehmen', columns: 2, items: [{ name: 'Dr. Michael Schulz', role: 'Geschäftsfuehrer / CEO', bio: 'Dr. Schulz gruendete das Unternehmen 2010 nach 15 Jahren Erfahrung in der IT-Beratung. Er verantwortet die strategische Ausrichtung und Kundenbeziehungen.' }, { name: 'Sarah Keller', role: 'Technische Geschäftsfuehrerin / CTO', bio: 'Sarah Keller bringt ueber 12 Jahre Erfahrung in Cloud-Architekturen und Softwareentwicklung mit. Sie leitet das technische Team und die Produktentwicklung.' }] }, settings: {}, isSystem: true },
  { name: 'Team 4 Personen', blockType: 'team', content: { sectionTitle: 'Unser Kernteam', columns: 4, items: [{ name: 'Lisa Meyer', role: 'Projektmanagement' }, { name: 'Jan Krueger', role: 'Systemadministration' }, { name: 'Nina Wolf', role: 'Entwicklung' }, { name: 'Oliver Becker', role: 'Vertrieb' }] }, settings: {}, isSystem: true },

  // --- Timeline (3 neue) ---
  { name: 'Onboarding Prozess', blockType: 'timeline', content: { sectionTitle: 'So starten wir zusammen', sectionSubtitle: 'In 4 Schritten zum Erfolg', items: [{ icon: 'Phone', title: 'Erstgespräch', description: 'Wir lernen Ihre Anforderungen kennen und besprechen moegliche Loesungen.' }, { icon: 'Search', title: 'Analyse', description: 'Wir analysieren Ihre bestehende Infrastruktur und erstellen ein Konzept.' }, { icon: 'Settings', title: 'Einrichtung', description: 'Wir setzen die vereinbarten Loesungen um und schulen Ihre Mitarbeiter.' }, { icon: 'CheckCircle', title: 'Betrieb', description: 'Laufende Betreuung, Monitoring und kontinuierliche Optimierung.' }] }, settings: {}, isSystem: true },
  { name: 'Firmengeschichte', blockType: 'timeline', content: { sectionTitle: 'Unsere Geschichte', sectionSubtitle: 'Meilensteine unserer Entwicklung', items: [{ icon: 'Star', title: '2010 - Gruendung', description: 'Start als IT-Beratung mit 3 Mitarbeitern in Muenchen.' }, { icon: 'Users', title: '2014 - Wachstum', description: 'Erweiterung auf 15 Mitarbeiter und Eröffnung des zweiten Standorts.' }, { icon: 'Shield', title: '2018 - Security', description: 'Aufbau des Cybersecurity-Geschäftsbereichs und ISO 27001 Zertifizierung.' }, { icon: 'Cloud', title: '2021 - Cloud', description: 'Start der Cloud-Services und Partnerschaft mit Microsoft und AWS.' }, { icon: 'TrendingUp', title: '2025 - Heute', description: 'Ueber 45 Mitarbeiter, 3 Standorte und mehr als 350 betreute Kunden.' }] }, settings: {}, isSystem: true },
  { name: 'Projektvorgehen Beratung', blockType: 'timeline', content: { sectionTitle: 'Unser Beratungsansatz', items: [{ icon: 'Eye', title: 'Ist-Analyse', description: 'Erhebung des aktuellen Stands und Identifikation von Handlungsfeldern.' }, { icon: 'Lightbulb', title: 'Strategieentwicklung', description: 'Erarbeitung einer Roadmap mit priorisierten Massnahmen.' }, { icon: 'Code', title: 'Implementierung', description: 'Umsetzung der Massnahmen mit agilen Methoden und regelmaessigem Reporting.' }, { icon: 'TrendingUp', title: 'Erfolgskontrolle', description: 'Messung der Ergebnisse anhand definierter KPIs und kontinuierliche Verbesserung.' }] }, settings: {}, isSystem: true },

  // --- Pricing (1 neu) ---
  { name: 'Preise 2 Pakete', blockType: 'pricing', content: { sectionTitle: 'Unsere Pakete', sectionSubtitle: 'Transparent und fair', plans: [{ name: 'Business', price: '49€', period: 'Monat / Arbeitsplatz', description: 'Fuer kleine Unternehmen', features: ['Monitoring & Wartung', 'Helpdesk (Mo-Fr)', 'Monatliches Reporting', 'Patch-Management', 'Antivirus-Schutz'], buttonLabel: 'Jetzt starten', buttonHref: '#kontakt' }, { name: 'Business Pro', price: '89€', period: 'Monat / Arbeitsplatz', description: 'Fuer anspruchsvolle Unternehmen', features: ['Alles aus Business', '24/7 Support', 'Backup & Recovery', 'Firewall-Management', 'Quartals-Review vor Ort', 'Garantierte SLA'], buttonLabel: 'Jetzt starten', buttonHref: '#kontakt', highlighted: true }] }, settings: {}, isSystem: true },

  // --- Comparison (1 neu) ---
  { name: 'Vergleich Managed Services', blockType: 'comparison', content: { sectionTitle: 'Service-Vergleich', sectionSubtitle: 'Finden Sie das passende Paket', columns: [{ name: 'Basic' }, { name: 'Business', highlighted: true }, { name: 'Enterprise' }], rows: [{ feature: 'Monitoring', values: ['8/5', '24/7', '24/7'] }, { feature: 'Reaktionszeit', values: ['8h', '4h', '1h'] }, { feature: 'Helpdesk', values: ['E-Mail', 'Tel. & E-Mail', 'Dediziert'] }, { feature: 'Patch-Management', values: ['Quartalsweise', 'Monatlich', 'Woechentlich'] }, { feature: 'Backup', values: ['-', 'Taeglich', 'Stuendlich'] }, { feature: 'Firewall', values: ['-', 'Managed', 'Managed + WAF'] }, { feature: 'Reporting', values: ['Jaehrlich', 'Monatlich', 'Woechentlich'] }, { feature: 'Vor-Ort-Service', values: ['-', 'Quartalsweise', 'Monatlich'] }, { feature: 'Notfall-Service', values: ['-', 'Gegen Aufpreis', 'Inklusive'] }, { feature: 'Strategieberatung', values: ['-', '-', 'Inklusive'] }] }, settings: {}, isSystem: true },

  // --- Banner (3 neue) ---
  { name: 'Banner Aktion', blockType: 'banner', content: { text: 'Fruehjahrs-Aktion: 20% Rabatt auf alle Managed Services - nur noch bis Ende Maerz!', variant: 'default', icon: 'Zap', buttonLabel: 'Jetzt sichern', buttonHref: '#angebot', dismissible: true }, settings: {}, isSystem: true },
  { name: 'Banner Wartungshinweis', blockType: 'banner', content: { text: 'Geplante Wartung am 15.03.2025 von 02:00 - 06:00 Uhr. Einige Services koennten kurzzeitig nicht erreichbar sein.', variant: 'warning', icon: 'Clock', dismissible: true }, settings: {}, isSystem: true },
  { name: 'Banner Stellenanzeige', blockType: 'banner', content: { text: 'Wir suchen Verstaerkung! IT-Systemadministrator (m/w/d) in Vollzeit gesucht.', variant: 'default', icon: 'Users', buttonLabel: 'Zur Stellenanzeige', buttonHref: '/karriere', dismissible: true }, settings: {}, isSystem: true },

  // --- Divider (2 neue) ---
  { name: 'Trenner mit Label', blockType: 'divider', content: { style: 'solid', label: 'Mehr entdecken' }, settings: {}, isSystem: true },
  { name: 'Trenner Gepunktet', blockType: 'divider', content: { style: 'dots' }, settings: {}, isSystem: true },

  // --- Placeholder (1 neu) ---
  { name: 'Platzhalter Coming Soon', blockType: 'placeholder', content: { icon: 'Clock', title: 'Coming Soon', description: 'Dieser Bereich wird gerade fuer Sie vorbereitet. Schauen Sie bald wieder vorbei!' }, settings: {}, isSystem: true },

  // --- Contact Form ---
  { name: 'Kontaktformular Standard', blockType: 'contact-form', content: { interestTags: ['KI-Beratung', 'IT-Beratung', 'Cybersecurity', 'Managed Services'], submitLabel: 'Nachricht senden', successHeadline: 'Vielen Dank fuer Ihre Nachricht!', successMessage: 'Wir melden uns schnellstmoeglich bei Ihnen.', privacyUrl: '/datenschutz' }, settings: {}, isSystem: true },

  // --- Columns ---
  { name: '2 Spalten gleich', blockType: 'columns', content: { columns: 2, layout: 'equal', left: [{ blockType: 'text', content: { content: '## Linke Spalte\n\nInhalt hier einfuegen.' } }], right: [{ blockType: 'text', content: { content: '## Rechte Spalte\n\nInhalt hier einfuegen.' } }] }, settings: {}, isSystem: true },
  { name: '2 Spalten Formular rechts', blockType: 'columns', content: { columns: 2, layout: 'right-wide', left: [{ blockType: 'text', content: { content: '## Kontakt\n\n**E-Mail:** info@firma.de\n**Telefon:** +49 123 456 789\n\nMo-Fr 9:00 - 17:00 Uhr' } }], right: [{ blockType: 'contact-form', content: { submitLabel: 'Nachricht senden', privacyUrl: '/datenschutz' } }] }, settings: {}, isSystem: true },
  { name: '3 Spalten gleich', blockType: 'columns', content: { columns: 3, layout: 'equal', left: [{ blockType: 'text', content: { content: '### Spalte 1' } }], center: [{ blockType: 'text', content: { content: '### Spalte 2' } }], right: [{ blockType: 'text', content: { content: '### Spalte 3' } }] }, settings: {}, isSystem: true },
]

async function seedCmsBlockTemplates(db: ReturnType<typeof drizzle>) {
  const [{ total }] = await db.select({ total: count() }).from(cmsBlockTemplates)
  if (Number(total) > 0) {
    logger.info('CMS block templates already exist, skipping...')
    return 0
  }

  for (const tmpl of BLOCK_TEMPLATES) {
    await db.insert(cmsBlockTemplates).values({ ...tmpl })
  }
  logger.info(`Created ${BLOCK_TEMPLATES.length} CMS block templates`)
  return BLOCK_TEMPLATES.length
}

// ============================================
// Example Business Data
// ============================================
async function seedExampleBusinessData(db: ReturnType<typeof drizzle>, adminUserId: string) {
  // Check if companies already exist for this tenant
  const [{ total }] = await db.select({ total: count() }).from(companies)
  if (Number(total) > 0) {
    logger.info('Business data already exists, skipping...')
    return
  }

  // --- 1. Companies ---
  const companyData = [
    { name: 'TechVision GmbH', legalForm: 'GmbH', status: 'customer', industry: 'IT-Dienstleistungen', city: 'Muenchen', postalCode: '80331', street: 'Maximilianstrasse', houseNumber: '12', phone: '+49 89 12345678', email: 'info@techvision.de', website: 'https://techvision.de', employeeCount: 45 },
    { name: 'CloudFirst AG', legalForm: 'AG', status: 'prospect', industry: 'Cloud-Services', city: 'Berlin', postalCode: '10115', street: 'Friedrichstrasse', houseNumber: '88', phone: '+49 30 98765432', email: 'kontakt@cloudfirst.de', website: 'https://cloudfirst.de', employeeCount: 120 },
    { name: 'SecureNet Solutions GmbH', legalForm: 'GmbH', status: 'partner', industry: 'IT-Sicherheit', city: 'Hamburg', postalCode: '20095', street: 'Moenckebergstrasse', houseNumber: '5', phone: '+49 40 55566677', email: 'info@securenet.de', website: 'https://securenet.de', employeeCount: 30 },
    { name: 'Digital Manufaktur OHG', legalForm: 'OHG', status: 'customer', industry: 'Software-Entwicklung', city: 'Frankfurt', postalCode: '60311', street: 'Zeil', houseNumber: '42', phone: '+49 69 44455566', email: 'hello@digitalmanufaktur.de', website: 'https://digitalmanufaktur.de', employeeCount: 18 },
    { name: 'GreenEnergy Systems KG', legalForm: 'KG', status: 'prospect', industry: 'Erneuerbare Energien', city: 'Stuttgart', postalCode: '70173', street: 'Koenigstrasse', houseNumber: '28', phone: '+49 711 33344455', email: 'kontakt@greenenergy-systems.de', website: 'https://greenenergy-systems.de', employeeCount: 65 },
  ]

  const createdCompanies = []
  for (const c of companyData) {
    const [company] = await db.insert(companies).values({ ...c, country: 'DE', createdBy: adminUserId }).returning()
    createdCompanies.push(company)
  }
  logger.info(`Created ${createdCompanies.length} example companies`)

  const [techVision, cloudFirst, secureNet, digitalManufaktur, greenEnergy] = createdCompanies

  // --- 2. Persons ---
  const personData = [
    { companyId: techVision.id, salutation: 'Herr', firstName: 'Thomas', lastName: 'Mueller', jobTitle: 'Geschäftsfuehrer', email: 'mueller@techvision.de', phone: '+49 89 12345601', isPrimaryContact: true },
    { companyId: techVision.id, salutation: 'Frau', firstName: 'Sandra', lastName: 'Klein', jobTitle: 'IT-Leiterin', department: 'IT', email: 'klein@techvision.de', phone: '+49 89 12345602' },
    { companyId: cloudFirst.id, salutation: 'Herr', firstName: 'Andreas', lastName: 'Berger', jobTitle: 'CTO', department: 'Technik', email: 'berger@cloudfirst.de', phone: '+49 30 98765401', isPrimaryContact: true },
    { companyId: cloudFirst.id, salutation: 'Frau', firstName: 'Lisa', lastName: 'Hoffmann', jobTitle: 'Einkaufsleiterin', department: 'Einkauf', email: 'hoffmann@cloudfirst.de', phone: '+49 30 98765402' },
    { companyId: secureNet.id, salutation: 'Herr', firstName: 'Michael', lastName: 'Wagner', jobTitle: 'CISO', department: 'Security', email: 'wagner@securenet.de', phone: '+49 40 55566601', isPrimaryContact: true },
    { companyId: digitalManufaktur.id, salutation: 'Frau', firstName: 'Julia', lastName: 'Schneider', jobTitle: 'Geschäftsfuehrerin', email: 'schneider@digitalmanufaktur.de', phone: '+49 69 44455501', isPrimaryContact: true },
    { companyId: digitalManufaktur.id, salutation: 'Herr', firstName: 'Markus', lastName: 'Weber', jobTitle: 'Projektleiter', department: 'Entwicklung', email: 'weber@digitalmanufaktur.de', phone: '+49 69 44455502' },
    { companyId: greenEnergy.id, salutation: 'Frau', firstName: 'Petra', lastName: 'Fischer', jobTitle: 'Geschäftsentwicklung', department: 'Business Development', email: 'fischer@greenenergy-systems.de', phone: '+49 711 33344401', isPrimaryContact: true },
  ]

  const createdPersons = []
  for (const p of personData) {
    const [person] = await db.insert(persons).values({ ...p, status: 'active', createdBy: adminUserId }).returning()
    createdPersons.push(person)
  }
  logger.info(`Created ${createdPersons.length} example persons`)

  const [, , berger, , wagner, schneider, , fischer] = createdPersons

  // --- 3. Leads ---
  const leadData = [
    { title: 'Website-Relaunch', source: 'website', status: 'new', score: 45, companyId: cloudFirst.id, personId: berger.id, contactFirstName: 'Andreas', contactLastName: 'Berger', contactCompany: 'CloudFirst AG', contactEmail: 'berger@cloudfirst.de' },
    { title: 'Security-Audit DIN SPEC', source: 'referral', status: 'contacted', score: 70, companyId: secureNet.id, personId: wagner.id, contactFirstName: 'Michael', contactLastName: 'Wagner', contactCompany: 'SecureNet Solutions GmbH', contactEmail: 'wagner@securenet.de' },
    { title: 'ERP-Integration', source: 'direct', status: 'qualified', score: 85, companyId: techVision.id, personId: createdPersons[0].id, contactFirstName: 'Thomas', contactLastName: 'Mueller', contactCompany: 'TechVision GmbH', contactEmail: 'mueller@techvision.de' },
    { title: 'Cloud-Migration', source: 'website', status: 'proposal', score: 60, companyId: digitalManufaktur.id, personId: schneider.id, contactFirstName: 'Julia', contactLastName: 'Schneider', contactCompany: 'Digital Manufaktur OHG', contactEmail: 'schneider@digitalmanufaktur.de' },
    { title: 'IoT-Dashboard', source: 'event', status: 'new', score: 30, companyId: greenEnergy.id, personId: fischer.id, contactFirstName: 'Petra', contactLastName: 'Fischer', contactCompany: 'GreenEnergy Systems KG', contactEmail: 'fischer@greenenergy-systems.de' },
  ]

  const createdLeads = []
  for (const l of leadData) {
    const [lead] = await db.insert(leads).values({ ...l, assignedTo: adminUserId }).returning()
    createdLeads.push(lead)
  }
  logger.info(`Created ${createdLeads.length} example leads`)

  // --- 4. Products ---
  // Look up existing categories
  const existingCategories = await db.select().from(productCategories)
  const catMap = Object.fromEntries(existingCategories.map(c => [c.slug, c.id]))

  const productData = [
    { type: 'service', name: 'IT-Beratung Stunde', description: 'Individuelle IT-Beratung durch erfahrene Consultants. Analyse, Konzeption und Strategieentwicklung.', priceNet: '150.00', unit: 'Stunde', categoryId: catMap['it-dienstleistungen'] || null, sku: 'SRV-001' },
    { type: 'service', name: 'Security-Audit Paket', description: 'Umfassendes IT-Sicherheitsaudit nach DIN SPEC 27076 inkl. Bericht und Handlungsempfehlungen.', priceNet: '2500.00', unit: 'Paket', categoryId: catMap['security'] || null, sku: 'SRV-002' },
    { type: 'service', name: 'Cloud-Migration Paket', description: 'Komplettpaket für die Migration Ihrer IT-Infrastruktur in die Cloud. Planung, Durchfuehrung und Nachbetreuung.', priceNet: '5000.00', unit: 'Paket', categoryId: catMap['cloud-services'] || null, sku: 'SRV-003' },
    { type: 'product', name: 'Managed Firewall', description: 'Vollstaendig verwaltete Firewall-Loesung inkl. Monitoring, Updates und 24/7-Support.', priceNet: '89.00', unit: 'Monat', categoryId: catMap['security'] || null, sku: 'PRD-001' },
    { type: 'product', name: 'SSL-Zertifikat Enterprise', description: 'Extended Validation SSL-Zertifikat fuer maximale Vertrauenswuerdigkeit und Sicherheit.', priceNet: '299.00', unit: 'Jahr', categoryId: catMap['security'] || null, sku: 'PRD-002' },
    { type: 'product', name: 'Backup-Loesung Pro', description: 'Automatische Cloud-Backup-Loesung mit Versionierung, Verschluesselung und schneller Wiederherstellung.', priceNet: '49.00', unit: 'Monat', categoryId: catMap['cloud-services'] || null, sku: 'PRD-003' },
  ]

  for (const p of productData) {
    await db.insert(products).values({ ...p, status: 'active', vatRate: '19.00', createdBy: adminUserId })
  }
  logger.info(`Created ${productData.length} example products`)

  // --- 5. Activities ---
  const activityData = [
    { type: 'email', subject: 'Erstkontakt: Website-Relaunch', content: 'Erste E-Mail an CloudFirst AG bezueglich Website-Relaunch gesendet. Interesse an modernem Design und CMS-Integration.', leadId: createdLeads[0].id, companyId: cloudFirst.id, personId: berger.id },
    { type: 'call', subject: 'Telefonat: Security-Audit Anforderungen', content: 'Ausfuehrliches Telefonat mit Michael Wagner (SecureNet) ueber die Anforderungen für den Security-Audit nach DIN SPEC 27076. Termin fuer Vor-Ort-Begehung vereinbart.', leadId: createdLeads[1].id, companyId: secureNet.id, personId: wagner.id },
    { type: 'meeting', subject: 'Meeting: ERP-Integration Anforderungsanalyse', content: 'Vor-Ort-Meeting bei TechVision GmbH. Bestehende Systeme dokumentiert, Schnittstellen identifiziert. Naechster Schritt: Technisches Konzept erstellen.', leadId: createdLeads[2].id, companyId: techVision.id, personId: createdPersons[0].id },
    { type: 'email', subject: 'Angebot: Cloud-Migration', content: 'Detailliertes Angebot für die Cloud-Migration an Digital Manufaktur OHG gesendet. Umfang: 3 Server, 2 Datenbanken, 5 Anwendungen.', leadId: createdLeads[3].id, companyId: digitalManufaktur.id, personId: schneider.id },
    { type: 'note', subject: 'Notiz: IoT-Dashboard Potenzial', content: 'GreenEnergy Systems hat grosses Interesse an einem IoT-Dashboard für die Ueberwachung ihrer Solaranlagen. Potenzialwert mittel-hoch, aber Entscheidungsprozess dauert voraussichtlich 3-6 Monate.', leadId: createdLeads[4].id, companyId: greenEnergy.id, personId: fischer.id },
  ]

  for (const a of activityData) {
    await db.insert(activities).values({ ...a, userId: adminUserId })
  }
  logger.info(`Created ${activityData.length} example activities`)
}

async function seedCheck() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, { ssl: getSslConfig() })
  const db = drizzle(client)

  // Check if ANY tenant exists (post-tenant-removal: we don't care about slug)
  // If any tenant exists, use it. Only seed a new tenant if DB is completely empty.
  const existingTenants = await db
    .select()
    .from(tenants)
    .limit(1)

  let
  let adminUserId: string | null = null

  if (existingTenants.length > 0) {
    logger.info('Tenant already exists, skipping tenant/user seed...')
    tenantId = existingTenants[0].id

    // Find admin user for blog authorship
    const [adminUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, SEED_DATA.user.email)))
      .limit(1)
    adminUserId = adminUser?.id ?? null
  } else {
    logger.info('Seeding database...')

    // 1. Create Tenant (first-run only — empty DB)
    const [tenant] = await db
      .insert(tenants)
      .values(SEED_DATA.tenant)
      .returning()

    tenantId = tenant.id
    logger.info(`Created tenant: ${tenant.name} (${tenant.slug})`)

    // 2. Create Admin User
    const passwordHash = await bcrypt.hash(SEED_DATA.user.password, 10)
    const [user] = await db
      .insert(users)
      .values({
        email: SEED_DATA.user.email,
        passwordHash,
        firstName: SEED_DATA.user.firstName,
        lastName: SEED_DATA.user.lastName,
        role: SEED_DATA.user.role,
      })
      .returning()

    adminUserId = user.id
    logger.info(`Created user: ${user.email} (${user.role})`)
  }

  // 3. Seed CMS pages (always check, even for existing tenants)
  const cmsCreated = await seedCmsPages(db)
  if (cmsCreated > 0) {
    logger.info(`Created ${cmsCreated} CMS pages`)
  } else {
    logger.info('CMS pages already exist, skipping...')
  }

  // 4. Seed CMS navigation
  await seedNavigation(db)

  // 5. Seed blog posts
  if (adminUserId) {
    await seedBlogPosts(db, adminUserId)
  }

  // 6. Seed AI prompt templates
  await seedAiPromptTemplates(db)

  // 7. Seed product categories
  await seedProductCategories(db)

  // 8. Seed DIN SPEC 27076 data (requirements + grants)
  await seedDinData(db)

  // 9. Seed WiBA data (checklists + prueffragen)
  await seedWibaData(db)

  // 10. Seed auditor role
  await seedAuditorRole(db)

  // 11. Seed example business data (companies, persons, leads, products, activities)
  if (adminUserId) {
    await seedExampleBusinessData(db, adminUserId)
  }

  // 12. Seed CMS block type definitions (global, no tenant)
  await seedCmsBlockTypeDefinitions(db)

  // 13. Seed CMS block templates (global)
  await seedCmsBlockTemplates(db)

  // 14. Seed Management Framework (VTO, Rocks, Scorecard, Issues, OKRs, SOPs)
  await seedManagementFramework()

  // 15. Seed Deliverable Catalog (16 Module + 70 Deliverables)
  await seedDeliverableCatalog(TENANT_ID)

  // 16. Seed SOP Catalog (alle SOPs aus Framework v2)
  await seedSopCatalog(TENANT_ID)

  logger.info('Seed check completed!', { module: 'SeedCheck' })
  logger.info(`Login: ${SEED_DATA.user.email} / ${SEED_DATA.user.password}`, { module: 'SeedCheck' })

  await client.end()
}

seedCheck().catch((error) => {
  logger.error('Seed check failed', error, { module: 'SeedCheck' })
  process.exit(1)
})
