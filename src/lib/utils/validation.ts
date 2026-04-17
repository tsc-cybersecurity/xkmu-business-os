import { z } from 'zod'

// ============================================
// Common Schemas
// ============================================
export const uuidSchema = z.string().uuid()

export const emailSchema = z.string().email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ============================================
// User Schemas
// ============================================
export const userRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer'])
export const userStatusSchema = z.enum(['active', 'inactive', 'pending'])

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  role: userRoleSchema.default('member'),
})

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
  newPassword: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),
  companyName: z.string().min(1, 'Firmenname ist erforderlich').max(255),
})

// ============================================
// Role Schemas
// ============================================
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name ist erforderlich')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Nur Kleinbuchstaben, Zahlen und Unterstriche'),
  displayName: z.string().min(1, 'Anzeigename ist erforderlich').max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  permissions: z.array(
    z.object({
      module: z.string(),
      canCreate: z.boolean(),
      canRead: z.boolean(),
      canUpdate: z.boolean(),
      canDelete: z.boolean(),
    })
  ),
})

export const updateRoleSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  permissions: z
    .array(
      z.object({
        module: z.string(),
        canCreate: z.boolean(),
        canRead: z.boolean(),
        canUpdate: z.boolean(),
        canDelete: z.boolean(),
      })
    )
    .optional(),
})

// ============================================
// Company Schemas
// ============================================
export const companyStatusSchema = z.enum([
  'prospect',
  'lead',
  'customer',
  'partner',
  'churned',
  'inactive',
])

export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  legalForm: z.string().max(50).optional().or(z.literal("")),
  street: z.string().max(255).optional().or(z.literal("")),
  houseNumber: z.string().max(20).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(2).default('DE'),
  phone: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().max(255).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  employeeCount: z.number().int().min(0).nullable().optional(),
  annualRevenue: z.number().min(0).nullable().optional(),
  vatId: z.string().max(50).optional().or(z.literal("")),
  status: companyStatusSchema.default('prospect'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal("")),
  customFields: z.record(z.string(), z.unknown()).default({}),
})

export const updateCompanySchema = createCompanySchema.partial()

// ============================================
// Person Schemas
// ============================================
export const personStatusSchema = z.enum(['active', 'inactive', 'do_not_contact'])

export const createPersonSchema = z.object({
  companyId: uuidSchema.nullable().optional(),
  salutation: z.string().max(20).optional().or(z.literal("")),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  mobile: z.string().max(50).optional().or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  street: z.string().max(255).optional().or(z.literal("")),
  houseNumber: z.string().max(20).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(2).default('DE'),
  status: personStatusSchema.default('active'),
  isPrimaryContact: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal("")),
  customFields: z.record(z.string(), z.unknown()).default({}),
})

export const updatePersonSchema = createPersonSchema.partial()

// ============================================
// Lead Schemas
// ============================================
export const leadStatusSchema = z.enum([
  'new',
  'qualifying',
  'qualified',
  'contacted',
  'meeting_scheduled',
  'proposal_sent',
  'won',
  'lost',
])

export const leadSourceSchema = z.enum(['api', 'form', 'import', 'manual', 'idea', 'website', 'google_maps'])

export const createLeadSchema = z.object({
  companyId: uuidSchema.nullable().optional(),
  personId: uuidSchema.nullable().optional(),
  title: z.string().max(255).optional().or(z.literal("")),
  source: leadSourceSchema,
  sourceDetail: z.string().max(255).optional().or(z.literal("")),
  status: leadStatusSchema.default('new'),
  score: z.number().int().min(0).max(100).optional(),
  assignedTo: uuidSchema.nullable().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal("")),
  rawData: z.record(z.string(), z.unknown()).optional(),
})

export const updateLeadSchema = createLeadSchema.partial()

// ============================================
// Contact Form Schema (Public Website)
// ============================================
export const contactFormSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  company: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email('Gültige E-Mail-Adresse erforderlich'),
  interests: z.array(z.string()).min(1, 'Bitte wählen Sie mindestens ein Interesse'),
  message: z.string().min(1, 'Nachricht ist erforderlich'),
  privacyAccepted: z.literal(true, 'Datenschutzbestimmungen müssen akzeptiert werden'),
})

// ============================================
// Product Category Schemas
// ============================================
export const createProductCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().or(z.literal("")),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateProductCategorySchema = createProductCategorySchema.partial()

