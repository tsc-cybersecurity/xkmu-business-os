import { db } from '@/lib/db'
import { cmsBlockTypeDefinitions } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import type { CmsBlockTypeDefinition, NewCmsBlockTypeDefinition } from '@/lib/db/schema'

const BLOCK_TYPE_DEFAULTS: Array<Omit<NewCmsBlockTypeDefinition, 'id' | 'createdAt'>> = [
  {
    slug: 'hero',
    name: 'Hero',
    description: 'Grosser Einleitungsbereich mit Bild, Headline und CTA-Buttons',
    icon: 'LayoutTemplate',
    category: 'content',
    fields: ['headline', 'headlineHighlight', 'subheadline', 'buttons', 'stats'],
    defaultContent: { headline: 'Willkommen', headlineHighlight: 'auf unserer Seite', subheadline: 'Beschreibungstext hier...', buttons: [{ label: 'Mehr erfahren', href: '#', variant: 'default' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 0,
  },
  {
    slug: 'features',
    name: 'Features',
    description: 'Feature-Grid mit Icons, Titeln und Beschreibungen',
    icon: 'Star',
    category: 'content',
    fields: ['sectionTitle', 'sectionSubtitle', 'columns', 'items'],
    defaultContent: { sectionTitle: 'Unsere Features', sectionSubtitle: 'Was wir bieten', columns: 3, items: [{ icon: 'Star', title: 'Feature 1', description: 'Beschreibung' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: 'cta',
    name: 'Call-to-Action',
    description: 'Call-to-Action Bereich mit Headline, Beschreibung und Buttons',
    icon: 'MousePointerClick',
    category: 'content',
    fields: ['headline', 'description', 'buttons', 'highlights'],
    defaultContent: { headline: 'Bereit loszulegen?', description: 'Kontaktieren Sie uns noch heute.', buttons: [{ label: 'Kontakt', href: '#', variant: 'default' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 2,
  },
  {
    slug: 'text',
    name: 'Text',
    description: 'Freitext-Block mit Markdown-Unterstuetzung',
    icon: 'Type',
    category: 'content',
    fields: ['content', 'alignment'],
    defaultContent: { content: 'Hier steht Ihr **Text** mit _Markdown_-Formatierung.', alignment: 'left' },
    defaultSettings: {},
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: 'heading',
    name: 'Ueberschrift',
    description: 'Ueberschrift mit optionalem Untertitel',
    icon: 'Heading',
    category: 'content',
    fields: ['text', 'level', 'subtitle'],
    defaultContent: { text: 'Ueberschrift', level: 2, subtitle: 'Optionaler Untertitel' },
    defaultSettings: {},
    isActive: true,
    sortOrder: 4,
  },
  {
    slug: 'image',
    name: 'Bild',
    description: 'Einzelbild mit Alt-Text und optionaler Bildunterschrift',
    icon: 'ImageIcon',
    category: 'media',
    fields: ['src', 'alt', 'caption', 'width'],
    defaultContent: { src: '', alt: 'Beispielbild', caption: 'Bildunterschrift', width: 'container' },
    defaultSettings: {},
    isActive: true,
    sortOrder: 5,
  },
  {
    slug: 'cards',
    name: 'Karten',
    description: 'Karten-Grid mit Icons, Titeln und Beschreibungen',
    icon: 'SquareStack',
    category: 'content',
    fields: ['columns', 'items'],
    defaultContent: { columns: 3, items: [{ icon: 'Box', title: 'Karte 1', description: 'Beschreibung', link: '' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 6,
  },
  {
    slug: 'testimonials',
    name: 'Referenzen',
    description: 'Kundenstimmen und Referenzen mit Bewertungen',
    icon: 'MessageSquareQuote',
    category: 'content',
    fields: ['sectionTitle', 'columns', 'items'],
    defaultContent: { sectionTitle: 'Was unsere Kunden sagen', columns: 2, items: [{ name: 'Max Mustermann', role: 'CEO', company: 'Beispiel GmbH', quote: 'Hervorragende Zusammenarbeit und erstklassige Ergebnisse.', rating: 5 }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 7,
  },
  {
    slug: 'pricing',
    name: 'Preistabelle',
    description: 'Preistabelle mit Paketen, Features und CTA-Buttons',
    icon: 'CreditCard',
    category: 'interactive',
    fields: ['sectionTitle', 'plans'],
    defaultContent: { sectionTitle: 'Unsere Pakete', plans: [{ name: 'Starter', price: '29€', period: 'Monat', description: 'Fuer Einsteiger', features: ['Feature 1', 'Feature 2'], buttonLabel: 'Waehlen', buttonHref: '#' }, { name: 'Professional', price: '79€', period: 'Monat', description: 'Fuer Profis', features: ['Alles aus Starter', 'Feature 3', 'Feature 4'], buttonLabel: 'Waehlen', buttonHref: '#', highlighted: true }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 8,
  },
  {
    slug: 'faq',
    name: 'FAQ',
    description: 'Haeufige Fragen als aufklappbares Akkordeon',
    icon: 'HelpCircle',
    category: 'interactive',
    fields: ['sectionTitle', 'items'],
    defaultContent: { sectionTitle: 'Haeufige Fragen', items: [{ question: 'Wie kann ich starten?', answer: 'Registrieren Sie sich einfach und legen Sie los.' }, { question: 'Gibt es eine Testphase?', answer: 'Ja, Sie koennen unseren Service 14 Tage kostenlos testen.' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 9,
  },
  {
    slug: 'stats',
    name: 'Kennzahlen',
    description: 'Kennzahlen und Statistiken als grosse Zahlenwerte',
    icon: 'BarChart3',
    category: 'content',
    fields: ['sectionTitle', 'columns', 'variant', 'items'],
    defaultContent: { sectionTitle: 'In Zahlen', columns: 4, variant: 'cards', items: [{ value: '500+', label: 'Kunden' }, { value: '99.9%', label: 'Uptime' }, { value: '24/7', label: 'Support' }, { value: '50+', label: 'Integrationen' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 10,
  },
  {
    slug: 'team',
    name: 'Team',
    description: 'Teammitglieder mit Foto, Rolle und Bio',
    icon: 'Users',
    category: 'content',
    fields: ['sectionTitle', 'columns', 'items'],
    defaultContent: { sectionTitle: 'Unser Team', columns: 3, items: [{ name: 'Anna Schmidt', role: 'Geschaeftsfuehrung', bio: 'Ueber 15 Jahre Erfahrung.' }, { name: 'Tom Mueller', role: 'Technik', bio: 'Full-Stack Entwickler.' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 11,
  },
  {
    slug: 'timeline',
    name: 'Zeitleiste',
    description: 'Vertikale Zeitleiste fuer Prozesse oder Geschichte',
    icon: 'GitBranch',
    category: 'content',
    fields: ['sectionTitle', 'items'],
    defaultContent: { sectionTitle: 'So funktioniert es', items: [{ icon: 'Search', title: 'Schritt 1: Analyse', description: 'Wir analysieren Ihre Anforderungen.' }, { icon: 'Settings', title: 'Schritt 2: Umsetzung', description: 'Wir setzen die Loesung um.' }, { icon: 'CheckCircle', title: 'Schritt 3: Launch', description: 'Wir gehen gemeinsam live.' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 12,
  },
  {
    slug: 'logocloud',
    name: 'Logo-Cloud',
    description: 'Logo-Leiste fuer Partner, Kunden oder Technologien',
    icon: 'Building2',
    category: 'content',
    fields: ['sectionTitle', 'items'],
    defaultContent: { sectionTitle: 'Unsere Partner', items: [{ name: 'Partner 1' }, { name: 'Partner 2' }, { name: 'Partner 3' }, { name: 'Partner 4' }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 13,
  },
  {
    slug: 'video',
    name: 'Video',
    description: 'Video-Einbettung (YouTube, Vimeo oder direkt)',
    icon: 'Play',
    category: 'media',
    fields: ['src', 'title', 'caption', 'width', 'aspectRatio'],
    defaultContent: { src: '', title: 'Video', caption: '', width: 'container', aspectRatio: '16:9' },
    defaultSettings: {},
    isActive: true,
    sortOrder: 14,
  },
  {
    slug: 'gallery',
    name: 'Galerie',
    description: 'Bildergalerie mit Lightbox und optionalen Bildunterschriften',
    icon: 'GalleryHorizontalEnd',
    category: 'media',
    fields: ['sectionTitle', 'columns', 'items'],
    defaultContent: { sectionTitle: 'Galerie', columns: 3, items: [] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 15,
  },
  {
    slug: 'banner',
    name: 'Banner',
    description: 'Ankuendigungs-Banner mit Icon, Text und optionalem Button',
    icon: 'Megaphone',
    category: 'content',
    fields: ['text', 'variant', 'icon', 'buttonLabel', 'buttonHref'],
    defaultContent: { text: 'Wichtige Ankuendigung: Neues Update verfuegbar!', variant: 'brand', icon: 'Megaphone', buttonLabel: 'Mehr erfahren', buttonHref: '#' },
    defaultSettings: {},
    isActive: true,
    sortOrder: 16,
  },
  {
    slug: 'divider',
    name: 'Trenner',
    description: 'Visueller Trenner zwischen Sektionen',
    icon: 'Minus',
    category: 'layout',
    fields: ['style', 'label'],
    defaultContent: { style: 'gradient', label: '' },
    defaultSettings: {},
    isActive: true,
    sortOrder: 17,
  },
  {
    slug: 'comparison',
    name: 'Vergleich',
    description: 'Vergleichstabelle fuer Features oder Pakete',
    icon: 'Table2',
    category: 'interactive',
    fields: ['sectionTitle', 'columns', 'rows'],
    defaultContent: { sectionTitle: 'Funktionsvergleich', columns: [{ name: 'Starter', highlighted: false }, { name: 'Professional', highlighted: true }], rows: [{ feature: 'Benutzer', values: ['1', 'Unbegrenzt'] }, { feature: 'Support', values: ['E-Mail', 'Prioritaet'] }, { feature: 'API-Zugang', values: ['nein', 'ja'] }] },
    defaultSettings: {},
    isActive: true,
    sortOrder: 18,
  },
  {
    slug: 'placeholder',
    name: 'Platzhalter',
    description: 'Platzhalter-Block fuer zukuenftige Inhalte',
    icon: 'Box',
    category: 'layout',
    fields: ['icon', 'title', 'description'],
    defaultContent: { icon: 'Box', title: 'Platzhalter', description: 'Dieser Bereich wird bald gefuellt.' },
    defaultSettings: {},
    isActive: true,
    sortOrder: 19,
  },
]

export const CmsBlockTypeService = {
  async list(): Promise<CmsBlockTypeDefinition[]> {
    return db
      .select()
      .from(cmsBlockTypeDefinitions)
      .where(eq(cmsBlockTypeDefinitions.isActive, true))
      .orderBy(asc(cmsBlockTypeDefinitions.sortOrder))
  },

  async getBySlug(slug: string): Promise<CmsBlockTypeDefinition | null> {
    const [result] = await db
      .select()
      .from(cmsBlockTypeDefinitions)
      .where(eq(cmsBlockTypeDefinitions.slug, slug))
      .limit(1)
    return result || null
  },

  async seedDefaults(): Promise<number> {
    let seeded = 0
    for (const def of BLOCK_TYPE_DEFAULTS) {
      const existing = await this.getBySlug(def.slug!)
      if (!existing) {
        await db.insert(cmsBlockTypeDefinitions).values(def)
        seeded++
      }
    }
    return seeded
  },

  async update(id: string, data: Partial<Pick<CmsBlockTypeDefinition, 'name' | 'description' | 'icon' | 'category' | 'fields' | 'defaultContent' | 'defaultSettings' | 'isActive' | 'sortOrder'>>): Promise<CmsBlockTypeDefinition | null> {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.category !== undefined) updateData.category = data.category
    if (data.fields !== undefined) updateData.fields = data.fields
    if (data.defaultContent !== undefined) updateData.defaultContent = data.defaultContent
    if (data.defaultSettings !== undefined) updateData.defaultSettings = data.defaultSettings
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    const [result] = await db
      .update(cmsBlockTypeDefinitions)
      .set(updateData)
      .where(eq(cmsBlockTypeDefinitions.id, id))
      .returning()
    return result || null
  },
}
