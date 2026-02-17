import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { tenants, users, cmsPages, cmsBlocks, dinRequirements, dinGrants, roles, rolePermissions } from './schema'
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

  if (existingTenant.length > 0) {
    console.log('Tenant already exists, skipping tenant/user seed...')
    tenantId = existingTenant[0].id
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

    console.log(`Created user: ${user.email} (${user.role})`)
  }

  // 3. Seed CMS pages (always check, even for existing tenants)
  const cmsCreated = await seedCmsPages(db, tenantId)
  if (cmsCreated > 0) {
    console.log(`Created ${cmsCreated} CMS pages`)
  } else {
    console.log('CMS pages already exist, skipping...')
  }

  // 4. Seed DIN SPEC 27076 data (requirements + grants)
  await seedDinData(db)

  // 5. Seed auditor role
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