// ============================================
// Product Schemas
// ============================================
export const productTypeSchema = z.enum(['product', 'service'])
export const productStatusSchema = z.enum(['active', 'inactive', 'draft'])

const productImageSchema = z.object({
  url: z.string().max(500),
  alt: z.string().max(255).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).optional(),
})

const productDimensionsSchema = z.object({
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  unit: z.enum(['cm', 'mm', 'm']).default('cm'),
})

export const createProductSchema = z.object({
  type: productTypeSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional().or(z.literal("")),
  sku: z.string().max(50).optional().or(z.literal("")),
  categoryId: uuidSchema.nullable().optional(),
  priceNet: z.number().min(0).nullable().optional(),
  vatRate: z.number().min(0).max(100).default(19),
  unit: z.string().max(30).default('Stück'),
  status: productStatusSchema.default('active'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal("")),
  customFields: z.record(z.string(), z.unknown()).default({}),
  // Web & SEO
  isPublic: z.boolean().default(false),
  isHighlight: z.boolean().default(false),
  shortDescription: z.string().optional().or(z.literal("")),
  slug: z.string().max(255).optional().or(z.literal("")),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(160).optional().or(z.literal("")),
  // Media
  images: z.array(productImageSchema).default([]),
  // Logistics
  weight: z.number().min(0).nullable().optional(),
  dimensions: productDimensionsSchema.nullable().optional(),
  manufacturer: z.string().max(255).optional().or(z.literal("")),
  ean: z.string().max(13).optional().or(z.literal("")),
  minOrderQuantity: z.number().int().min(1).default(1),
  deliveryTime: z.string().max(100).optional().or(z.literal("")),
})

export const updateProductSchema = createProductSchema.partial()

// ============================================
// Idea Schemas
// ============================================
export const ideaTypeSchema = z.enum(['text', 'voice'])
export const ideaStatusSchema = z.enum(['backlog', 'in_progress', 'converted'])

export const createIdeaSchema = z.object({
  rawContent: z.string().min(1, 'Inhalt ist erforderlich'),
  type: ideaTypeSchema.default('text'),
  status: ideaStatusSchema.default('backlog'),
  tags: z.array(z.string()).default([]),
})

export const updateIdeaSchema = z.object({
  rawContent: z.string().min(1).optional(),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  type: ideaTypeSchema.optional(),
  status: ideaStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
})

export const convertIdeaSchema = z.object({
  createLead: z.boolean().default(true),
  createCompany: z.boolean().default(false),
})

// ============================================
// Activity Schemas
// ============================================
export const activityTypeSchema = z.enum(['email', 'call', 'note', 'meeting', 'ai_outreach'])

export const createActivitySchema = z.object({
  leadId: uuidSchema.nullable().optional(),
  companyId: uuidSchema.nullable().optional(),
  personId: uuidSchema.nullable().optional(),
  type: activityTypeSchema,
  subject: z.string().max(255).optional().or(z.literal("")),
  content: z.string().optional().or(z.literal("")),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const updateActivitySchema = createActivitySchema.partial()

// ============================================
// Webhook Schemas
// ============================================
export const webhookEventSchema = z.enum([
  'lead.created',
  'lead.status_changed',
  'lead.won',
  'lead.lost',
  'research.completed',
  'idea.converted',
  'company.created',
])

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  url: z.string().max(500).transform(v => {
    if (v && !v.startsWith('http://') && !v.startsWith('https://')) {
      return `https://${v}`
    }
    return v
  }).pipe(z.string().url('Ungültige URL')),
  events: z.array(webhookEventSchema).min(1, 'Mindestens ein Event erforderlich'),
  secret: z.string().max(255).optional().or(z.literal("")).transform(v => v || undefined),
  isActive: z.boolean().default(true),
})

export const updateWebhookSchema = createWebhookSchema.partial()

// ============================================
// Document Schemas (Rechnungen & Angebote)
// ============================================
export const documentTypeSchema = z.enum(['invoice', 'offer', 'contract'])
export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
export const offerStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired'])
export const contractStatusSchema = z.enum(['draft', 'sent', 'signed', 'active', 'terminated', 'expired', 'rejected'])
export const discountTypeSchema = z.enum(['percent', 'fixed'])

