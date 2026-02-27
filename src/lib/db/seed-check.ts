import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { tenants, users, cmsPages, cmsBlocks, cmsNavigationItems, blogPosts, aiPromptTemplates, productCategories, dinRequirements, dinGrants, roles, rolePermissions } from './schema'
import { eq, and, count } from 'drizzle-orm'
import { requirementsSeedData } from './seeds/din-requirements.seed'
import { grantsSeedData } from './seeds/din-grants.seed'
import { DEFAULT_ROLE_PERMISSIONS, MODULES } from '../types/permissions'

const SEED_DATA = {
  tenant: {
    name: 'Default Organisation',
    slug: 'default',
    status: 'active',
  },
  user: {
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
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
      { blockType: 'placeholder', sortOrder: 0, content: { icon: 'Shield', title: 'Cyber Security', description: 'Schuetzen Sie Ihr Unternehmen vor digitalen Bedrohungen mit unseren umfassenden Sicherheitsloesungen.' } },
    ],
  },
  {
    slug: '/ki-automation',
    title: 'KI & Automation',
    status: 'published',
    blocks: [
      { blockType: 'placeholder', sortOrder: 0, content: { icon: 'Bot', title: 'KI & Automation', description: 'Nutzen Sie die Kraft kuenstlicher Intelligenz, um Ihre Geschaeftsprozesse zu automatisieren und zu optimieren.' } },
    ],
  },
  {
    slug: '/it-consulting',
    title: 'IT Consulting',
    status: 'published',
    blocks: [
      { blockType: 'placeholder', sortOrder: 0, content: { icon: 'Monitor', title: 'IT Consulting', description: 'Strategische IT-Beratung fuer die digitale Transformation Ihres Unternehmens.' } },
    ],
  },
  {
    slug: '/agb',
    title: 'Allgemeine Geschaeftsbedingungen',
    status: 'published',
    blocks: [
      { blockType: 'heading', sortOrder: 0, content: { text: 'Allgemeine Geschaeftsbedingungen', level: 1 } },
      { blockType: 'text', sortOrder: 1, content: { content: '## § 1 Geltungsbereich\n\nDiese Allgemeinen Geschaeftsbedingungen (AGB) gelten fuer alle Vertraege ueber die Nutzung der XKMU Business OS Plattform, die zwischen dem Betreiber und den Nutzern geschlossen werden.\n\n## § 2 Vertragsgegenstand\n\nDer Betreiber stellt dem Nutzer eine cloudbasierte Business-Management-Plattform zur Verfuegung. Die konkreten Leistungen ergeben sich aus der Leistungsbeschreibung und dem gewaehlten Tarif.\n\n## § 3 Vertragsschluss und Registrierung\n\n(1) Der Vertragsschluss erfolgt durch die Registrierung auf der Plattform.\n(2) Der Nutzer muss bei der Registrierung wahrheitsgemaesse Angaben machen.\n(3) Der Nutzer erhaelt nach erfolgreicher Registrierung eine Bestaetigungs-E-Mail.\n\n## § 4 Nutzungsrechte\n\n(1) Der Nutzer erhaelt ein nicht-exklusives, zeitlich auf die Vertragslaufzeit beschraenktes Recht zur Nutzung der Software.\n(2) Eine Weitergabe der Zugangsdaten an Dritte ist nicht gestattet.\n(3) Der Nutzer darf die Software nicht reverse engineeren oder modifizieren.\n\n## § 5 Datenschutz\n\nDer Betreiber verpflichtet sich zur Einhaltung der geltenden Datenschutzbestimmungen, insbesondere der DSGVO. Weitere Informationen finden Sie in unserer Datenschutzerklaerung.' }, settings: { maxWidth: 768 } },
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
      { blockType: 'text', sortOrder: 1, content: { content: '## 1. Datenschutz auf einen Blick\n\n### Allgemeine Hinweise\n\nDie folgenden Hinweise geben einen einfachen Ueberblick darueber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.\n\n### Datenerfassung auf dieser Website\n\n**Wer ist verantwortlich fuer die Datenerfassung auf dieser Website?**\nDie Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten koennen Sie dem Impressum dieser Website entnehmen.\n\n## 2. Hosting\n\nWir hosten die Inhalte unserer Website bei folgendem Anbieter:\n\n### Externes Hosting\n\nDiese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert.\n\n## 3. Allgemeine Hinweise und Pflichtinformationen\n\n### Datenschutz\n\nDie Betreiber dieser Seiten nehmen den Schutz Ihrer persoenlichen Daten sehr ernst.\n\n## 4. Datenerfassung auf dieser Website\n\n### Cookies\n\nUnsere Internetseiten verwenden Cookies. Cookies sind kleine Textdateien und richten auf Ihrem Endgeraet keinen Schaden an.\n\n## 5. Ihre Rechte\n\nSie haben jederzeit das Recht:\n- Auskunft ueber Ihre bei uns gespeicherten personenbezogenen Daten zu verlangen\n- die Berichtigung, Loeschung oder Einschraenkung der Verarbeitung zu verlangen\n- der Verarbeitung zu widersprechen\n- die Datenuebertragbarkeit zu verlangen\n- eine erteilte Einwilligung zu widerrufen' }, settings: { maxWidth: 768 } },
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

async function seedCmsPages(db: ReturnType<typeof drizzle>, tenantId: string) {
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
    console.log(`Created ${requirementsSeedData.length} DIN SPEC 27076 requirements`)
    seeded = true
  }

  // Seed Grants
  const [{ total: grantCount }] = await db.select({ total: count() }).from(dinGrants)
  if (Number(grantCount) === 0) {
    await db.insert(dinGrants).values(grantsSeedData)
    console.log(`Created ${grantsSeedData.length} Foerderprogramme`)
    seeded = true
  }

  if (!seeded) {
    console.log('DIN SPEC data already exists, skipping...')
  }
}

async function seedAuditorRole(db: ReturnType<typeof drizzle>, tenantId: string) {
  const auditorConfig = DEFAULT_ROLE_PERMISSIONS['auditor']
  if (!auditorConfig) return

  // Check if role already exists for this tenant
  const [existing] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.name, 'auditor')))
    .limit(1)

  if (existing) {
    console.log('Auditor role already exists, skipping...')
    return
  }

  const [role] = await db
    .insert(roles)
    .values({
      tenantId,
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
  console.log(`Created auditor role with ${permissionRows.length} permissions`)
}

// ============================================
// Navigation Seed Data
// ============================================
const NAVIGATION_ITEMS = [
  // Header
  { location: 'header', label: 'Cyber Security', href: '/cyber-security', sortOrder: 0 },
  { location: 'header', label: 'KI & Automation', href: '/ki-automation', sortOrder: 1 },
  { location: 'header', label: 'IT Consulting', href: '/it-consulting', sortOrder: 2 },
  { location: 'header', label: 'IT-News', href: '/it-news', sortOrder: 3 },
  // Footer
  { location: 'footer', label: 'Kostenlos starten', href: '/intern/register', sortOrder: 0 },
  { location: 'footer', label: 'API-Dokumentation', href: '/api-docs', sortOrder: 1 },
  { location: 'footer', label: 'Impressum', href: '/impressum', sortOrder: 2 },
  { location: 'footer', label: 'Kontakt', href: '/kontakt', sortOrder: 3 },
  { location: 'footer', label: 'AGB', href: '/agb', sortOrder: 4 },
  { location: 'footer', label: 'Datenschutz', href: '/datenschutz', sortOrder: 5 },
]

async function seedNavigation(db: ReturnType<typeof drizzle>, tenantId: string) {
  const [{ total }] = await db.select({ total: count() }).from(cmsNavigationItems).where(eq(cmsNavigationItems.tenantId, tenantId))
  if (Number(total) > 0) {
    console.log('Navigation already exists, skipping...')
    return 0
  }

  const items = NAVIGATION_ITEMS.map((item) => ({
    tenantId,
    location: item.location,
    label: item.label,
    href: item.href,
    sortOrder: item.sortOrder,
    openInNewTab: false,
    isVisible: true,
  }))

  await db.insert(cmsNavigationItems).values(items)
  console.log(`Created ${items.length} navigation items`)
  return items.length
}

// ============================================
// Blog Seed Data
// ============================================
const BLOG_POSTS = [
  {
    title: 'Willkommen bei XKMU Business OS',
    slug: 'willkommen-bei-xkmu-business-os',
    excerpt: 'Erfahren Sie, wie XKMU Business OS Ihre Geschaeftsprozesse vereinfacht und automatisiert.',
    content: `# Willkommen bei XKMU Business OS

XKMU Business OS ist eine moderne, mandantenfaehige Business-Management-Plattform, die speziell fuer kleine und mittelstaendische Unternehmen entwickelt wurde.

## Was bietet XKMU Business OS?

### CRM & Kontaktmanagement
Verwalten Sie Ihre Firmen- und Personenkontakte zentral. Mit strukturierter Datenhaltung, vollstaendiger Historie und KI-gestuetzter Recherche.

### Lead-Management
Vom ersten Kontakt bis zum Abschluss – verfolgen Sie Ihre Leads durch die gesamte Sales Pipeline mit Scoring und automatischen Workflows.

### KI-Integration
Nutzen Sie kuenstliche Intelligenz fuer automatische Recherche, Content-Erstellung, SEO-Optimierung und intelligente Geschaeftsanalysen.

### Angebote & Rechnungen
Erstellen Sie professionelle Angebote und Rechnungen mit automatischer Nummernvergabe und Status-Workflows.

### Blog & CMS
Veroeffentlichen Sie Inhalte auf Ihrer Website mit dem integrierten Block-basierten CMS und Blog-System.

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

Der Mensch ist oft das schwaechste Glied. Schulen Sie Ihre Mitarbeiter regelmaessig zu Phishing-Erkennung, sicherem Umgang mit E-Mails und dem Melden verdaechtiger Aktivitaeten.

## 5. DIN SPEC 27076 Audit durchfuehren

Der standardisierte IT-Sicherheitscheck nach DIN SPEC 27076 gibt Ihnen einen klaren Ueberblick ueber den Stand Ihrer IT-Sicherheit und zeigt konkrete Handlungsfelder auf.

## Fazit

IT-Sicherheit muss nicht teuer oder kompliziert sein. Mit diesen fuenf Massnahmen legen Sie eine solide Grundlage fuer den Schutz Ihres Unternehmens.`,
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

Kuenstliche Intelligenz (KI) ist laengst kein Zukunftsthema mehr. Auch kleine und mittelstaendische Unternehmen koennen heute von KI profitieren – ohne Millionenbudgets.

## Automatische Kundenrecherche

KI kann oeffentlich verfuegbare Informationen zu potenziellen Kunden sammeln und strukturieren. Das spart Vertriebsmitarbeitern wertvolle Zeit bei der Lead-Qualifizierung.

## Content-Erstellung

Blog-Beitraege, Social-Media-Posts und Newsletter-Texte lassen sich mit KI-Unterstuetzung deutlich schneller erstellen. Die KI liefert Entwuerfe, die der Mensch verfeinert.

## Dokumentenanalyse

Geschaeftsberichte, Vertraege und andere Dokumente koennen per KI analysiert werden. Relevante Kennzahlen und Informationen werden automatisch extrahiert.

## SEO-Optimierung

KI generiert passende Meta-Titel, Beschreibungen und Keywords fuer Webseiten und Blog-Beitraege – basierend auf dem vorhandenen Inhalt.

## Personalisierte Ansprache

Ob E-Mail, LinkedIn-Nachricht oder Telefonleitfaden: KI hilft bei der Erstellung personalisierter Outreach-Texte fuer jeden Lead.

## Einstieg leicht gemacht

Mit XKMU Business OS koennen Sie direkt loslegen. Die Plattform integriert verschiedene KI-Anbieter (Gemini, OpenAI, Ollama u.a.) und bietet anpassbare Prompt-Vorlagen fuer alle Anwendungsfaelle.`,
    category: 'KI & Automation',
    tags: ['KI', 'Mittelstand', 'Automation', 'Digitalisierung'],
    status: 'published',
    seoTitle: 'KI im Mittelstand: Praktische Anwendungsfaelle fuer KMU',
    seoDescription: 'Wie kleine und mittelstaendische Unternehmen kuenstliche Intelligenz praktisch einsetzen koennen – von Kundenrecherche bis Content-Erstellung.',
    seoKeywords: 'KI, Mittelstand, KMU, Automation, kuenstliche Intelligenz, Digitalisierung',
  },
]

async function seedBlogPosts(db: ReturnType<typeof drizzle>, tenantId: string, authorId: string) {
  const [{ total }] = await db.select({ total: count() }).from(blogPosts).where(eq(blogPosts.tenantId, tenantId))
  if (Number(total) > 0) {
    console.log('Blog posts already exist, skipping...')
    return 0
  }

  let created = 0
  for (const post of BLOG_POSTS) {
    await db.insert(blogPosts).values({
      tenantId,
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
  console.log(`Created ${created} blog posts`)
  return created
}

// ============================================
// AI Prompt Templates Seed Data
// ============================================
const AI_PROMPT_TEMPLATES = [
  { slug: 'lead_research', name: 'Lead-Recherche', description: 'Analysiert Lead-Informationen und erstellt einen strukturierten Bericht.' },
  { slug: 'company_research', name: 'Firmen-Recherche', description: 'Recherchiert Informationen zu einer Firma aus dem Web.' },
  { slug: 'person_research', name: 'Personen-Recherche', description: 'Recherchiert Informationen zu einer Kontaktperson.' },
  { slug: 'outreach_email', name: 'Outreach E-Mail', description: 'Generiert personalisierte Kontaktaufnahme-E-Mails.' },
  { slug: 'outreach_linkedin', name: 'Outreach LinkedIn', description: 'Generiert LinkedIn-Nachrichten fuer die Kontaktaufnahme.' },
  { slug: 'blog_generate', name: 'Blog-Beitrag generieren', description: 'Erstellt komplette Blog-Beitraege aus Thema und Keywords.' },
  { slug: 'blog_seo', name: 'Blog SEO', description: 'Generiert SEO-Metadaten fuer Blog-Beitraege.' },
  { slug: 'cms_seo', name: 'CMS SEO', description: 'Generiert SEO-Metadaten fuer CMS-Seiten.' },
  { slug: 'social_media_generate', name: 'Social Media Post', description: 'Generiert Social-Media-Posts fuer verschiedene Plattformen.' },
  { slug: 'social_media_improve', name: 'Social Media verbessern', description: 'Verbessert bestehende Social-Media-Posts.' },
  { slug: 'social_media_plan', name: 'Content-Plan', description: 'Erstellt einen Redaktionsplan fuer Social Media.' },
  { slug: 'marketing_tasks', name: 'Marketing-Aufgaben', description: 'Generiert Aufgabenlisten fuer Marketing-Kampagnen.' },
  { slug: 'document_analysis', name: 'Dokumentenanalyse', description: 'Analysiert PDF-Dokumente und extrahiert Geschaeftsdaten.' },
  { slug: 'idea_evaluation', name: 'Ideen-Bewertung', description: 'Bewertet Geschaeftsideen und gibt Empfehlungen.' },
]

async function seedAiPromptTemplates(db: ReturnType<typeof drizzle>, tenantId: string) {
  const [{ total }] = await db.select({ total: count() }).from(aiPromptTemplates).where(eq(aiPromptTemplates.tenantId, tenantId))
  if (Number(total) > 0) {
    console.log('AI prompt templates already exist, skipping...')
    return 0
  }

  let created = 0
  for (const tmpl of AI_PROMPT_TEMPLATES) {
    await db.insert(aiPromptTemplates).values({
      tenantId,
      slug: tmpl.slug,
      name: tmpl.name,
      description: tmpl.description,
      systemPrompt: '',
      userPrompt: '',
      outputFormat: '',
      isActive: true,
    })
    created++
  }
  console.log(`Created ${created} AI prompt templates`)
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

async function seedProductCategories(db: ReturnType<typeof drizzle>, tenantId: string) {
  const [{ total }] = await db.select({ total: count() }).from(productCategories).where(eq(productCategories.tenantId, tenantId))
  if (Number(total) > 0) {
    console.log('Product categories already exist, skipping...')
    return 0
  }

  let created = 0
  for (const cat of PRODUCT_CATEGORIES) {
    await db.insert(productCategories).values({
      tenantId,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
    })
    created++
  }
  console.log(`Created ${created} product categories`)
  return created
}

async function seedCheck() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, { ssl: getSslConfig() })
  const db = drizzle(client)

  // Check if default tenant already exists
  const existingTenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'default'))
    .limit(1)

  let tenantId: string
  let adminUserId: string | null = null

  if (existingTenant.length > 0) {
    console.log('Tenant already exists, skipping tenant/user seed...')
    tenantId = existingTenant[0].id

    // Find admin user for blog authorship
    const [adminUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, SEED_DATA.user.email)))
      .limit(1)
    adminUserId = adminUser?.id ?? null
  } else {
    console.log('Seeding database...')

    // 1. Create Tenant
    const [tenant] = await db
      .insert(tenants)
      .values(SEED_DATA.tenant)
      .returning()

    tenantId = tenant.id
    console.log(`Created tenant: ${tenant.name} (${tenant.slug})`)

    // 2. Create Admin User
    const passwordHash = await bcrypt.hash(SEED_DATA.user.password, 10)
    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: SEED_DATA.user.email,
        passwordHash,
        firstName: SEED_DATA.user.firstName,
        lastName: SEED_DATA.user.lastName,
        role: SEED_DATA.user.role,
      })
      .returning()

    adminUserId = user.id
    console.log(`Created user: ${user.email} (${user.role})`)
  }

  // 3. Seed CMS pages (always check, even for existing tenants)
  const cmsCreated = await seedCmsPages(db, tenantId)
  if (cmsCreated > 0) {
    console.log(`Created ${cmsCreated} CMS pages`)
  } else {
    console.log('CMS pages already exist, skipping...')
  }

  // 4. Seed CMS navigation
  await seedNavigation(db, tenantId)

  // 5. Seed blog posts
  if (adminUserId) {
    await seedBlogPosts(db, tenantId, adminUserId)
  }

  // 6. Seed AI prompt templates
  await seedAiPromptTemplates(db, tenantId)

  // 7. Seed product categories
  await seedProductCategories(db, tenantId)

  // 8. Seed DIN SPEC 27076 data (requirements + grants)
  await seedDinData(db)

  // 9. Seed auditor role
  await seedAuditorRole(db, tenantId)

  console.log('')
  console.log('='.repeat(50))
  console.log('Seed check completed!')
  console.log('='.repeat(50))
  console.log('')
  console.log('Login credentials:')
  console.log(`  Email:    ${SEED_DATA.user.email}`)
  console.log(`  Password: ${SEED_DATA.user.password}`)
  console.log('')

  await client.end()
}

seedCheck().catch((error) => {
  console.error('Seed check failed:', error)
  process.exit(1)
})
