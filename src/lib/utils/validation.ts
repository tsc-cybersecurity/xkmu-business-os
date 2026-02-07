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
// Tenant Schemas
// ============================================
export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
})

export const updateTenantSchema = createTenantSchema.partial()

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
  description: z.string().max(500).optional().or(z.literal('')),
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
  description: z.string().max(500).optional().or(z.literal('')),
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
  legalForm: z.string().max(50).optional().or(z.literal('')),
  street: z.string().max(255).optional().or(z.literal('')),
  houseNumber: z.string().max(20).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(2).default('DE'),
  phone: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().max(255).optional().or(z.literal('')),
  industry: z.string().max(100).optional().or(z.literal('')),
  employeeCount: z.number().int().min(0).nullable().optional(),
  annualRevenue: z.number().min(0).nullable().optional(),
  vatId: z.string().max(50).optional().or(z.literal('')),
  status: companyStatusSchema.default('prospect'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal('')),
  customFields: z.record(z.string(), z.unknown()).default({}),
})

export const updateCompanySchema = createCompanySchema.partial()

// ============================================
// Person Schemas
// ============================================
export const personStatusSchema = z.enum(['active', 'inactive', 'do_not_contact'])

export const createPersonSchema = z.object({
  companyId: uuidSchema.nullable().optional(),
  salutation: z.string().max(20).optional().or(z.literal('')),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  mobile: z.string().max(50).optional().or(z.literal('')),
  jobTitle: z.string().max(100).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
  street: z.string().max(255).optional().or(z.literal('')),
  houseNumber: z.string().max(20).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(2).default('DE'),
  status: personStatusSchema.default('active'),
  isPrimaryContact: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal('')),
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

export const leadSourceSchema = z.enum(['api', 'form', 'import', 'manual', 'idea'])

export const createLeadSchema = z.object({
  companyId: uuidSchema.nullable().optional(),
  personId: uuidSchema.nullable().optional(),
  title: z.string().max(255).optional().or(z.literal('')),
  source: leadSourceSchema,
  sourceDetail: z.string().max(255).optional().or(z.literal('')),
  status: leadStatusSchema.default('new'),
  score: z.number().int().min(0).max(100).default(0),
  assignedTo: uuidSchema.nullable().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal('')),
  rawData: z.record(z.string(), z.unknown()).optional(),
})

export const updateLeadSchema = createLeadSchema.partial()

// ============================================
// Product Category Schemas
// ============================================
export const createProductCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().or(z.literal('')),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateProductCategorySchema = createProductCategorySchema.partial()

// ============================================
// Product Schemas
// ============================================
export const productTypeSchema = z.enum(['product', 'service'])
export const productStatusSchema = z.enum(['active', 'inactive', 'draft'])

export const createProductSchema = z.object({
  type: productTypeSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional().or(z.literal('')),
  sku: z.string().max(50).optional().or(z.literal('')),
  categoryId: uuidSchema.nullable().optional(),
  priceNet: z.number().min(0).nullable().optional(),
  vatRate: z.number().min(0).max(100).default(19),
  unit: z.string().max(30).default('Stück'),
  status: productStatusSchema.default('active'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal('')),
  customFields: z.record(z.string(), z.unknown()).default({}),
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
  subject: z.string().max(255).optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
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
  url: z.string().url('Ungültige URL').max(500),
  events: z.array(webhookEventSchema).min(1, 'Mindestens ein Event erforderlich'),
  secret: z.string().max(255).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

export const updateWebhookSchema = createWebhookSchema.partial()

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

export function formatZodErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }))
}