export const createDocumentSchema = z.object({
  type: documentTypeSchema,
  number: z.string().max(50).optional().or(z.literal("")),
  companyId: uuidSchema.nullable().optional(),
  contactPersonId: uuidSchema.nullable().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  validUntil: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  paymentTerms: z.string().max(255).optional().or(z.literal("")),
  discount: z.number().min(0).nullable().optional(),
  discountType: discountTypeSchema.nullable().optional(),
  // Customer address snapshot (auto-filled from company, but can be overridden)
  customerName: z.string().max(255).optional().or(z.literal("")),
  customerStreet: z.string().max(255).optional().or(z.literal("")),
  customerHouseNumber: z.string().max(20).optional().or(z.literal("")),
  customerPostalCode: z.string().max(20).optional().or(z.literal("")),
  customerCity: z.string().max(100).optional().or(z.literal("")),
  customerCountry: z.string().max(2).optional().or(z.literal("")),
  customerVatId: z.string().max(50).optional().or(z.literal("")),
})

export const updateDocumentSchema = createDocumentSchema.partial()

export const createDocumentItemSchema = z.object({
  productId: uuidSchema.nullable().optional(),
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  description: z.string().optional().or(z.literal("")),
  quantity: z.number().min(0).default(1),
  unit: z.string().max(30).default('Stück'),
  unitPrice: z.number().min(0).default(0),
  vatRate: z.number().min(0).max(100).default(19),
  discount: z.number().min(0).nullable().optional(),
  discountType: discountTypeSchema.nullable().optional(),
})

export const updateDocumentItemSchema = createDocumentItemSchema.partial()

export const updateDocumentStatusSchema = z.object({
  status: z.string().min(1),
})

export const createContractSchema = createDocumentSchema.extend({
  type: z.literal('contract'),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional().or(z.literal("")),
  contractRenewalType: z.enum(['none', 'manual', 'auto']).default('none'),
  contractRenewalPeriod: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  contractNoticePeriodDays: z.number().min(0).optional(),
  contractTemplateId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  contractBodyHtml: z.string().optional().or(z.literal("")),
})

export const updateContractSchema = createContractSchema.partial()

// ============================================
// CMS Page Schemas
// ============================================
export const cmsPageStatusSchema = z.enum(['draft', 'published'])

export const createCmsPageSchema = z.object({
  slug: z.string().min(1, 'Slug ist erforderlich').max(255).regex(/^\/[a-z0-9\-\/]*$/, 'Slug muss mit / beginnen und darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  title: z.string().min(1, 'Titel ist erforderlich').max(255),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(160).optional().or(z.literal("")),
  seoKeywords: z.string().max(255).optional().or(z.literal("")),
  ogImage: z.string().max(500).optional().or(z.literal("")),
  status: cmsPageStatusSchema.default('draft'),
})

export const updateCmsPageSchema = createCmsPageSchema.partial()

// ============================================
// CMS Block Schemas
// ============================================
export const cmsBlockTypeSchema = z.string().min(1).max(50)

export const createCmsBlockSchema = z.object({
  blockType: cmsBlockTypeSchema,
  sortOrder: z.number().int().min(0).default(0),
  content: z.record(z.string(), z.unknown()).default({}),
  settings: z.record(z.string(), z.unknown()).default({}),
  isVisible: z.boolean().default(true),
})

export const updateCmsBlockSchema = z.object({
  blockType: cmsBlockTypeSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  isVisible: z.boolean().optional(),
})

export const reorderCmsBlocksSchema = z.object({
  blockIds: z.array(z.string().uuid()).min(1, 'Mindestens ein Block erforderlich'),
})

// ============================================
// CMS Navigation Schemas
// ============================================
export const cmsNavigationLocationSchema = z.enum(['header', 'footer'])

export const createCmsNavigationItemSchema = z.object({
  location: cmsNavigationLocationSchema,
  label: z.string().min(1, 'Label ist erforderlich').max(100),
  href: z.string().min(1, 'Link ist erforderlich').max(500),
  pageId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  openInNewTab: z.boolean().default(false),
  isVisible: z.boolean().default(true),
})

export const updateCmsNavigationItemSchema = createCmsNavigationItemSchema.partial()

export const reorderCmsNavigationItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, 'Mindestens ein Item erforderlich'),
})

// ============================================
// Blog Post Schemas
// ============================================
export const blogPostStatusSchema = z.enum(['draft', 'published', 'archived'])
export const blogPostSourceSchema = z.enum(['manual', 'ai', 'api'])

export const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(255),
  slug: z.string().max(255).optional().or(z.literal("")),
  excerpt: z.string().optional().or(z.literal("")),
  content: z.string().optional().or(z.literal("")),
  featuredImage: z.string().max(500).optional().or(z.literal("")),
  featuredImageAlt: z.string().max(255).optional().or(z.literal("")),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(160).optional().or(z.literal("")),
  seoKeywords: z.string().max(255).optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  category: z.string().max(100).optional().or(z.literal("")),
  status: blogPostStatusSchema.default('draft'),
  source: blogPostSourceSchema.default('manual'),
})

export const updateBlogPostSchema = createBlogPostSchema.partial()

export const generateBlogPostSchema = z.object({
  topic: z.string().min(1, 'Thema ist erforderlich').max(500),
  language: z.enum(['de', 'en']).default('de'),
  tone: z.enum(['professional', 'casual', 'technical']).default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
})

// ============================================
// Business Intelligence Schemas
// ============================================
export const businessDocumentUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(1),
})

// ============================================
// Marketing Campaign Schemas
// ============================================
export const campaignTypeSchema = z.enum(['email', 'call', 'sms', 'multi'])
export const campaignStatusSchema = z.enum(['draft', 'active', 'paused', 'completed', 'archived'])

export const createMarketingCampaignSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  description: z.string().optional().or(z.literal("")),
  type: campaignTypeSchema,
  status: campaignStatusSchema.default('draft'),
  targetAudience: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  settings: z.record(z.string(), z.unknown()).default({}),
})

export const updateMarketingCampaignSchema = createMarketingCampaignSchema.partial()

export const marketingTaskTypeSchema = z.enum(['email', 'call', 'sms'])
export const marketingTaskStatusSchema = z.enum(['draft', 'scheduled', 'sent', 'failed'])

export const createMarketingTaskSchema = z.object({
  type: marketingTaskTypeSchema,
  recipientEmail: z.string().email().optional().or(z.literal("")),
  recipientName: z.string().max(255).optional().or(z.literal("")),
  recipientCompany: z.string().max(255).optional().or(z.literal("")),
  personId: uuidSchema.nullable().optional(),
  companyId: uuidSchema.nullable().optional(),
  subject: z.string().max(255).optional().or(z.literal("")),
  content: z.string().optional().or(z.literal("")),
  scheduledAt: z.string().optional().or(z.literal("")),
  status: marketingTaskStatusSchema.default('draft'),
})

export const updateMarketingTaskSchema = createMarketingTaskSchema.partial()

export const createMarketingTemplateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  type: marketingTaskTypeSchema,
  subject: z.string().max(255).optional().or(z.literal("")),
  content: z.string().min(1, 'Inhalt ist erforderlich'),
  isDefault: z.boolean().default(false),
})

export const updateMarketingTemplateSchema = createMarketingTemplateSchema.partial()

export const generateMarketingContentSchema = z.object({
  type: marketingTaskTypeSchema,
  recipientIds: z.array(uuidSchema).optional(),
  tone: z.enum(['professional', 'casual', 'persuasive']).default('professional'),
  language: z.enum(['de', 'en']).default('de'),
  context: z.string().optional().or(z.literal("")),
})

// ============================================
// Social Media Schemas
// ============================================
export const socialPlatformSchema = z.enum(['linkedin', 'twitter', 'instagram', 'facebook', 'xing'])
export const socialPostStatusSchema = z.enum(['draft', 'scheduled', 'posted', 'failed'])

export const createSocialMediaTopicSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  description: z.string().optional().or(z.literal("")),
  color: z.string().max(7).default('#3b82f6'),
})

export const updateSocialMediaTopicSchema = createSocialMediaTopicSchema.partial()

export const createSocialMediaPostSchema = z.object({
  topicId: uuidSchema.nullable().optional(),
  platform: socialPlatformSchema,
  title: z.string().max(255).optional().or(z.literal("")),
  content: z.string().min(1, 'Inhalt ist erforderlich'),
  hashtags: z.array(z.string()).default([]),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  scheduledAt: z.string().optional().or(z.literal("")),
  status: socialPostStatusSchema.default('draft'),
})

export const updateSocialMediaPostSchema = createSocialMediaPostSchema.partial()

export const generateSocialPostSchema = z.object({
  platform: socialPlatformSchema,
  topicId: uuidSchema.nullable().optional(),
  topic: z.string().min(1, 'Thema ist erforderlich').max(500),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational']).default('professional'),
  language: z.enum(['de', 'en']).default('de'),
  includeHashtags: z.boolean().default(true),
  includeEmoji: z.boolean().default(true),
})

export const generateContentPlanSchema = z.object({
  platforms: z.array(socialPlatformSchema).min(1, 'Mindestens eine Plattform'),
  topicIds: z.array(uuidSchema).optional(),
  topics: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(30).default(7),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational']).default('professional'),
  language: z.enum(['de', 'en']).default('de'),
})

export const improveSocialPostSchema = z.object({
  instructions: z.string().min(1, 'Anweisungen erforderlich').max(500),
})

export const generateTopicsSchema = z.object({
  count: z.number().int().min(1).max(20).default(5),
})

// ============================================
// Opportunity Schemas
// ============================================
export const opportunityStatusSchema = z.enum(['new', 'contacted', 'qualified', 'rejected', 'converted'])

export const searchOpportunitiesSchema = z.object({
  queries: z.string().min(1, 'Mindestens eine Branche angeben'),
  locations: z.string().min(1, 'Mindestens ein Ort angeben'),
  radius: z.coerce.number().min(1).max(100).default(25),
  maxPerLocation: z.coerce.number().min(1).max(60).default(20),
})

export const updateOpportunitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  industry: z.string().max(255).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  city: z.string().max(255).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(10).optional().or(z.literal("")),
  phone: z.string().max(100).optional().or(z.literal("")),
  email: z.string().max(255).optional().or(z.literal("")),
  website: z.string().max(500).optional().or(z.literal("")),
  status: opportunityStatusSchema.optional(),
  notes: z.string().optional().or(z.literal("")),
})

// ============================================
// Cockpit System Schemas
// ============================================
export const cockpitSystemSchema = z.object({
  name: z.string().min(1).max(255),
  hostname: z.string().max(500).optional().or(z.literal("")),
  url: z.string().max(500).optional().or(z.literal("")),
  category: z.string().max(100).optional().or(z.literal("")),
  function: z.string().max(255).optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  ipAddress: z.string().max(45).optional().or(z.literal("")),
  port: z.coerce.number().min(1).max(65535).optional().nullable(),
  protocol: z.string().max(20).optional().or(z.literal("")),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().or(z.literal("")),
})

export const updateCockpitSystemSchema = cockpitSystemSchema.partial()

export const cockpitCredentialSchema = z.object({
  type: z.enum(['login', 'api_key', 'ssh_key', 'certificate', 'token', 'database', 'ftp', 'other']),
  label: z.string().min(1).max(255),
  username: z.string().max(255).optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
})

export const updateCockpitCredentialSchema = cockpitCredentialSchema.partial()

// ============================================
// Helper Functions
// ============================================
export function validateAndParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

// ============================================
// Processes (Prozesshandbuch)
// ============================================
export const createProcessSchema = z.object({
  key: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  description: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().optional(),
})

export const updateProcessSchema = createProcessSchema.partial()

export const createProcessTaskSchema = z.object({
  taskKey: z.string().min(1).max(20),
  subprocess: z.string().max(255).optional().or(z.literal("")),
  title: z.string().min(1).max(255),
  purpose: z.string().optional().or(z.literal("")),
  trigger: z.string().optional().or(z.literal("")),
  timeEstimate: z.string().max(50).optional().or(z.literal("")),
  automationPotential: z.enum(['Hoch', 'Mittel', 'Niedrig']).optional(),
  tools: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  steps: z.array(z.object({
    nr: z.union([z.number(), z.string()]),
    action: z.string(),
    tool: z.string().optional(),
    hint: z.string().optional(),
  })).default([]),
  checklist: z.array(z.string()).default([]),
  expectedOutput: z.string().optional().or(z.literal("")),
  errorEscalation: z.string().optional().or(z.literal("")),
  solution: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().optional(),
  appStatus: z.enum(['none', 'partial', 'full']).optional(),
  appNotes: z.string().optional().or(z.literal("")),
  appModule: z.string().max(100).optional().nullable(),
  devRequirements: z.array(z.object({
    tool: z.string(),
    neededFunction: z.string(),
    approach: z.string(),
    effort: z.string(),
    priority: z.string(),
  })).optional(),
})

export const updateProcessTaskSchema = createProcessTaskSchema.partial()

export function formatZodErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }))
}
