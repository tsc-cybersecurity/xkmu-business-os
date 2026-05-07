import { pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  bigint,
  decimal,
  numeric,
  real,
  inet,
  index,
  uniqueIndex,
  unique,
  serial,
  smallint,
  char,
  time,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ============================================
// Organization (singleton — this app serves one organization)
// ============================================
export const organization = pgTable('organization', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  // Adresse
  street: varchar('street', { length: 255 }),
  houseNumber: varchar('house_number', { length: 20 }),
  postalCode: varchar('postal_code', { length: 20 }),
  city: varchar('city', { length: 255 }),
  country: varchar('country', { length: 10 }).default('DE'),
  // Rechtliches
  legalForm: varchar('legal_form', { length: 100 }),
  managingDirector: varchar('managing_director', { length: 255 }),
  tradeRegister: varchar('trade_register', { length: 255 }),
  vatId: varchar('vat_id', { length: 50 }),
  taxNumber: varchar('tax_number', { length: 50 }),
  // Bankverbindungen
  bankName1: varchar('bank_name_1', { length: 255 }),
  bankIban1: varchar('bank_iban_1', { length: 40 }),
  bankBic1: varchar('bank_bic_1', { length: 20 }),
  bankName2: varchar('bank_name_2', { length: 255 }),
  bankIban2: varchar('bank_iban_2', { length: 40 }),
  bankBic2: varchar('bank_bic_2', { length: 20 }),
  // Kontakt
  phone: varchar('phone', { length: 100 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 500 }),
  // System
  settings: jsonb('settings').default({}),
  status: varchar('status', { length: 20 }).default('active'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_organization_slug').on(table.slug),
  index('idx_organization_status').on(table.status),
])

export const organizationRelations = relations(organization, ({ many }) => ({
  users: many(users),
  roles: many(roles),
  companies: many(companies),
  persons: many(persons),
  leads: many(leads),
  apiKeys: many(apiKeys),
  productCategories: many(productCategories),
  products: many(products),
  aiProviders: many(aiProviders),
  aiLogs: many(aiLogs),
  aiPromptTemplates: many(aiPromptTemplates),
  ideas: many(ideas),
  activities: many(activities),
  webhooks: many(webhooks),
  documents: many(documents),
  documentItems: many(documentItems),
  dinAuditSessions: many(dinAuditSessions),
  dinAnswers: many(dinAnswers),
  wibaAuditSessions: many(wibaAuditSessions),
  wibaAnswers: many(wibaAnswers),
  mediaUploads: many(mediaUploads),
  companyResearches: many(companyResearches),
  firecrawlResearches: many(firecrawlResearches),
  businessDocuments: many(businessDocuments),
  businessProfiles: many(businessProfiles),
  marketingCampaigns: many(marketingCampaigns),
  marketingTasks: many(marketingTasks),
  marketingTemplates: many(marketingTemplates),
  socialMediaTopics: many(socialMediaTopics),
  socialMediaPosts: many(socialMediaPosts),
  n8nConnections: many(n8nConnections),
  n8nWorkflowLogs: many(n8nWorkflowLogs),
  opportunities: many(opportunities),
  chatConversations: many(chatConversations),
  cockpitSystems: many(cockpitSystems),
}))

// ============================================
// Roles
// ============================================
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const rolesRelations = relations(roles, ({ one, many }) => ({
  permissions: many(rolePermissions),
  users: many(users),
}))

// ============================================
// Role Permissions (Berechtigungen pro Rolle)
// ============================================
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  module: varchar('module', { length: 50 }).notNull(),
  canCreate: boolean('can_create').default(false),
  canRead: boolean('can_read').default(false),
  canUpdate: boolean('can_update').default(false),
  canDelete: boolean('can_delete').default(false),
}, (table) => [
  index('idx_role_permissions_role_id').on(table.roleId),
  index('idx_role_permissions_module').on(table.roleId, table.module),
])

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
}))

// ============================================
// Users
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('member'),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
  // AnyPgColumn thunk required: users is declared before companies, and
  // companies.createdBy → users creates a circular type inference.
  companyId: uuid('company_id').references((): AnyPgColumn => companies.id, { onDelete: 'set null' }),
  inviteToken: varchar('invite_token', { length: 64 }),
  inviteTokenExpiresAt: timestamp('invite_token_expires_at', { withTimezone: true }),
  firstLoginAt: timestamp('first_login_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Terminbuchung Phase 1
  bookingSlug: varchar('booking_slug', { length: 60 }).unique(),
  bookingPageActive: boolean('booking_page_active').notNull().default(false),
  bookingPageTitle: varchar('booking_page_title', { length: 255 }),
  bookingPageSubtitle: varchar('booking_page_subtitle', { length: 255 }),
  bookingPageIntro: text('booking_page_intro'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Europe/Berlin'),
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_company_id').on(table.companyId),
  index('idx_users_invite_token').on(table.inviteToken),
])

export const usersRelations = relations(users, ({ one, many }) => ({
  userRole: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  createdCompanies: many(companies),
  createdPersons: many(persons),
  assignedLeads: many(leads),
  apiKeys: many(apiKeys),
  calendarAccounts: many(userCalendarAccounts),
}))

// ============================================
// API Keys
// ============================================
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 10 }).notNull(),
  permissions: jsonb('permissions').default(['read', 'write']),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_api_keys_key_prefix').on(table.keyPrefix),
])

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}))

// ============================================
// Companies
// ============================================
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  legalForm: varchar('legal_form', { length: 50 }),
  // Address
  street: varchar('street', { length: 255 }),
  houseNumber: varchar('house_number', { length: 20 }),
  postalCode: varchar('postal_code', { length: 20 }),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 2 }).default('DE'),
  // Contact
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  // Business Info
  industry: varchar('industry', { length: 100 }),
  employeeCount: integer('employee_count'),
  annualRevenue: decimal('annual_revenue', { precision: 15, scale: 2 }),
  vatId: varchar('vat_id', { length: 50 }),
  // Status & Classification
  status: varchar('status', { length: 30 }).default('prospect'),
  tags: text('tags').array().default([]),
  // Metadata
  notes: text('notes'),
  customFields: jsonb('custom_fields').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const companiesRelations = relations(companies, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [companies.createdBy],
    references: [users.id],
  }),
  persons: many(persons),
  leads: many(leads),
  activities: many(activities),
  companyResearches: many(companyResearches),
  firecrawlResearches: many(firecrawlResearches),
}))

// ============================================
// Persons
// ============================================
export const persons = pgTable('persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  portalUserId: uuid('portal_user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  // Name
  salutation: varchar('salutation', { length: 20 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  // Contact
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  mobile: varchar('mobile', { length: 50 }),
  // Position
  jobTitle: varchar('job_title', { length: 100 }),
  department: varchar('department', { length: 100 }),
  // Private Address
  street: varchar('street', { length: 255 }),
  houseNumber: varchar('house_number', { length: 20 }),
  postalCode: varchar('postal_code', { length: 20 }),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 2 }).default('DE'),
  // Status
  status: varchar('status', { length: 30 }).default('active'),
  isPrimaryContact: boolean('is_primary_contact').default(false),
  tags: text('tags').array().default([]),
  birthday: timestamp('birthday', { withTimezone: true }),
  // Metadata
  notes: text('notes'),
  customFields: jsonb('custom_fields').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_persons_portal_user_id').on(table.portalUserId),
])

export const personsRelations = relations(persons, ({ one, many }) => ({
  company: one(companies, {
    fields: [persons.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [persons.createdBy],
    references: [users.id],
  }),
  portalUser: one(users, {
    fields: [persons.portalUserId],
    references: [users.id],
  }),
  leads: many(leads),
  activities: many(activities),
}))

// ============================================
// Leads
// ============================================
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  personId: uuid('person_id').references(() => persons.id, { onDelete: 'set null' }),
  // Lead Data
  title: varchar('title', { length: 255 }),
  source: varchar('source', { length: 50 }).notNull(),
  sourceDetail: varchar('source_detail', { length: 255 }),
  // Status Pipeline
  status: varchar('status', { length: 30 }).default('new'),
  // Scoring
  score: integer('score').default(0),
  aiResearchStatus: varchar('ai_research_status', { length: 30 }).default('pending'),
  aiResearchResult: jsonb('ai_research_result'),
  // Assignment
  assignedTo: uuid('assigned_to').references(() => users.id),
  // Contact Info (from website form)
  contactFirstName: varchar('contact_first_name', { length: 100 }),
  contactLastName: varchar('contact_last_name', { length: 100 }),
  contactCompany: varchar('contact_company', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  // Metadata
  tags: text('tags').array().default([]),
  notes: text('notes'),
  // Raw Data
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const leadsRelations = relations(leads, ({ one, many }) => ({
  company: one(companies, {
    fields: [leads.companyId],
    references: [companies.id],
  }),
  person: one(persons, {
    fields: [leads.personId],
    references: [persons.id],
  }),
  assignedToUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  activities: many(activities),
}))

// ============================================
// Product Categories
// ============================================
export const productCategories = pgTable('product_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }),
  description: text('description'),
  parentId: uuid('parent_id'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(productCategories, { relationName: 'categoryHierarchy' }),
  products: many(products),
}))

// ============================================
// Products (Produkte & Dienstleistungen)
// ============================================
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Type
  type: varchar('type', { length: 20 }).notNull(), // 'product' | 'service'
  // Core Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sku: varchar('sku', { length: 50 }),
  // Category
  categoryId: uuid('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
  // Pricing
  priceNet: decimal('price_net', { precision: 15, scale: 2 }),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).default('19.00'),
  unit: varchar('unit', { length: 30 }).default('Stück'),
  // Status & Classification
  status: varchar('status', { length: 20 }).default('active'),
  tags: text('tags').array().default([]),
  // Web & SEO
  isPublic: boolean('is_public').default(false),
  isHighlight: boolean('is_highlight').default(false),
  shortDescription: text('short_description'),
  slug: varchar('slug', { length: 255 }),
  seoTitle: varchar('seo_title', { length: 70 }),
  seoDescription: varchar('seo_description', { length: 160 }),
  // Media
  images: jsonb('images').default([]),
  // Logistics (physical products)
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: jsonb('dimensions'),
  manufacturer: varchar('manufacturer', { length: 255 }),
  ean: varchar('ean', { length: 13 }),
  minOrderQuantity: integer('min_order_quantity').default(1),
  deliveryTime: varchar('delivery_time', { length: 100 }),
  // Metadata
  notes: text('notes'),
  customFields: jsonb('custom_fields').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const productsRelations = relations(products, ({ one }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  createdByUser: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
}))

// ============================================
// AI Providers (Integrations Konfiguration)
// ============================================
export const aiProviders = pgTable('ai_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Provider-Typ: ollama, openrouter, gemini, openai
  providerType: varchar('provider_type', { length: 30 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // Display-Name z.B. "OpenRouter GPT-4o"
  // Konfiguration
  apiKey: text('api_key'), // Verschlüsselt gespeichert (nullable für Ollama)
  baseUrl: varchar('base_url', { length: 500 }), // z.B. http://ollama:11434
  model: varchar('model', { length: 100 }).notNull(), // z.B. gemma3, openai/gpt-4o-mini
  // Optionen
  maxTokens: integer('max_tokens').default(1000),
  temperature: decimal('temperature', { precision: 3, scale: 2 }).default('0.70'),
  // Priorität & Status
  priority: integer('priority').default(0), // Niedrigere Zahl = höhere Priorität
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const aiProvidersRelations = relations(aiProviders, ({ one, many }) => ({
  logs: many(aiLogs),
}))

// ============================================
// AI Logs (KI Prompt/Response Logging)
// ============================================
export const aiLogs = pgTable('ai_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').references(() => aiProviders.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  // Request
  providerType: varchar('provider_type', { length: 30 }).notNull(), // ollama, openrouter, gemini, openai
  model: varchar('model', { length: 100 }).notNull(),
  prompt: text('prompt').notNull(),
  // Response
  response: text('response'),
  status: varchar('status', { length: 20 }).notNull().default('success'), // success, error
  errorMessage: text('error_message'),
  // Metriken
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  durationMs: integer('duration_ms'), // Antwortzeit in Millisekunden
  // Kontext
  feature: varchar('feature', { length: 50 }), // research, completion, summarize, etc.
  entityType: varchar('entity_type', { length: 50 }), // company, person, lead
  entityId: uuid('entity_id'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const aiLogsRelations = relations(aiLogs, ({ one }) => ({
  provider: one(aiProviders, {
    fields: [aiLogs.providerId],
    references: [aiProviders.id],
  }),
  user: one(users, {
    fields: [aiLogs.userId],
    references: [users.id],
  }),
}))

// ============================================
// AI Prompt Templates (KI-Prompt-Vorlagen)
// ============================================
export const aiPromptTemplates = pgTable('ai_prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Identifikation
  slug: varchar('slug', { length: 100 }).notNull(), // z.B. 'lead_research', 'company_research', 'person_research', 'quick_score'
  name: varchar('name', { length: 200 }).notNull(),  // z.B. 'Lead-Recherche'
  description: text('description'),                    // Hilfetext für den User
  // Prompt-Inhalte (getrennt)
  systemPrompt: text('system_prompt').notNull(),       // Rolle & Regeln
  userPrompt: text('user_prompt').notNull(),           // Aufgabe mit {{Platzhaltern}}
  outputFormat: text('output_format'),                  // JSON-Schema / Formatvorgabe
  // Status
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),     // System-Default (nicht löschbar)
  version: integer('version').default(1),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const aiPromptTemplatesRelations = relations(aiPromptTemplates, ({ one }) => ({
}))

// ============================================
// Custom AI Prompts (user-defined prompts, executable per company / callable from workflows)
// ============================================
export const customAiPrompts = pgTable('custom_ai_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).default('custom'), // communication | sales | analysis | marketing | internal | custom
  icon: varchar('icon', { length: 50 }).default('Sparkles'),
  color: varchar('color', { length: 20 }).default('indigo'), // blue | green | purple | amber | gray | indigo
  systemPrompt: text('system_prompt'),
  userPrompt: text('user_prompt').notNull(),
  // contextConfig: which entities should be auto-injected as context when executing
  // { includeCompany, includePersons, includeProducts, includeOrganization, includeRecentActivities, includeResearch, includeCms, includeProcesses }
  contextConfig: jsonb('context_config').default({}),
  activityType: varchar('activity_type', { length: 20 }).default('note'), // email | note | call | meeting
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_custom_ai_prompts_active').on(table.isActive),
  index('idx_custom_ai_prompts_category').on(table.category),
])

export const customAiPromptsRelations = relations(customAiPrompts, ({ one }) => ({
  createdByUser: one(users, {
    fields: [customAiPrompts.createdBy],
    references: [users.id],
  }),
}))

export type CustomAiPrompt = typeof customAiPrompts.$inferSelect
export type NewCustomAiPrompt = typeof customAiPrompts.$inferInsert

// ============================================
// Ideas (Ideen-Labor)
// ============================================
export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  rawContent: text('raw_content').notNull(),
  structuredContent: jsonb('structured_content').default({}),
  type: varchar('type', { length: 20 }).notNull().default('text'), // text | voice
  status: varchar('status', { length: 20 }).default('backlog'), // backlog | in_progress | converted
  tags: text('tags').array().default([]),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const ideasRelations = relations(ideas, ({ one }) => ({
  createdByUser: one(users, {
    fields: [ideas.createdBy],
    references: [users.id],
  }),
}))

// ============================================
// Activities (Aktivitäten / Interaktions-Log)
// ============================================
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Verknüpfte Entitäten
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  personId: uuid('person_id').references(() => persons.id, { onDelete: 'set null' }),
  // Aktivitätsdaten
  type: varchar('type', { length: 30 }).notNull(), // email | call | note | meeting | ai_outreach
  subject: varchar('subject', { length: 255 }),
  content: text('content'),
  metadata: jsonb('metadata').default({}),
  // Wer hat es gemacht
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
  company: one(companies, {
    fields: [activities.companyId],
    references: [companies.id],
  }),
  person: one(persons, {
    fields: [activities.personId],
    references: [persons.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}))

// ============================================
// Webhooks
// ============================================
export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  events: text('events').array().notNull(), // lead.won, lead.lost, lead.status_changed, research.completed, idea.converted, company.created
  secret: varchar('secret', { length: 255 }),
  isActive: boolean('is_active').default(true),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  lastStatus: integer('last_status'),
  failCount: integer('fail_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const webhooksRelations = relations(webhooks, ({ one }) => ({
}))

// ============================================
// Audit Log
// ============================================
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 30 }).notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_audit_log_entity').on(table.entityType, table.entityId),
  index('idx_audit_log_created_at').on(table.createdAt),
])

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}))

// ============================================
// Documents (Rechnungen & Angebote)
// ============================================
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 20 }).notNull(), // 'invoice' | 'offer'
  number: varchar('number', { length: 50 }).notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  contactPersonId: uuid('contact_person_id').references(() => persons.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 30 }).default('draft'),
  // Dates
  issueDate: timestamp('issue_date', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  // Totals
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).default('0'),
  taxTotal: decimal('tax_total', { precision: 15, scale: 2 }).default('0'),
  total: decimal('total', { precision: 15, scale: 2 }).default('0'),
  discount: decimal('discount', { precision: 15, scale: 2 }),
  discountType: varchar('discount_type', { length: 10 }), // 'percent' | 'fixed'
  // Content
  notes: text('notes'),
  paymentTerms: varchar('payment_terms', { length: 255 }),
  // Payment tracking
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid'), // unpaid, paid, overdue, partially_paid
  paidAt: timestamp('paid_at', { withTimezone: true }),
  paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).default('0'),
  dunningLevel: integer('dunning_level').default(0), // 0=keine, 1=Erinnerung, 2=Mahnung, 3=Letzte Mahnung
  // Customer Address Snapshot
  customerName: varchar('customer_name', { length: 255 }),
  customerStreet: varchar('customer_street', { length: 255 }),
  customerHouseNumber: varchar('customer_house_number', { length: 20 }),
  customerPostalCode: varchar('customer_postal_code', { length: 20 }),
  customerCity: varchar('customer_city', { length: 100 }),
  customerCountry: varchar('customer_country', { length: 2 }),
  customerVatId: varchar('customer_vat_id', { length: 50 }),
  // Self-reference for offer → invoice conversion
  convertedFromId: uuid('converted_from_id'),
  // Contract-specific fields
  contractStartDate: timestamp('contract_start_date', { withTimezone: true }),
  contractEndDate: timestamp('contract_end_date', { withTimezone: true }),
  contractRenewalType: varchar('contract_renewal_type', { length: 30 }).default('none'),
  contractRenewalPeriod: varchar('contract_renewal_period', { length: 30 }),
  contractNoticePeriodDays: integer('contract_notice_period_days'),
  contractTemplateId: uuid('contract_template_id'),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  contractBodyHtml: text('contract_body_html'),
  // Metadata
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const documentsRelations = relations(documents, ({ one, many }) => ({
  company: one(companies, {
    fields: [documents.companyId],
    references: [companies.id],
  }),
  contactPerson: one(persons, {
    fields: [documents.contactPersonId],
    references: [persons.id],
  }),
  createdByUser: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  convertedFrom: one(documents, {
    fields: [documents.convertedFromId],
    references: [documents.id],
    relationName: 'documentConversion',
  }),
  items: many(documentItems),
}))

// ============================================
// Document Items (Positionen)
// ============================================
export const documentItems = pgTable('document_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  position: integer('position').default(0),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 10, scale: 3 }).default('1'),
  unit: varchar('unit', { length: 30 }).default('Stück'),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).default('0'),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).default('19.00'),
  discount: decimal('discount', { precision: 15, scale: 2 }),
  discountType: varchar('discount_type', { length: 10 }), // 'percent' | 'fixed'
  lineTotal: decimal('line_total', { precision: 15, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_document_items_document').on(table.documentId),
  index('idx_document_items_product').on(table.productId),
])

export const documentItemsRelations = relations(documentItems, ({ one }) => ({
  document: one(documents, {
    fields: [documentItems.documentId],
    references: [documents.id],
  }),
  product: one(products, {
    fields: [documentItems.productId],
    references: [products.id],
  }),
}))

// ============================================
// Contract Templates
// ============================================
export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  bodyHtml: text('body_html'),
  placeholders: jsonb('placeholders').default([]),
  clauses: jsonb('clauses').default([]),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_contract_templates_category').on(table.category),
])

export const contractTemplatesRelations = relations(contractTemplates, ({ one }) => ({
}))

// ============================================
// Contract Clauses (Bausteine)
// ============================================
export const contractClauses = pgTable('contract_clauses', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: varchar('category', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  bodyHtml: text('body_html'),
  isSystem: boolean('is_system').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_contract_clauses_category').on(table.category),
])

export const contractClausesRelations = relations(contractClauses, ({ one }) => ({
}))

// ============================================
// DIN SPEC 27076 - Requirements (statisch, per Seed)
// ============================================
export const dinRequirements = pgTable('din_requirements', {
  id: integer('id').primaryKey(),
  number: varchar('number', { length: 10 }).notNull(),
  groupNumber: varchar('group_number', { length: 10 }),
  componentNumber: integer('component_number'),
  type: varchar('type', { length: 10 }).notNull(), // 'top' | 'regular'
  topicArea: integer('topic_area').notNull(), // 1-6
  officialAnforderungText: text('official_anforderung_text').notNull(),
  questionText: text('question_text').notNull(),
  recommendationText: text('recommendation_text'),
  isStatusQuestion: boolean('is_status_question').default(false),
  dependsOn: integer('depends_on'),
  points: integer('points'),
})

export const dinRequirementsRelations = relations(dinRequirements, ({ many }) => ({
  answers: many(dinAnswers),
}))

// ============================================
// DIN SPEC 27076 - Audit Sessions
// ============================================
export const dinAuditSessions = pgTable('din_audit_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientCompanyId: uuid('client_company_id').references(() => companies.id, { onDelete: 'set null' }),
  consultantId: uuid('consultant_id').references(() => users.id, { onDelete: 'set null' }),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('draft'), // draft | in_progress | completed | approved
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const dinAuditSessionsRelations = relations(dinAuditSessions, ({ one, many }) => ({
  clientCompany: one(companies, {
    fields: [dinAuditSessions.clientCompanyId],
    references: [companies.id],
  }),
  consultant: one(users, {
    fields: [dinAuditSessions.consultantId],
    references: [users.id],
    relationName: 'consultantSessions',
  }),
  reviewer: one(users, {
    fields: [dinAuditSessions.reviewerId],
    references: [users.id],
    relationName: 'reviewerSessions',
  }),
  answers: many(dinAnswers),
}))

// ============================================
// DIN SPEC 27076 - Answers
// ============================================
export const dinAnswers = pgTable('din_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => dinAuditSessions.id, { onDelete: 'cascade' }),
  requirementId: integer('requirement_id').notNull().references(() => dinRequirements.id),
  status: varchar('status', { length: 20 }).notNull(), // fulfilled | not_fulfilled | irrelevant
  justification: text('justification'),
  answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_din_answers_session').on(table.sessionId),
])

export const dinAnswersRelations = relations(dinAnswers, ({ one }) => ({
  session: one(dinAuditSessions, {
    fields: [dinAnswers.sessionId],
    references: [dinAuditSessions.id],
  }),
  requirement: one(dinRequirements, {
    fields: [dinAnswers.requirementId],
    references: [dinRequirements.id],
  }),
}))

// ============================================
// WiBA (Weg in die Basis-Absicherung) - Requirements
// ============================================
export const wibaRequirements = pgTable('wiba_requirements', {
  id: integer('id').primaryKey(),
  number: varchar('number', { length: 10 }).notNull(),
  category: integer('category').notNull(), // 1-19
  questionText: text('question_text').notNull(),
  helpText: text('help_text'),
  effort: varchar('effort', { length: 10 }),
  bsiBausteine: text('bsi_bausteine').array().default([]),
  bsiAnforderungen: text('bsi_anforderungen').array().default([]),
})

export const wibaRequirementsRelations = relations(wibaRequirements, ({ many }) => ({
  answers: many(wibaAnswers),
}))

// ============================================
// WiBA - Audit Sessions
// ============================================
export const wibaAuditSessions = pgTable('wiba_audit_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientCompanyId: uuid('client_company_id').references(() => companies.id, { onDelete: 'set null' }),
  consultantId: uuid('consultant_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('draft'), // draft | in_progress | completed
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const wibaAuditSessionsRelations = relations(wibaAuditSessions, ({ one, many }) => ({
  clientCompany: one(companies, {
    fields: [wibaAuditSessions.clientCompanyId],
    references: [companies.id],
  }),
  consultant: one(users, {
    fields: [wibaAuditSessions.consultantId],
    references: [users.id],
    relationName: 'wibaConsultantSessions',
  }),
  answers: many(wibaAnswers),
}))

// ============================================
// WiBA - Answers
// ============================================
export const wibaAnswers = pgTable('wiba_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => wibaAuditSessions.id, { onDelete: 'cascade' }),
  requirementId: integer('requirement_id').notNull().references(() => wibaRequirements.id),
  status: varchar('status', { length: 20 }).notNull(), // ja | nein | nicht_relevant
  notes: text('notes'),
  answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_wiba_answers_session').on(table.sessionId),
])

export const wibaAnswersRelations = relations(wibaAnswers, ({ one }) => ({
  session: one(wibaAuditSessions, {
    fields: [wibaAnswers.sessionId],
    references: [wibaAuditSessions.id],
  }),
  requirement: one(wibaRequirements, {
    fields: [wibaAnswers.requirementId],
    references: [wibaRequirements.id],
  }),
}))

// ============================================
// DIN SPEC 27076 - Grants (Fördermittel, statisch per Seed)
// ============================================
export const dinGrants = pgTable('din_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  purpose: text('purpose'),
  url: varchar('url', { length: 500 }),
  region: varchar('region', { length: 100 }).notNull(),
  minEmployees: integer('min_employees'),
  maxEmployees: integer('max_employees'),
}, (table) => [
  index('idx_din_grants_region').on(table.region),
])

// ============================================
// Grundschutz++ (BSI OSCAL Catalog)
// ============================================
export const grundschutzGroups = pgTable('grundschutz_groups', {
  id: varchar('id', { length: 20 }).primaryKey(), // z.B. GC, BER, KONF
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'), // Praktik-Beschreibung (remarks aus label-prop)
  altIdentifier: varchar('alt_identifier', { length: 100 }), // OSCAL alt-identifier UUID
  parentId: varchar('parent_id', { length: 20 }), // Untergruppen
  sortOrder: integer('sort_order').default(0),
})

export const grundschutzControls = pgTable('grundschutz_controls', {
  id: varchar('id', { length: 30 }).primaryKey(), // z.B. GC.1.1, BER.3.5
  groupId: varchar('group_id', { length: 20 }).notNull(),
  parentControlId: varchar('parent_control_id', { length: 30 }), // Sub-Control -> Parent
  altIdentifier: varchar('alt_identifier', { length: 100 }), // OSCAL alt-identifier UUID
  title: varchar('title', { length: 500 }).notNull(),
  statement: text('statement'), // Anforderungstext (prose)
  guidance: text('guidance'), // Umsetzungshinweise (prose aus part name=guidance)
  documentation: varchar('documentation', { length: 255 }), // Dokumentationshinweis (z.B. IT-Betriebskonzept)
  modalVerb: varchar('modal_verb', { length: 10 }), // MUSS, SOLLTE, KANN
  actionWord: varchar('action_word', { length: 50 }), // verankern, pruefen, etc.
  result: text('result'), // Ergebnis der Anforderung
  resultSpecification: text('result_specification'), // Spezifikation
  secLevel: varchar('sec_level', { length: 30 }), // normal-SdT, erhoeht
  effortLevel: varchar('effort_level', { length: 10 }), // 0-5
  tags: text('tags').array().default([]),
  oscalClass: varchar('oscal_class', { length: 100 }),
  params: jsonb('params').default([]), // OSCAL params
  sortOrder: integer('sort_order').default(0),
}, (table) => [
  index('idx_grundschutz_controls_group').on(table.groupId),
  index('idx_grundschutz_controls_sec_level').on(table.secLevel),
  index('idx_grundschutz_controls_modal').on(table.modalVerb),
])

export const grundschutzControlLinks = pgTable('grundschutz_control_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceControlId: varchar('source_control_id', { length: 30 }).notNull(),
  targetControlId: varchar('target_control_id', { length: 30 }).notNull(),
  rel: varchar('rel', { length: 20 }).notNull(), // 'related' | 'required'
}, (table) => [
  index('idx_grundschutz_links_source').on(table.sourceControlId),
  index('idx_grundschutz_links_target').on(table.targetControlId),
])

export const grundschutzCatalogMeta = pgTable('grundschutz_catalog_meta', {
  id: varchar('id', { length: 50 }).primaryKey().default('current'),
  catalogUuid: varchar('catalog_uuid', { length: 100 }),
  title: varchar('title', { length: 255 }),
  version: varchar('version', { length: 100 }),
  lastModified: varchar('last_modified', { length: 100 }),
  oscalVersion: varchar('oscal_version', { length: 20 }),
  totalGroups: integer('total_groups').default(0),
  totalControls: integer('total_controls').default(0),
  importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow(),
  sourceUrl: text('source_url'),
})

export const grundschutzAuditSessions = pgTable('grundschutz_audit_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientCompanyId: uuid('client_company_id').references(() => companies.id, { onDelete: 'set null' }),
  consultantId: uuid('consultant_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }),
  status: varchar('status', { length: 20 }).default('draft'), // draft, in_progress, completed
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const grundschutzAnswers = pgTable('grundschutz_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => grundschutzAuditSessions.id, { onDelete: 'cascade' }),
  controlId: varchar('control_id', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).default('offen'), // erfuellt, teilweise, nicht_erfuellt, nicht_relevant, offen
  notes: text('notes'),
  answeredAt: timestamp('answered_at', { withTimezone: true }),
}, (table) => [
  index('idx_grundschutz_answers_session').on(table.sessionId),
])

export const grundschutzAuditSessionsRelations = relations(grundschutzAuditSessions, ({ one, many }) => ({
  clientCompany: one(companies, {
    fields: [grundschutzAuditSessions.clientCompanyId],
    references: [companies.id],
  }),
  consultant: one(users, {
    fields: [grundschutzAuditSessions.consultantId],
    references: [users.id],
    relationName: 'grundschutzConsultantSessions',
  }),
  answers: many(grundschutzAnswers),
}))

export const grundschutzAnswersRelations = relations(grundschutzAnswers, ({ one }) => ({
  session: one(grundschutzAuditSessions, {
    fields: [grundschutzAnswers.sessionId],
    references: [grundschutzAuditSessions.id],
  }),
}))

// ============================================
// Grundschutz++ IT Asset Management
// ============================================
export const grundschutzAssets = pgTable('grundschutz_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  categoryType: varchar('category_type', { length: 50 }).notNull(), // Nutzende, IT-Systeme, Anwendungen, Netze, Standorte, Einkaeufe, Informationen
  categoryName: varchar('category_name', { length: 100 }).notNull(), // z.B. "Hostsysteme", "Webanwendungen"
  categoryUuid: varchar('category_uuid', { length: 40 }), // BSI UUID
  vertraulichkeit: varchar('vertraulichkeit', { length: 20 }).default('normal'), // normal, hoch, sehr_hoch
  integritaet: varchar('integritaet', { length: 20 }).default('normal'),
  verfuegbarkeit: varchar('verfuegbarkeit', { length: 20 }).default('normal'),
  schutzbedarfBegruendung: text('schutzbedarf_begruendung'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('active'), // active, planned, decommissioned
  location: varchar('location', { length: 255 }),
  tags: jsonb('tags').default([]),
  notes: text('notes'),
  customFields: jsonb('custom_fields').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const grundschutzAssetRelationsTable = pgTable('grundschutz_asset_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceAssetId: uuid('source_asset_id').notNull().references(() => grundschutzAssets.id, { onDelete: 'cascade' }),
  targetAssetId: uuid('target_asset_id').notNull().references(() => grundschutzAssets.id, { onDelete: 'cascade' }),
  relationType: varchar('relation_type', { length: 30 }).notNull(), // supports, runs_on, connected_to, housed_in, uses, managed_by
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_gs_asset_rel_source').on(table.sourceAssetId),
  index('idx_gs_asset_rel_target').on(table.targetAssetId),
])

export const grundschutzAssetControls = pgTable('grundschutz_asset_controls', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => grundschutzAssets.id, { onDelete: 'cascade' }),
  controlId: varchar('control_id', { length: 30 }).notNull(),
  applicability: varchar('applicability', { length: 20 }).default('applicable'), // applicable, not_applicable
  justification: text('justification'),
  implementationStatus: varchar('implementation_status', { length: 20 }).default('offen'), // offen, geplant, umgesetzt, teilweise, nicht_umgesetzt
  implementationNotes: text('implementation_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_gs_asset_ctrl_asset').on(table.assetId),
  index('idx_gs_asset_ctrl_control').on(table.controlId),
])

export const grundschutzAssetsRelations = relations(grundschutzAssets, ({ one, many }) => ({
  company: one(companies, { fields: [grundschutzAssets.companyId], references: [companies.id] }),
  owner: one(users, { fields: [grundschutzAssets.ownerId], references: [users.id] }),
  controlMappings: many(grundschutzAssetControls),
}))

export const grundschutzAssetControlsRelations = relations(grundschutzAssetControls, ({ one }) => ({
  asset: one(grundschutzAssets, { fields: [grundschutzAssetControls.assetId], references: [grundschutzAssets.id] }),
}))

export type GrundschutzGroup = typeof grundschutzGroups.$inferSelect
export type GrundschutzControl = typeof grundschutzControls.$inferSelect
export type GrundschutzControlLink = typeof grundschutzControlLinks.$inferSelect
export type GrundschutzCatalogMeta = typeof grundschutzCatalogMeta.$inferSelect
export type GrundschutzAuditSession = typeof grundschutzAuditSessions.$inferSelect
export type GrundschutzAnswer = typeof grundschutzAnswers.$inferSelect
export type GrundschutzAsset = typeof grundschutzAssets.$inferSelect
export type GrundschutzAssetRelation = typeof grundschutzAssetRelationsTable.$inferSelect
export type GrundschutzAssetControl = typeof grundschutzAssetControls.$inferSelect

// ============================================
// IR Playbook - Scenarios
// ============================================
export const irScenarios = pgTable('ir_scenarios', {
  id: varchar('id', { length: 10 }).primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  version: varchar('version', { length: 20 }).default('1.0.0').notNull(),
  series: varchar('series', { length: 10 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  subtitle: text('subtitle'),
  emoji: varchar('emoji', { length: 10 }),
  colorHex: char('color_hex', { length: 6 }),
  tags: text('tags').array().default([]),
  affectedSystems: text('affected_systems').array().default([]),
  severity: varchar('severity', { length: 20 }).notNull(),
  severityLabel: varchar('severity_label', { length: 50 }),
  likelihood: varchar('likelihood', { length: 20 }).notNull(),
  dsgvoRelevant: boolean('dsgvo_relevant').default(false).notNull(),
  nis2Relevant: boolean('nis2_relevant').default(false).notNull(),
  financialRisk: varchar('financial_risk', { length: 20 }).notNull(),
  avgDamageEurMin: integer('avg_damage_eur_min'),
  avgDamageEurMax: integer('avg_damage_eur_max'),
  overview: text('overview').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
  deprecatedAt: timestamp('deprecated_at', { mode: 'date' }),
  createdBy: varchar('created_by', { length: 100 }).default('xKMU digital solutions'),
})

// ============================================
// IR Playbook - Detection Indicators
// ============================================
export const irDetectionIndicators = pgTable('ir_detection_indicators', {
  id: serial('id').primaryKey(),
  scenarioId: varchar('scenario_id', { length: 10 }).notNull().references(() => irScenarios.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(),
  description: text('description').notNull(),
  threshold: varchar('threshold', { length: 200 }),
  sequence: smallint('sequence').default(1).notNull(),
})

// ============================================
// IR Playbook - Actions
// ============================================
export const irActions = pgTable('ir_actions', {
  id: varchar('id', { length: 30 }).primaryKey(),
  scenarioId: varchar('scenario_id', { length: 10 }).notNull().references(() => irScenarios.id, { onDelete: 'cascade' }),
  phase: varchar('phase', { length: 20 }).notNull(),
  timeWindowMinutes: integer('time_window_minutes'),
  timeLabel: varchar('time_label', { length: 50 }),
  priority: smallint('priority').notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  responsible: varchar('responsible', { length: 50 }),
  action: text('action').notNull(),
  detail: text('detail'),
  doNot: boolean('do_not').default(false).notNull(),
  toolHint: text('tool_hint'),
})

// ============================================
// IR Playbook - Escalation Levels
// ============================================
export const irEscalationLevels = pgTable('ir_escalation_levels', {
  id: varchar('id', { length: 15 }).primaryKey(),
  scenarioId: varchar('scenario_id', { length: 10 }).notNull().references(() => irScenarios.id, { onDelete: 'cascade' }),
  level: smallint('level').notNull(),
  label: varchar('label', { length: 500 }).notNull(),
  colorHex: char('color_hex', { length: 6 }),
  deadlineHours: numeric('deadline_hours', { precision: 6, scale: 2 }),
  condition: varchar('condition', { length: 500 }),
})

// ============================================
// IR Playbook - Escalation Recipients
// ============================================
export const irEscalationRecipients = pgTable('ir_escalation_recipients', {
  id: serial('id').primaryKey(),
  escalationLevelId: varchar('escalation_level_id', { length: 15 }).notNull().references(() => irEscalationLevels.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 200 }).notNull(),
  contactType: varchar('contact_type', { length: 30 }).notNull(),
  legalBasis: varchar('legal_basis', { length: 100 }),
  message: text('message'),
  condition: varchar('condition', { length: 200 }),
  sequence: smallint('sequence').default(1).notNull(),
})

// ============================================
// IR Playbook - Recovery Steps
// ============================================
export const irRecoverySteps = pgTable('ir_recovery_steps', {
  id: varchar('id', { length: 15 }).primaryKey(),
  scenarioId: varchar('scenario_id', { length: 10 }).notNull().references(() => irScenarios.id, { onDelete: 'cascade' }),
  phaseLabel: varchar('phase_label', { length: 100 }).notNull(),
  sequence: smallint('sequence').notNull(),
  action: text('action').notNull(),
  detail: text('detail'),
  responsible: varchar('responsible', { length: 50 }).notNull(),
  dependsOn: varchar('depends_on', { length: 15 }),
})

// ============================================
// IR Playbook - Checklist Items
// ============================================
export const irChecklistItems = pgTable('ir_checklist_items', {
  id: varchar('id', { length: 15 }).primaryKey(),
  scenarioId: varchar('scenario_id', { length: 10 }).notNull().references(() => irScenarios.id, { onDelete: 'cascade' }),
  sequence: smallint('sequence').notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  item: text('item').notNull(),
  mandatory: boolean('mandatory').default(true).notNull(),
  dsgvoRequired: boolean('dsgvo_required').default(false).notNull(),
})

// ============================================
// IR Playbook - Lessons Learned
// ============================================
export const irLessonsLearned = pgTable('ir_lessons_learned', {
  id: varchar('id', { length: 15 }).primaryKey(),
  scenarioId: varchar('scenario_id', { length: 10 }).notNull().references(() => irScenarios.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  mapsToControl: varchar('maps_to_control', { length: 50 }),
})

// ============================================
// IR Playbook - References
// ============================================
export const irReferences = pgTable('ir_references', {
  id: serial('id').primaryKey(),
  scenarioId: varchar('scenario_id', { length: 10 }).notNull().references(() => irScenarios.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(),
  name: varchar('name', { length: 300 }).notNull(),
  url: text('url'),
})

// ============================================
// CMS Pages (Editierbare Seiten)
// ============================================
export const cmsPages = pgTable('cms_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  seoTitle: varchar('seo_title', { length: 70 }),
  seoDescription: varchar('seo_description', { length: 160 }),
  seoKeywords: varchar('seo_keywords', { length: 255 }),
  ogImage: varchar('og_image', { length: 500 }),
  status: varchar('status', { length: 20 }).default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBlocks: jsonb('published_blocks'),
  publishedTitle: varchar('published_title', { length: 255 }),
  publishedSeoTitle: varchar('published_seo_title', { length: 70 }),
  publishedSeoDescription: varchar('published_seo_description', { length: 160 }),
  publishedSeoKeywords: varchar('published_seo_keywords', { length: 255 }),
  hasDraftChanges: boolean('has_draft_changes').default(false),
  inSitemap: boolean('in_sitemap').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_pages_slug').on(table.slug),
  index('idx_cms_pages_status').on(table.status),
])

export const cmsPagesRelations = relations(cmsPages, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [cmsPages.createdBy],
    references: [users.id],
  }),
  blocks: many(cmsBlocks),
}))

// ============================================
// CMS Blocks (Inhaltsblöcke pro Seite)
// ============================================
export const cmsBlocks = pgTable('cms_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => cmsPages.id, { onDelete: 'cascade' }),
  blockType: varchar('block_type', { length: 50 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  content: jsonb('content').default({}),
  settings: jsonb('settings').default({}),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_blocks_page_sort').on(table.pageId, table.sortOrder),
])

export const cmsBlocksRelations = relations(cmsBlocks, ({ one }) => ({
  page: one(cmsPages, {
    fields: [cmsBlocks.pageId],
    references: [cmsPages.id],
  }),
}))

// ============================================
// CMS Block Templates (Wiederverwendbare Blockvorlagen)
// ============================================
export const cmsBlockTemplates = pgTable('cms_block_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  blockType: varchar('block_type', { length: 50 }).notNull(),
  content: jsonb('content').default({}),
  settings: jsonb('settings').default({}),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_block_templates_type').on(table.blockType),
])

// ============================================
// CMS Navigation Items (Navigations-Einträge)
// ============================================
export const cmsNavigationItems = pgTable('cms_navigation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  location: varchar('location', { length: 20 }).notNull(), // 'header' | 'footer'
  label: varchar('label', { length: 100 }).notNull(),
  href: varchar('href', { length: 500 }).notNull(),
  pageId: uuid('page_id').references(() => cmsPages.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  openInNewTab: boolean('open_in_new_tab').default(false),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_nav_items_location_sort').on(table.location, table.sortOrder),
])

export const cmsNavigationItemsRelations = relations(cmsNavigationItems, ({ one }) => ({
  page: one(cmsPages, {
    fields: [cmsNavigationItems.pageId],
    references: [cmsPages.id],
  }),
}))

export type CmsNavigationItem = typeof cmsNavigationItems.$inferSelect
export type NewCmsNavigationItem = typeof cmsNavigationItems.$inferInsert

// ============================================
// CMS Block Type Definitions (Globale Block-Typ-Konfiguration)
// ============================================
export const cmsBlockTypeDefinitions = pgTable('cms_block_type_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  category: varchar('category', { length: 50 }),
  fields: jsonb('fields').default([]),
  fieldDefinitions: jsonb('field_definitions').notNull().default([]),
  defaultContent: jsonb('default_content').default({}),
  defaultSettings: jsonb('default_settings').default({}),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  availableInLessons: boolean('available_in_lessons').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_block_type_defs_slug').on(table.slug),
  index('idx_cms_block_type_defs_active').on(table.isActive),
])

export type CmsBlockTypeDefinition = typeof cmsBlockTypeDefinitions.$inferSelect
export type NewCmsBlockTypeDefinition = typeof cmsBlockTypeDefinitions.$inferInsert

// ============================================
// CMS Settings (Design & Konfiguration)
// ============================================
export const cmsSettings = pgTable('cms_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_settings_key').on(table.key),
])

export type CmsSettings = typeof cmsSettings.$inferSelect
export type NewCmsSettings = typeof cmsSettings.$inferInsert

// ============================================
// Blog Posts (Blog-Beiträge)
// ============================================
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  featuredImage: varchar('featured_image', { length: 500 }),
  featuredImageAlt: varchar('featured_image_alt', { length: 255 }),
  seoTitle: varchar('seo_title', { length: 70 }),
  seoDescription: varchar('seo_description', { length: 160 }),
  seoKeywords: varchar('seo_keywords', { length: 255 }),
  tags: text('tags').array().default([]),
  category: varchar('category', { length: 100 }),
  status: varchar('status', { length: 20 }).default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  source: varchar('source', { length: 20 }).default('manual'),
  aiMetadata: jsonb('ai_metadata'),
  inSitemap: boolean('in_sitemap').notNull().default(true),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_blog_posts_slug').on(table.slug),
  index('idx_blog_posts_status').on(table.status),
  index('idx_blog_posts_published').on(table.publishedAt),
  index('idx_blog_posts_category').on(table.category),
])

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
}))

// ============================================
// Blog Categories (Verwaltbare Kategorien für Blog-Beiträge)
// ============================================
export const blogCategories = pgTable('blog_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 30 }), // optional Tailwind color class or hex
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_blog_categories_slug').on(table.slug),
  index('idx_blog_categories_active').on(table.isActive),
])

export type BlogCategory = typeof blogCategories.$inferSelect
export type NewBlogCategory = typeof blogCategories.$inferInsert

// ============================================
// Media Uploads (Hochgeladene Dateien)
// ============================================
export const mediaUploads = pgTable('media_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  alt: varchar('alt', { length: 255 }),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const mediaUploadsRelations = relations(mediaUploads, ({ one }) => ({
  uploadedByUser: one(users, {
    fields: [mediaUploads.uploadedBy],
    references: [users.id],
  }),
}))

// ============================================
// Company Researches (Persistente KI-Recherche-Ergebnisse)
// ============================================
export const companyResearches = pgTable('company_researches', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('completed'), // completed | applied | rejected
  researchData: jsonb('research_data'), // Full CompanyResearchResult + proposedProfileText
  scrapedPages: jsonb('scraped_pages'), // Array [{url, title, content, scrapedAt}]
  proposedChanges: jsonb('proposed_changes'), // Proposed CRM field updates
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const companyResearchesRelations = relations(companyResearches, ({ one }) => ({
  company: one(companies, {
    fields: [companyResearches.companyId],
    references: [companies.id],
  }),
}))

// ============================================
// Firecrawl Researches (Website-Crawl-Ergebnisse)
// ============================================
export const firecrawlResearches = pgTable('firecrawl_researches', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('completed'), // crawling | completed | failed
  pageCount: integer('page_count'),
  pages: jsonb('pages'), // Array [{url, title, markdown, scrapedAt}]
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const firecrawlResearchesRelations = relations(firecrawlResearches, ({ one }) => ({
  company: one(companies, {
    fields: [firecrawlResearches.companyId],
    references: [companies.id],
  }),
}))

// ============================================
// Business Documents (BI - Hochgeladene Geschäftsdokumente)
// ============================================
export const businessDocuments = pgTable('business_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  extractedText: text('extracted_text'),
  extractionStatus: varchar('extraction_status', { length: 20 }).default('pending'), // pending | processing | completed | failed
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const businessDocumentsRelations = relations(businessDocuments, ({ one }) => ({
  uploadedByUser: one(users, {
    fields: [businessDocuments.uploadedBy],
    references: [users.id],
  }),
}))

// ============================================
// Business Profiles (BI - KI-generiertes Geschäftsprofil)
// ============================================
export const businessProfiles = pgTable('business_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  businessModel: text('business_model'),
  swotAnalysis: jsonb('swot_analysis'), // {strengths, weaknesses, opportunities, threats}
  marketAnalysis: text('market_analysis'),
  financialSummary: text('financial_summary'),
  keyMetrics: jsonb('key_metrics'),
  recommendations: text('recommendations'),
  rawAnalysis: text('raw_analysis'),
  analyzedDocumentIds: text('analyzed_document_ids').array().default([]),
  lastAnalyzedAt: timestamp('last_analyzed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const businessProfilesRelations = relations(businessProfiles, ({ one }) => ({
}))

// ============================================
// Marketing Campaigns (Kampagnen)
// ============================================
export const marketingCampaigns = pgTable('marketing_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull(), // email | call | sms | multi
  status: varchar('status', { length: 20 }).default('draft'), // draft | active | paused | completed | archived
  targetAudience: text('target_audience'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  settings: jsonb('settings').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const marketingCampaignsRelations = relations(marketingCampaigns, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [marketingCampaigns.createdBy],
    references: [users.id],
  }),
  tasks: many(marketingTasks),
}))

// ============================================
// Marketing Tasks (Einzelaufgaben einer Kampagne)
// ============================================
export const marketingTasks = pgTable('marketing_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => marketingCampaigns.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // email | call | sms
  recipientEmail: varchar('recipient_email', { length: 255 }),
  recipientName: varchar('recipient_name', { length: 255 }),
  recipientCompany: varchar('recipient_company', { length: 255 }),
  personId: uuid('person_id').references(() => persons.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  subject: varchar('subject', { length: 255 }),
  content: text('content'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('draft'), // draft | scheduled | sent | failed
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_marketing_tasks_campaign').on(table.campaignId),
])

export const marketingTasksRelations = relations(marketingTasks, ({ one }) => ({
  campaign: one(marketingCampaigns, {
    fields: [marketingTasks.campaignId],
    references: [marketingCampaigns.id],
  }),
  person: one(persons, {
    fields: [marketingTasks.personId],
    references: [persons.id],
  }),
  company: one(companies, {
    fields: [marketingTasks.companyId],
    references: [companies.id],
  }),
}))

// ============================================
// Marketing Templates (Wiederverwendbare Vorlagen)
// ============================================
export const marketingTemplates = pgTable('marketing_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // email | call | sms
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const marketingTemplatesRelations = relations(marketingTemplates, ({ one }) => ({
}))

// ============================================
// Social Media Topics (Themen-Kategorien)
// ============================================
export const socialMediaTopics = pgTable('social_media_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#3b82f6'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const socialMediaTopicsRelations = relations(socialMediaTopics, ({ one, many }) => ({
  posts: many(socialMediaPosts),
}))

// ============================================
// Social Media Posts (Beitraege)
// ============================================
export const socialMediaPosts = pgTable('social_media_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id').references(() => socialMediaTopics.id, { onDelete: 'set null' }),
  platform: varchar('platform', { length: 30 }).notNull(), // linkedin | x | instagram | facebook | xing
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  hashtags: text('hashtags').array().default([]),
  imageUrl: varchar('image_url', { length: 500 }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  externalPostId: varchar('external_post_id', { length: 255 }),
  externalUrl: varchar('external_url', { length: 500 }),
  lastError: text('last_error'),
  postedVia: varchar('posted_via', { length: 20 }), // 'oauth' | 'legacy'
  status: varchar('status', { length: 20 }).default('draft'), // draft | scheduled | posted | failed
  aiGenerated: boolean('ai_generated').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const socialMediaPostsRelations = relations(socialMediaPosts, ({ one }) => ({
  topic: one(socialMediaTopics, {
    fields: [socialMediaPosts.topicId],
    references: [socialMediaTopics.id],
  }),
  createdByUser: one(users, {
    fields: [socialMediaPosts.createdBy],
    references: [users.id],
  }),
}))

// ============================================
// Type Exports
// ============================================
export type Organization = typeof organization.$inferSelect
export type NewOrganization = typeof organization.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

export type Person = typeof persons.$inferSelect
export type NewPerson = typeof persons.$inferInsert

export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert

export type ProductCategory = typeof productCategories.$inferSelect
export type NewProductCategory = typeof productCategories.$inferInsert

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert

export type AiProvider = typeof aiProviders.$inferSelect
export type NewAiProvider = typeof aiProviders.$inferInsert

export type AiLog = typeof aiLogs.$inferSelect
export type NewAiLog = typeof aiLogs.$inferInsert

export type AiPromptTemplate = typeof aiPromptTemplates.$inferSelect
export type NewAiPromptTemplate = typeof aiPromptTemplates.$inferInsert

export type Idea = typeof ideas.$inferSelect
export type NewIdea = typeof ideas.$inferInsert

export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert

export type Webhook = typeof webhooks.$inferSelect
export type NewWebhook = typeof webhooks.$inferInsert

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert

export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert

export type DocumentItem = typeof documentItems.$inferSelect
export type NewDocumentItem = typeof documentItems.$inferInsert

export type DinRequirement = typeof dinRequirements.$inferSelect
export type NewDinRequirement = typeof dinRequirements.$inferInsert

export type DinAuditSession = typeof dinAuditSessions.$inferSelect
export type NewDinAuditSession = typeof dinAuditSessions.$inferInsert

export type DinAnswer = typeof dinAnswers.$inferSelect
export type NewDinAnswer = typeof dinAnswers.$inferInsert

export type DinGrant = typeof dinGrants.$inferSelect
export type NewDinGrant = typeof dinGrants.$inferInsert

export type WibaRequirement = typeof wibaRequirements.$inferSelect
export type NewWibaRequirement = typeof wibaRequirements.$inferInsert

export type WibaAuditSession = typeof wibaAuditSessions.$inferSelect
export type NewWibaAuditSession = typeof wibaAuditSessions.$inferInsert

export type WibaAnswer = typeof wibaAnswers.$inferSelect
export type NewWibaAnswer = typeof wibaAnswers.$inferInsert

export type CmsPage = typeof cmsPages.$inferSelect
export type NewCmsPage = typeof cmsPages.$inferInsert

export type CmsBlock = typeof cmsBlocks.$inferSelect
export type NewCmsBlock = typeof cmsBlocks.$inferInsert

export type CmsBlockTemplate = typeof cmsBlockTemplates.$inferSelect
export type NewCmsBlockTemplate = typeof cmsBlockTemplates.$inferInsert

export type BlogPost = typeof blogPosts.$inferSelect
export type NewBlogPost = typeof blogPosts.$inferInsert

export type MediaUpload = typeof mediaUploads.$inferSelect
export type NewMediaUpload = typeof mediaUploads.$inferInsert

export type CompanyResearch = typeof companyResearches.$inferSelect
export type NewCompanyResearch = typeof companyResearches.$inferInsert

export type FirecrawlResearch = typeof firecrawlResearches.$inferSelect
export type NewFirecrawlResearch = typeof firecrawlResearches.$inferInsert

export type BusinessDocument = typeof businessDocuments.$inferSelect
export type NewBusinessDocument = typeof businessDocuments.$inferInsert

export type BusinessProfile = typeof businessProfiles.$inferSelect
export type NewBusinessProfile = typeof businessProfiles.$inferInsert

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect
export type NewMarketingCampaign = typeof marketingCampaigns.$inferInsert

export type MarketingTask = typeof marketingTasks.$inferSelect
export type NewMarketingTask = typeof marketingTasks.$inferInsert

export type MarketingTemplate = typeof marketingTemplates.$inferSelect
export type NewMarketingTemplate = typeof marketingTemplates.$inferInsert

export type SocialMediaTopic = typeof socialMediaTopics.$inferSelect
export type NewSocialMediaTopic = typeof socialMediaTopics.$inferInsert

export type SocialMediaPost = typeof socialMediaPosts.$inferSelect
export type NewSocialMediaPost = typeof socialMediaPosts.$inferInsert

// ============================================
// n8n Connections
// ============================================
export const n8nConnections = pgTable('n8n_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  apiUrl: varchar('api_url', { length: 500 }).notNull(),
  apiKey: text('api_key').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const n8nConnectionsRelations = relations(n8nConnections, ({ one }) => ({
}))

// ============================================
// n8n Workflow Logs
// ============================================
export const n8nWorkflowLogs = pgTable('n8n_workflow_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  n8nWorkflowId: varchar('n8n_workflow_id', { length: 100 }),
  n8nWorkflowName: varchar('n8n_workflow_name', { length: 255 }),
  prompt: text('prompt'),
  generatedJson: jsonb('generated_json'),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, deployed, active, error
  errorMessage: text('error_message'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const n8nWorkflowLogsRelations = relations(n8nWorkflowLogs, ({ one }) => ({
  creator: one(users, {
    fields: [n8nWorkflowLogs.createdBy],
    references: [users.id],
  }),
}))

export type N8nConnection = typeof n8nConnections.$inferSelect
export type NewN8nConnection = typeof n8nConnections.$inferInsert

export type N8nWorkflowLog = typeof n8nWorkflowLogs.$inferSelect
export type NewN8nWorkflowLog = typeof n8nWorkflowLogs.$inferInsert

// ============================================
// Opportunities (Google Maps Prospecting)
// ============================================
export const opportunities = pgTable('opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 255 }),
  address: varchar('address', { length: 500 }),
  city: varchar('city', { length: 255 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 10 }).default('DE'),
  phone: varchar('phone', { length: 100 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 500 }),
  rating: real('rating'),
  reviewCount: integer('review_count'),
  placeId: varchar('place_id', { length: 255 }),
  status: varchar('status', { length: 30 }).default('new').notNull(),
  source: varchar('source', { length: 50 }).default('google_maps'),
  searchQuery: varchar('search_query', { length: 255 }),
  searchLocation: varchar('search_location', { length: 255 }),
  convertedCompanyId: uuid('converted_company_id').references(() => companies.id, { onDelete: 'set null' }),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  convertedCompany: one(companies, { fields: [opportunities.convertedCompanyId], references: [companies.id] }),
}))

export type Opportunity = typeof opportunities.$inferSelect
export type NewOpportunity = typeof opportunities.$inferInsert

// ============================================
// Chat
// ============================================
export const chatConversations = pgTable('chat_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).default('Neuer Chat'),
  providerId: uuid('provider_id').references(() => aiProviders.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 100 }),
  context: jsonb('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  provider: one(aiProviders, {
    fields: [chatConversations.providerId],
    references: [aiProviders.id],
  }),
  messages: many(chatMessages),
}))

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => chatConversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_chat_messages_conversation').on(table.conversationId),
])

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}))

export type ChatConversation = typeof chatConversations.$inferSelect
export type NewChatConversation = typeof chatConversations.$inferInsert

export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert

// ============================================
// Cockpit Systems (IT-Infrastruktur)
// ============================================
export const cockpitSystems = pgTable('cockpit_systems', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  hostname: varchar('hostname', { length: 500 }),
  url: varchar('url', { length: 500 }),
  category: varchar('category', { length: 100 }),
  function: varchar('function', { length: 255 }),
  description: text('description'),
  ipAddress: varchar('ip_address', { length: 45 }),
  port: integer('port'),
  protocol: varchar('protocol', { length: 20 }),
  status: varchar('status', { length: 20 }).default('active'),
  tags: jsonb('tags').default([]),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const cockpitCredentials = pgTable('cockpit_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  systemId: uuid('system_id').notNull().references(() => cockpitSystems.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // login, api_key, ssh_key, certificate, token, database, ftp, other
  label: varchar('label', { length: 255 }).notNull(), // e.g. "Admin-Login", "API-Schluessel", "Root SSH"
  username: varchar('username', { length: 255 }),
  password: text('password'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cockpit_credentials_system').on(table.systemId),
])

export const cockpitSystemsRelations = relations(cockpitSystems, ({ one, many }) => ({
  creator: one(users, {
    fields: [cockpitSystems.createdBy],
    references: [users.id],
  }),
  credentials: many(cockpitCredentials),
}))

export const cockpitCredentialsRelations = relations(cockpitCredentials, ({ one }) => ({
  system: one(cockpitSystems, {
    fields: [cockpitCredentials.systemId],
    references: [cockpitSystems.id],
  }),
}))

export type CockpitSystem = typeof cockpitSystems.$inferSelect
export type NewCockpitSystem = typeof cockpitSystems.$inferInsert
export type CockpitCredential = typeof cockpitCredentials.$inferSelect
export type NewCockpitCredential = typeof cockpitCredentials.$inferInsert

// ============================================
// Generated Images (Bildgenerierung & Galerie)
// ============================================
export const generatedImages = pgTable('generated_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  prompt: text('prompt').notNull(),
  revisedPrompt: text('revised_prompt'),
  provider: varchar('provider', { length: 50 }).notNull(), // openai, fal
  model: varchar('model', { length: 100 }).notNull(), // dall-e-3, fal-ai/nano-banana
  size: varchar('size', { length: 30 }), // 1024x1024, 512x512, etc.
  style: varchar('style', { length: 30 }), // vivid, natural, etc.
  imageUrl: text('image_url').notNull(), // local path or external URL
  thumbnailUrl: text('thumbnail_url'),
  mimeType: varchar('mime_type', { length: 50 }).default('image/png'),
  sizeBytes: integer('size_bytes'),
  category: varchar('category', { length: 100 }), // social_media, website, blog, marketing, general
  tags: text('tags').array().default([]),
  metadata: jsonb('metadata').default({}),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const generatedImagesRelations = relations(generatedImages, ({ one }) => ({
  createdByUser: one(users, {
    fields: [generatedImages.createdBy],
    references: [users.id],
  }),
}))

export type GeneratedImage = typeof generatedImages.$inferSelect
export type NewGeneratedImage = typeof generatedImages.$inferInsert

// ============================================
// Processes (Prozesshandbuch)
// ============================================
export const processes = pgTable('processes', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const processesRelations = relations(processes, ({ one, many }) => ({
  tasks: many(processTasks),
}))

export type Process = typeof processes.$inferSelect
export type NewProcess = typeof processes.$inferInsert

// ============================================
// Process Tasks (Aufgaben im Prozesshandbuch)
// ============================================
export const processTasks = pgTable('process_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  processId: uuid('process_id').notNull().references(() => processes.id, { onDelete: 'cascade' }),
  taskKey: varchar('task_key', { length: 20 }).notNull(),
  subprocess: varchar('subprocess', { length: 255 }),
  title: varchar('title', { length: 255 }).notNull(),
  purpose: text('purpose'),
  trigger: text('trigger'),
  timeEstimate: varchar('time_estimate', { length: 50 }),
  automationPotential: varchar('automation_potential', { length: 20 }),
  tools: jsonb('tools').default([]),
  prerequisites: jsonb('prerequisites').default([]),
  steps: jsonb('steps').default([]),
  checklist: jsonb('checklist').default([]),
  expectedOutput: text('expected_output'),
  errorEscalation: text('error_escalation'),
  solution: text('solution'),
  // App-Abdeckung: wie gut deckt die App diese Aufgabe ab?
  appStatus: varchar('app_status', { length: 20 }).default('none'), // none, partial, full
  appNotes: text('app_notes'), // Beschreibung was die App kann / was fehlt
  appModule: varchar('app_module', { length: 100 }), // Zugeordnetes Modul in der App
  devRequirements: jsonb('dev_requirements'), // [{tool, neededFunction, approach, effort, priority}]
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_process_tasks_process').on(table.processId),
])

export const processTasksRelations = relations(processTasks, ({ one }) => ({
  process: one(processes, {
    fields: [processTasks.processId],
    references: [processes.id],
  }),
}))

export type ProcessTask = typeof processTasks.$inferSelect
export type NewProcessTask = typeof processTasks.$inferInsert

// ============================================
// Receipts (Belege)
// ============================================
export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: varchar('file_name', { length: 255 }),
  fileUrl: varchar('file_url', { length: 500 }),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  date: timestamp('date', { withTimezone: true }),
  vendor: varchar('vendor', { length: 255 }),
  category: varchar('category', { length: 100 }), // office, travel, software, other
  status: varchar('status', { length: 20 }).default('pending'), // pending, processed, archived
  ocrData: jsonb('ocr_data'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const receiptsRelations = relations(receipts, ({ one }) => ({
}))

export type Receipt = typeof receipts.$inferSelect
export type NewReceipt = typeof receipts.$inferInsert

// ============================================
// Feedback Forms
// ============================================
export const feedbackForms = pgTable('feedback_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  questions: jsonb('questions').default([]), // [{type: 'stars'|'text'|'scale', label, required}]
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  token: varchar('token', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_feedback_forms_token').on(table.token),
])

export const feedbackResponses = pgTable('feedback_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => feedbackForms.id, { onDelete: 'cascade' }),
  answers: jsonb('answers').default([]), // [{questionIndex, value}]
  npsScore: integer('nps_score'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_feedback_responses_form').on(table.formId),
])

export const feedbackFormsRelations = relations(feedbackForms, ({ one, many }) => ({
  company: one(companies, { fields: [feedbackForms.companyId], references: [companies.id] }),
  responses: many(feedbackResponses),
}))

export const feedbackResponsesRelations = relations(feedbackResponses, ({ one }) => ({
  form: one(feedbackForms, { fields: [feedbackResponses.formId], references: [feedbackForms.id] }),
}))

export type FeedbackForm = typeof feedbackForms.$inferSelect
export type FeedbackResponse = typeof feedbackResponses.$inferSelect

// ============================================
// Projects (Kanban)
// ============================================
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('active'), // active, completed, archived, on_hold
  projectType: varchar('project_type', { length: 20 }).default('kanban'), // kanban, okr, content
  priority: varchar('priority', { length: 20 }).default('mittel'), // hoch, mittel, niedrig
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  budget: numeric('budget', { precision: 10, scale: 2 }),
  color: varchar('color', { length: 7 }), // Hex color
  columns: jsonb('columns').default([
    { id: 'backlog', name: 'Backlog', color: '#94a3b8' },
    { id: 'todo', name: 'To Do', color: '#3b82f6' },
    { id: 'in_progress', name: 'In Arbeit', color: '#f59e0b' },
    { id: 'done', name: 'Fertig', color: '#22c55e' },
  ]),
  tags: text('tags').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const projectTasks = pgTable('project_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  columnId: varchar('column_id', { length: 50 }).default('backlog'),
  position: integer('position').default(0),
  priority: varchar('priority', { length: 20 }).default('mittel'), // hoch, mittel, niedrig, kritisch
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  startDate: timestamp('start_date', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  estimatedMinutes: integer('estimated_minutes'),
  checklist: jsonb('checklist').default([]), // [{text, checked}]
  labels: text('labels').array().default([]),
  comments: jsonb('comments').default([]), // [{userId, text, createdAt}]
  parentTaskId: uuid('parent_task_id'),
  delegatedTo: varchar('delegated_to', { length: 100 }),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_project_tasks_project').on(table.projectId),
  index('idx_project_tasks_column').on(table.projectId, table.columnId),
  index('idx_project_tasks_parent').on(table.parentTaskId),
])

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, { fields: [projects.companyId], references: [companies.id] }),
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  tasks: many(projectTasks),
}))

export const projectTasksRelations = relations(projectTasks, ({ one }) => ({
  project: one(projects, { fields: [projectTasks.projectId], references: [projects.id] }),
  assignedToUser: one(users, { fields: [projectTasks.assignedTo], references: [users.id] }),
}))

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectTask = typeof projectTasks.$inferSelect
export type NewProjectTask = typeof projectTasks.$inferInsert

// ============================================
// Document Templates (KI-Dokument-Generator)
// ============================================
export const documentTemplates = pgTable('document_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }), // report, proposal, protocol, security, runbook
  bodyHtml: text('body_html'), // HTML mit {{platzhalter}}
  placeholders: jsonb('placeholders').default([]), // [{key, label, description, aiFillable}]
  headerHtml: text('header_html'),
  footerHtml: text('footer_html'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const documentTemplatesRelations = relations(documentTemplates, ({ one }) => ({
}))

export type DocumentTemplate = typeof documentTemplates.$inferSelect

// ============================================
// Newsletter
// ============================================
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  tags: text('tags').array().default([]),
  status: varchar('status', { length: 20 }).default('active'), // active, unsubscribed, bounced
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
}, (table) => [
])

export const newsletterCampaigns = pgTable('newsletter_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  bodyHtml: text('body_html'),
  status: varchar('status', { length: 20 }).default('draft'), // draft, sending, sent, failed
  sentAt: timestamp('sent_at', { withTimezone: true }),
  stats: jsonb('stats').default({}), // {sent, opened, clicked, bounced, unsubscribed}
  segmentTags: text('segment_tags').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const newsletterSubscribersRelations = relations(newsletterSubscribers, ({ one }) => ({
}))

export const newsletterCampaignsRelations = relations(newsletterCampaigns, ({ one }) => ({
}))

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect

// ============================================
// Time Entries (Zeiterfassung)
// ============================================
export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  description: varchar('description', { length: 500 }),
  date: timestamp('date', { withTimezone: true }).notNull(),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  durationMinutes: integer('duration_minutes').default(0),
  billable: boolean('billable').default(true),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_time_entries_user_date').on(table.userId, table.date),
])

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
  company: one(companies, { fields: [timeEntries.companyId], references: [companies.id] }),
}))

export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert

// ============================================
// E-Mail Templates
// ============================================
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(), // Mit {{platzhalter}}
  bodyHtml: text('body_html').notNull(), // HTML mit {{platzhalter}}
  placeholders: jsonb('placeholders').default([]), // [{key, label, description}]
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
}))

export type EmailTemplate = typeof emailTemplates.$inferSelect
export type NewEmailTemplate = typeof emailTemplates.$inferInsert

// ============================================
// Task Queue (Ersetzt Cron-Jobs)
// ============================================
export const taskQueue = pgTable('task_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(), // email, reminder, follow_up, dunning, report, social_publish
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, running, completed, failed, cancelled
  priority: integer('priority').default(2), // 1=hoch, 2=mittel, 3=niedrig
  payload: jsonb('payload').default({}), // Aufgabenspezifische Daten
  result: jsonb('result'), // Ergebnis nach Ausfuehrung
  error: text('error'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).defaultNow(),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  referenceType: varchar('reference_type', { length: 50 }), // lead, invoice, person, company, document
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const taskQueueRelations = relations(taskQueue, ({ one }) => ({
}))

export type TaskQueueItem = typeof taskQueue.$inferSelect
export type NewTaskQueueItem = typeof taskQueue.$inferInsert

// ============================================
// Workflows (Konfigurierbare Automatisierungen)
// ============================================
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  trigger: varchar('trigger', { length: 100 }).notNull(), // e.g. 'contact.submitted', 'lead.created'
  steps: jsonb('steps').default([]).notNull(), // Array of { action, config?, condition?, label? }
  schedule: jsonb('schedule'), // { interval: '5min'|'15min'|'30min'|'60min'|'daily', dailyAt?: 'HH:MM' } | null
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_workflows_trigger').on(table.trigger),
  index('idx_workflows_active').on(table.isActive),
])

export type Workflow = typeof workflows.$inferSelect
export type NewWorkflow = typeof workflows.$inferInsert

// ============================================
// Workflow Runs (Ausführungsprotokolle)
// ============================================
export const workflowRuns = pgTable('workflow_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  trigger: varchar('trigger', { length: 100 }).notNull(),
  triggerData: jsonb('trigger_data').default({}),
  status: varchar('status', { length: 20 }).default('running').notNull(), // running, completed, failed, cancelled
  currentStep: integer('current_step').default(0),
  totalSteps: integer('total_steps').default(0),
  stepResults: jsonb('step_results').default([]), // Array of { step, action, status, result?, error?, duration_ms }
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_workflow_runs_workflow').on(table.workflowId),
  index('idx_workflow_runs_status').on(table.status),
  index('idx_workflow_runs_started').on(table.startedAt),
])

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowRuns.workflowId],
    references: [workflows.id],
  }),
}))

export type WorkflowRun = typeof workflowRuns.$inferSelect
export type NewWorkflowRun = typeof workflowRuns.$inferInsert

// ============================================
// E-Mail Accounts (IMAP/SMTP Konfiguration)
// ============================================
export const emailAccounts = pgTable('email_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(), // Display name, e.g. "Support", "Info"
  email: varchar('email', { length: 255 }).notNull(),
  // IMAP
  imapHost: varchar('imap_host', { length: 255 }).notNull(),
  imapPort: integer('imap_port').default(993),
  imapUser: varchar('imap_user', { length: 255 }).notNull(),
  imapPassword: text('imap_password').notNull(), // encrypted at rest
  imapTls: boolean('imap_tls').default(true),
  // SMTP
  smtpHost: varchar('smtp_host', { length: 255 }),
  smtpPort: integer('smtp_port').default(587),
  smtpUser: varchar('smtp_user', { length: 255 }),
  smtpPassword: text('smtp_password'),
  smtpTls: boolean('smtp_tls').default(true),
  // Signatur (HTML) — wird bei jedem Versand unten an den Body angehaengt
  signature: text('signature'),
  // Sync
  isActive: boolean('is_active').default(true),
  syncEnabled: boolean('sync_enabled').default(true),
  syncInterval: integer('sync_interval').default(5), // minutes
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastSyncError: text('last_sync_error'),
  syncFolder: varchar('sync_folder', { length: 100 }).default('INBOX'),
  // Meta
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_email_accounts_active').on(table.isActive),
  index('idx_email_accounts_email').on(table.email),
])

export type EmailAccount = typeof emailAccounts.$inferSelect
export type NewEmailAccount = typeof emailAccounts.$inferInsert

// ============================================
// E-Mails (Synchronisierte Nachrichten)
// ============================================
export const emails = pgTable('emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => emailAccounts.id, { onDelete: 'cascade' }),
  messageId: varchar('message_id', { length: 500 }), // RFC Message-ID
  uid: integer('uid'), // IMAP UID
  folder: varchar('folder', { length: 100 }).default('INBOX'),
  subject: text('subject'),
  fromAddress: varchar('from_address', { length: 255 }),
  fromName: varchar('from_name', { length: 255 }),
  toAddresses: jsonb('to_addresses').default([]), // [{address, name}]
  ccAddresses: jsonb('cc_addresses').default([]),
  bccAddresses: jsonb('bcc_addresses').default([]),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  snippet: varchar('snippet', { length: 500 }),
  date: timestamp('date', { withTimezone: true }),
  isRead: boolean('is_read').default(false),
  isStarred: boolean('is_starred').default(false),
  hasAttachments: boolean('has_attachments').default(false),
  attachments: jsonb('attachments').default([]), // [{filename, size, contentType}]
  headers: jsonb('headers').default({}),
  // Verknüpfungen
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  personId: uuid('person_id').references(() => persons.id, { onDelete: 'set null' }),
  // Direction
  direction: varchar('direction', { length: 10 }).default('inbound'), // inbound | outbound
  // Meta
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_emails_account').on(table.accountId),
  index('idx_emails_date').on(table.date),
  index('idx_emails_from').on(table.fromAddress),
  index('idx_emails_lead').on(table.leadId),
  index('idx_emails_company').on(table.companyId),
  index('idx_emails_person').on(table.personId),
  index('idx_emails_message_id').on(table.messageId),
  index('idx_emails_uid').on(table.accountId, table.uid),
])

export const emailsRelations = relations(emails, ({ one }) => ({
  account: one(emailAccounts, {
    fields: [emails.accountId],
    references: [emailAccounts.id],
  }),
  lead: one(leads, {
    fields: [emails.leadId],
    references: [leads.id],
  }),
  company: one(companies, {
    fields: [emails.companyId],
    references: [companies.id],
  }),
  person: one(persons, {
    fields: [emails.personId],
    references: [persons.id],
  }),
}))

export type Email = typeof emails.$inferSelect
export type NewEmail = typeof emails.$inferInsert

// ============================================
// Cron Jobs (Geplante Aufgaben)
// ============================================
export const cronJobs = pgTable('cron_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // Schedule
  interval: varchar('interval', { length: 20 }).notNull(), // '5min' | '15min' | '30min' | '60min' | 'daily'
  dailyAt: varchar('daily_at', { length: 5 }), // HH:MM for daily jobs, e.g. '08:00'
  // Action
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'api_call' | 'workflow' | 'email_sync' | 'custom'
  actionConfig: jsonb('action_config').default({}), // { url, method, workflowId, etc. }
  // State
  isActive: boolean('is_active').default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastRunStatus: varchar('last_run_status', { length: 20 }), // 'success' | 'failed' | 'running'
  lastRunError: text('last_run_error'),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  runCount: integer('run_count').default(0),
  // Meta
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cron_jobs_active').on(table.isActive),
  index('idx_cron_jobs_next_run').on(table.nextRunAt),
])

export type CronJob = typeof cronJobs.$inferSelect
export type NewCronJob = typeof cronJobs.$inferInsert

// ============================================
// Management Framework: EOS – Vision/Traction Organizer
// ============================================
export const vto = pgTable('vto', {
  id: uuid('id').primaryKey().defaultRandom(),
  coreValues: text('core_values').array().default([]),
  purposeNiche: jsonb('purpose_niche').default({}),
  tenYearTarget: text('ten_year_target'),
  marketingStrategy: jsonb('marketing_strategy').default({}),
  threeYearPicture: jsonb('three_year_picture').default({}),
  oneYearPlan: jsonb('one_year_plan').default({}),
  isActive: boolean('is_active').default(true),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

// ============================================
// Management Framework: EOS – Rocks (Quartalsprioritäten)
// ============================================
export const rocks = pgTable('rocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  quarter: varchar('quarter', { length: 10 }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('on-track'),
  linkedObjectiveIds: uuid('linked_objective_ids').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const rockMilestones = pgTable('rock_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  rockId: uuid('rock_id').notNull().references(() => rocks.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completed: boolean('completed').default(false),
  sequence: integer('sequence').default(0),
})

// ============================================
// Management Framework: EOS – Scorecard
// ============================================
export const scorecardMetrics = pgTable('scorecard_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 150 }).notNull(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  goal: numeric('goal', { precision: 15, scale: 2 }),
  unit: varchar('unit', { length: 20 }).default('Stk'),
  frequency: varchar('frequency', { length: 20 }).default('weekly'),
  isActive: boolean('is_active').default(true),
  sequence: integer('sequence').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

export const scorecardEntries = pgTable('scorecard_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricId: uuid('metric_id').notNull().references(() => scorecardMetrics.id, { onDelete: 'cascade' }),
  week: varchar('week', { length: 10 }).notNull(),
  actual: numeric('actual', { precision: 15, scale: 2 }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_scorecard_entries_metric_week').on(table.metricId, table.week),
])

// ============================================
// Management Framework: EOS – Issues (IDS-Liste)
// ============================================
export const eosIssues = pgTable('eos_issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 10 }).default('medium'),
  status: varchar('status', { length: 20 }).default('open'),
  createdBy: uuid('created_by').references(() => users.id),
  solution: text('solution'),
  solvedAt: timestamp('solved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

// ============================================
// Management Framework: EOS – Meeting Sessions (L10)
// ============================================
export const meetingSessions = pgTable('meeting_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).default('L10 Meeting'),
  meetingDate: timestamp('meeting_date', { withTimezone: true }).defaultNow(),
  status: varchar('status', { length: 20 }).default('open'),
  attendees: uuid('attendees').array().default([]),
  agenda: jsonb('agenda').default([]),
  notes: text('notes'),
  issuesDiscussed: uuid('issues_discussed').array().default([]),
  todoItems: jsonb('todo_items').default([]),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

// ============================================
// Management Framework: OKR – Zyklen
// ============================================
export const okrCycles = pgTable('okr_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).default('quarterly'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

// ============================================
// Management Framework: OKR – Objectives
// ============================================
export const okrObjectives = pgTable('okr_objectives', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id').notNull().references(() => okrCycles.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('active'),
  linkedRockIds: uuid('linked_rock_ids').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_okr_objectives_cycle').on(table.cycleId),
])

// ============================================
// Management Framework: OKR – Key Results
// ============================================
export const okrKeyResults = pgTable('okr_key_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  objectiveId: uuid('objective_id').notNull().references(() => okrObjectives.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  startValue: numeric('start_value', { precision: 15, scale: 2 }).default('0'),
  targetValue: numeric('target_value', { precision: 15, scale: 2 }).notNull(),
  currentValue: numeric('current_value', { precision: 15, scale: 2 }).default('0'),
  unit: varchar('unit', { length: 30 }).default('%'),
  confidence: smallint('confidence').default(1),
  sequence: integer('sequence').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_okr_kr_objective').on(table.objectiveId),
])

// ============================================
// Management Framework: OKR – Check-ins
// ============================================
export const okrCheckins = pgTable('okr_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyResultId: uuid('key_result_id').notNull().references(() => okrKeyResults.id, { onDelete: 'cascade' }),
  value: numeric('value', { precision: 15, scale: 2 }).notNull(),
  confidence: smallint('confidence'),
  note: text('note'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_okr_checkins_kr').on(table.keyResultId),
])

// ============================================
// Framework v2: Deliverable-Module
// ============================================
export const deliverableModules = pgTable('deliverable_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Modul-Identifikation
  code: varchar('code', { length: 10 }).notNull(),        // z.B. 'A1', 'B3', 'D2'
  name: varchar('name', { length: 255 }).notNull(),        // z.B. 'Neukundenakquise'
  // Kategorie (Buchstabe A-D aus Deliverable-Katalog)
  category: varchar('category', { length: 10 }).notNull(), // 'A' | 'B' | 'C' | 'D'
  categoryCode: varchar('category_code', { length: 10 }),  // z.B. 'V', 'M', 'IT' (Framework-Kategorie)
  // Inhalt
  ziel: text('ziel'),                                      // Modulziel aus Katalog
  preis: varchar('preis', { length: 100 }),                // z.B. '1.200 EUR'
  // Meta
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

// ============================================
// Framework v2: Deliverables
// ============================================
export const deliverables = pgTable('deliverables', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Modul-Zuordnung
  moduleId: uuid('module_id').references(() => deliverableModules.id, { onDelete: 'set null' }),
  // Identifikation
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // Typ & Format
  format: varchar('format', { length: 100 }),              // z.B. 'PDF', 'DOCX', 'Excel'
  umfang: varchar('umfang', { length: 100 }),              // z.B. '5-10 Seiten'
  trigger: varchar('trigger', { length: 255 }),            // Was loest die Erstellung aus?
  // Kategorisierung (Framework-Kategorie)
  category: varchar('category', { length: 50 }),           // z.B. 'IT & Cybersicherheit'
  categoryCode: varchar('category_code', { length: 10 }),  // z.B. 'IT', 'V', 'M'
  // Status & Versionierung
  status: varchar('status', { length: 20 }).default('draft'),
  version: varchar('version', { length: 20 }).default('1.0.0'),
  // Meta
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

// ============================================
// Management Framework: SOPs – Dokumente
// ============================================
export const sopDocuments = pgTable('sop_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  version: varchar('version', { length: 20 }).default('1.0.0'),
  status: varchar('status', { length: 20 }).default('draft'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  purpose: text('purpose'),
  scope: text('scope'),
  tools: text('tools').array().default([]),
  linkedSopIds: uuid('linked_sop_ids').array().default([]),
  tags: text('tags').array().default([]),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => users.id),
  reviewDate: timestamp('review_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  // Framework v2: Neue Felder (alle nullable fuer Abwaertskompatibilitaet)
  automationLevel: varchar('automation_level', { length: 20 }),           // SOP-01: 'manual' | 'semi' | 'full'
  aiCapable: boolean('ai_capable'),                                         // SOP-02
  maturityLevel: integer('maturity_level'),                                 // SOP-03: 1-5
  estimatedDurationMinutes: integer('estimated_duration_minutes'),          // SOP-05
  producesDeliverableId: uuid('produces_deliverable_id').references(() => deliverables.id, { onDelete: 'set null' }), // SOP-06
  subprocess: varchar('subprocess', { length: 255 }),                      // SOP-07
  sourceTaskId: varchar('source_task_id', { length: 50 }),                 // SOP-08: z.B. 'KP1-01'
}, (table) => [
])

// ============================================
// Management Framework: SOPs – Schritte
// ============================================
export const sopSteps = pgTable('sop_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  sopId: uuid('sop_id').notNull().references(() => sopDocuments.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  responsible: varchar('responsible', { length: 100 }),
  estimatedMinutes: integer('estimated_minutes'),
  checklistItems: text('checklist_items').array().default([]),
  warnings: text('warnings').array().default([]),
  // Framework v2: Neues Feld (nullable fuer Abwaertskompatibilitaet)
  executor: varchar('executor', { length: 10 }),  // SOP-04: 'agent' | 'human' | 'flex'
}, (table) => [
  index('idx_sop_steps_sop').on(table.sopId),
])

// ============================================
// Management Framework: SOPs – Versionshistorie
// ============================================
export const sopVersions = pgTable('sop_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sopId: uuid('sop_id').notNull().references(() => sopDocuments.id, { onDelete: 'cascade' }),
  version: varchar('version', { length: 20 }).notNull(),
  changeNote: text('change_note'),
  snapshot: jsonb('snapshot').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_sop_versions_sop').on(table.sopId),
])

// ============================================
// Framework v2: Execution Logs
// ============================================
export const executionLogs = pgTable('execution_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Was wurde ausgefuehrt?
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'sop' | 'deliverable'
  entityId: uuid('entity_id').notNull(),
  entityVersion: varchar('entity_version', { length: 20 }),
  // Zeitstempel
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  // Wer/Wie
  executedBy: varchar('executed_by', { length: 10 }).notNull(), // 'agent' | 'human'
  // Ergebnis
  status: varchar('status', { length: 20 }).notNull(),          // 'completed' | 'aborted' | 'escalated'
  abortReason: text('abort_reason'),
  qualityScore: real('quality_score'),                           // 0.0 - 1.0
  durationMinutes: real('duration_minutes'),
  costEstimateUsd: real('cost_estimate_usd'),
  flags: text('flags').array().default([]),
  // Verknuepfungen
  linkedClientId: uuid('linked_client_id'),
  linkedProjectId: uuid('linked_project_id'),
  // Genehmigung
  humanApproved: boolean('human_approved').default(false),
  humanApprovedBy: uuid('human_approved_by').references(() => users.id, { onDelete: 'set null' }),
  humanApprovedAt: timestamp('human_approved_at', { withTimezone: true }),
  // Meta
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
])

// Type exports: Management Framework
export type VTO = typeof vto.$inferSelect
export type Rock = typeof rocks.$inferSelect
export type NewRock = typeof rocks.$inferInsert
export type ScorecardMetric = typeof scorecardMetrics.$inferSelect
export type ScorecardEntry = typeof scorecardEntries.$inferSelect
export type EosIssue = typeof eosIssues.$inferSelect
export type MeetingSession = typeof meetingSessions.$inferSelect
export type OkrCycle = typeof okrCycles.$inferSelect
export type OkrObjective = typeof okrObjectives.$inferSelect
export type OkrKeyResult = typeof okrKeyResults.$inferSelect
export type OkrCheckin = typeof okrCheckins.$inferSelect
export type SopDocument = typeof sopDocuments.$inferSelect
export type NewSopDocument = typeof sopDocuments.$inferInsert
export type SopStep = typeof sopSteps.$inferSelect
export type SopVersion = typeof sopVersions.$inferSelect
// Type exports: Framework v2
export type DeliverableModule = typeof deliverableModules.$inferSelect
export type NewDeliverableModule = typeof deliverableModules.$inferInsert
export type Deliverable = typeof deliverables.$inferSelect
export type NewDeliverable = typeof deliverables.$inferInsert
export type ExecutionLog = typeof executionLogs.$inferSelect
export type NewExecutionLog = typeof executionLogs.$inferInsert

// ============================================
// Audit Logs — revisionssichere Aktions-Historie
// ============================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userRole: varchar('user_role', { length: 50 }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  payload: jsonb('payload').notNull().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_logs_user_id').on(table.userId, table.createdAt),
  index('idx_audit_logs_entity').on(table.entityType, table.entityId, table.createdAt),
  index('idx_audit_logs_action').on(table.action, table.createdAt),
])

export type AuditLog = typeof auditLogs.$inferSelect

// ============================================
// Company Change Requests — Portal P2: Firmendaten-Antrag
// ============================================
export const companyChangeRequests = pgTable('company_change_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // nullable because ON DELETE SET NULL preserves change-request history when user is deleted
  requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  proposedChanges: jsonb('proposed_changes').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewComment: text('review_comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_ccr_company').on(table.companyId, table.status, table.requestedAt),
  index('idx_ccr_status').on(table.status, table.requestedAt),
])

export type CompanyChangeRequest = typeof companyChangeRequests.$inferSelect
export type NewCompanyChangeRequest = typeof companyChangeRequests.$inferInsert
export type NewAuditLog = typeof auditLogs.$inferInsert

// ============================================
// Order Categories — Portal P4
// ============================================
export const orderCategories = pgTable('order_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  description: text('description'),
  color: varchar('color', { length: 30 }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_order_categories_active_sort').on(table.isActive, table.sortOrder),
])

export type OrderCategory = typeof orderCategories.$inferSelect
export type NewOrderCategory = typeof orderCategories.$inferInsert

// ============================================
// Orders — Portal P4: Service-Anfragen
// ============================================
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => orderCategories.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  priority: varchar('priority', { length: 20 }).notNull().default('mittel'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  contractId: uuid('contract_id').references(() => documents.id, { onDelete: 'set null' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  rejectReason: text('reject_reason'),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_orders_company_status').on(table.companyId, table.status, table.createdAt),
  index('idx_orders_status_priority').on(table.status, table.priority, table.createdAt),
  index('idx_orders_assigned').on(table.assignedTo, table.status),
])

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

// ============================================
// Portal Messages — Portal P5 (Admin ↔ Portal-User, 1:1 pro Firma)
// ============================================
export const portalMessages = pgTable('portal_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
  senderRole: varchar('sender_role', { length: 50 }).notNull(),
  bodyText: text('body_text').notNull(),
  readByPortalAt: timestamp('read_by_portal_at', { withTimezone: true }),
  readByAdminAt: timestamp('read_by_admin_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_portal_messages_company_created').on(table.companyId, table.createdAt),
  index('idx_portal_messages_sender').on(table.senderId),
])

export type PortalMessage = typeof portalMessages.$inferSelect
export type NewPortalMessage = typeof portalMessages.$inferInsert

// ============================================
// Portal Documents — P6
// ============================================
export const portalDocumentCategories = pgTable('portal_document_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  direction: varchar('direction', { length: 20 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  isSystem: boolean('is_system').default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_portal_doc_categories_direction').on(table.direction),
])

export const portalDocuments = pgTable('portal_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => portalDocumentCategories.id, { onDelete: 'restrict' }),
  direction: varchar('direction', { length: 20 }).notNull(),

  fileName: varchar('file_name', { length: 255 }).notNull(),
  storagePath: varchar('storage_path', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),

  linkedType: varchar('linked_type', { length: 20 }),
  linkedId: uuid('linked_id'),

  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  uploaderRole: varchar('uploader_role', { length: 20 }).notNull(),
  note: varchar('note', { length: 500 }),

  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedByUserId: uuid('deleted_by_user_id').references(() => users.id, { onDelete: 'set null' }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_portal_docs_company_dir_created').on(table.companyId, table.direction, table.createdAt.desc()),
  index('idx_portal_docs_linked').on(table.linkedType, table.linkedId),
  index('idx_portal_docs_category').on(table.categoryId),
])

export type PortalDocumentCategory = typeof portalDocumentCategories.$inferSelect
export type NewPortalDocumentCategory = typeof portalDocumentCategories.$inferInsert
export type PortalDocument = typeof portalDocuments.$inferSelect
export type NewPortalDocument = typeof portalDocuments.$inferInsert

// ============================================
// Onlinekurse (E-Learning) — Sub-Projekt 1: Core Authoring
// ============================================
export const courseVisibility = pgEnum('course_visibility', ['public', 'portal', 'both'])

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  subtitle: varchar('subtitle', { length: 300 }),
  description: text('description'),
  coverImageId: uuid('cover_image_id').references(() => mediaUploads.id, { onDelete: 'set null' }),
  visibility: courseVisibility('visibility').notNull().default('portal'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  useModules: boolean('use_modules').notNull().default(false),
  enforceSequential: boolean('enforce_sequential').notNull().default(false),
  estimatedMinutes: integer('estimated_minutes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_courses_status').on(t.status),
  visIdx: index('idx_courses_visibility').on(t.visibility, t.status),
}))

export const courseModules = pgTable('course_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  courseIdx: index('idx_course_modules_course').on(t.courseId, t.position),
}))

export const courseAssets = pgTable('course_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id'),
  kind: varchar('kind', { length: 20 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  label: varchar('label', { length: 200 }),
  position: integer('position'),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  courseIdx: index('idx_course_assets_course').on(t.courseId),
  lessonIdx: index('idx_course_assets_lesson').on(t.lessonId),
}))

export const courseLessons = pgTable('course_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  moduleId: uuid('module_id').references(() => courseModules.id, { onDelete: 'set null' }),
  position: integer('position').notNull(),
  slug: varchar('slug', { length: 160 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  contentMarkdown: text('content_markdown'),
  videoAssetId: uuid('video_asset_id').references(() => courseAssets.id, { onDelete: 'set null' }),
  videoExternalUrl: text('video_external_url'),
  durationMinutes: integer('duration_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  courseIdx: index('idx_course_lessons_course').on(t.courseId, t.position),
  moduleIdx: index('idx_course_lessons_module').on(t.moduleId, t.position),
  slugUnique: uniqueIndex('uq_course_lessons_slug').on(t.courseId, t.slug),
}))

export type Course = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert
export type CourseModule = typeof courseModules.$inferSelect
export type NewCourseModule = typeof courseModules.$inferInsert
export type CourseLesson = typeof courseLessons.$inferSelect
export type NewCourseLesson = typeof courseLessons.$inferInsert
export type CourseAsset = typeof courseAssets.$inferSelect
export type NewCourseAsset = typeof courseAssets.$inferInsert

// ============================================
// Course Lesson Blocks (polymorphe Lesson-Inhalte: Markdown + CMS-Block-Refs)
// ============================================
export const courseLessonBlocks = pgTable('course_lesson_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').notNull().references(() => courseLessons.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  kind: varchar('kind', { length: 20 }).notNull(),
  markdownBody: text('markdown_body'),
  blockType: varchar('block_type', { length: 50 }),
  content: jsonb('content').notNull().default({}),
  settings: jsonb('settings').notNull().default({}),
  isVisible: boolean('is_visible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_course_lesson_blocks_lesson').on(table.lessonId, table.position),
])

export type CourseLessonBlock = typeof courseLessonBlocks.$inferSelect
export type NewCourseLessonBlock = typeof courseLessonBlocks.$inferInsert

// ============================================
// Migration Tracking (managed by src/lib/db/migrator.ts)
// ============================================
// Declared here so drizzle-kit push --force preserves the table instead of
// dropping it. Without this, every deploy wipes migration history and the
// migrator re-runs all 19 entries from scratch (and dies on legacy 001).
export const dbMigrations = pgTable('_migrations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow(),
})

export type DbMigration = typeof dbMigrations.$inferSelect

// ============================================
// Onlinekurse Sub-3a: Lesson-Completion-Tracking
// ============================================
// Per-User-Tracking welche Lektionen abgeschlossen wurden.
// Nur Portal-User (angemeldet via session) → user_id ist die users.id.
// Eindeutigkeit (user × lesson) via uniqueIndex statt Composite-PK,
// um konsistent mit dem Rest des Schemas zu bleiben (Surrogat-IDs).
export const courseLessonProgress = pgTable('course_lesson_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => courseLessons.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_course_lesson_progress_user_lesson').on(table.userId, table.lessonId),
  index('idx_course_lesson_progress_user_course').on(table.userId, table.courseId),
])

export type CourseLessonProgress = typeof courseLessonProgress.$inferSelect
export type NewCourseLessonProgress = typeof courseLessonProgress.$inferInsert

// ============================================
// Onlinekurse Sub-3b: Course Certificates (Antrag → Approval → Issued)
// ============================================
// Ein Zertifikats-Antrag und das ausgestellte Zertifikat in EINER Tabelle.
// Status-Lebenszyklus:
//   requested  → User klickt "Zertifikat anfordern" (Voraussetzung: 100% Lessons)
//   issued     → Admin approved, identifier (public-verifiable) und issuedAt gesetzt
//   rejected   → Admin abgelehnt, reviewComment optional
//
// Eindeutigkeit (user × course): nur EIN Zertifikat pro User+Kurs (latest wins).
export const courseCertificates = pgTable('course_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('requested'),
  // Public-verifiable identifier (separater UUID, getrennt von id) — fuer
  // Sub-3c PDF-URL und kuenftige Verify-Endpunkte.
  identifier: uuid('identifier').notNull().defaultRandom(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewComment: text('review_comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_course_certificates_user_course').on(table.userId, table.courseId),
  uniqueIndex('uq_course_certificates_identifier').on(table.identifier),
  index('idx_course_certificates_status').on(table.status, table.requestedAt),
])

export type CourseCertificate = typeof courseCertificates.$inferSelect
export type NewCourseCertificate = typeof courseCertificates.$inferInsert

// ============================================
// User Groups (tenant-global, used for permission grants)
// ============================================
export const userGroups = pgTable('user_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_user_groups_name').on(table.name),
])

export const userGroupMembers = pgTable('user_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => userGroups.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_user_group_members_group_user').on(table.groupId, table.userId),
  index('idx_user_group_members_user').on(table.userId),
])

export type UserGroup = typeof userGroups.$inferSelect
export type NewUserGroup = typeof userGroups.$inferInsert
export type UserGroupMember = typeof userGroupMembers.$inferSelect
export type NewUserGroupMember = typeof userGroupMembers.$inferInsert

// ============================================
// Course Access Grants (allowlist per course; empty list = open to all portal users)
// ============================================
export const courseAccessSubjectKind = pgEnum('course_access_subject_kind', ['user', 'group'])

export const courseAccessGrants = pgTable('course_access_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  subjectKind: courseAccessSubjectKind('subject_kind').notNull(),
  subjectId: uuid('subject_id').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_course_access_grants').on(table.courseId, table.subjectKind, table.subjectId),
  index('idx_course_access_grants_course').on(table.courseId),
  index('idx_course_access_grants_subject').on(table.subjectKind, table.subjectId),
])

export type CourseAccessGrant = typeof courseAccessGrants.$inferSelect
export type NewCourseAccessGrant = typeof courseAccessGrants.$inferInsert

// ============================================
// Course Quizzes (Phase 2)
// ============================================
// One optional quiz per lesson. When present, lesson completion requires
// a passing attempt (score >= passThreshold). Manual "mark completed" is
// blocked while a quiz exists.
export const courseQuizzes = pgTable('course_quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').notNull().references(() => courseLessons.id, { onDelete: 'cascade' }),
  passThreshold: integer('pass_threshold').notNull().default(70), // 0–100
  allowRetake: boolean('allow_retake').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_course_quizzes_lesson').on(table.lessonId),
])

export const courseQuizQuestionKind = pgEnum('course_quiz_question_kind', [
  'single', 'multiple', 'truefalse',
])

// Options live as JSONB inside questions: [{ id, text, isCorrect }].
export const courseQuizQuestions = pgTable('course_quiz_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').notNull().references(() => courseQuizzes.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  kind: courseQuizQuestionKind('kind').notNull(),
  prompt: text('prompt').notNull(),
  options: jsonb('options').notNull().default([]),
  explanation: text('explanation'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_course_quiz_questions_quiz').on(table.quizId, table.position),
])

// Attempts capture user submissions. answers is JSONB: { [questionId]: string[] }.
export const courseQuizAttempts = pgTable('course_quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').notNull().references(() => courseQuizzes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(), // 0–100
  passed: boolean('passed').notNull(),
  answers: jsonb('answers').notNull().default({}),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_course_quiz_attempts_quiz_user').on(table.quizId, table.userId, table.completedAt),
])

export type CourseQuiz = typeof courseQuizzes.$inferSelect
export type NewCourseQuiz = typeof courseQuizzes.$inferInsert
export type CourseQuizQuestion = typeof courseQuizQuestions.$inferSelect
export type NewCourseQuizQuestion = typeof courseQuizQuestions.$inferInsert
export type CourseQuizAttempt = typeof courseQuizAttempts.$inferSelect
export type NewCourseQuizAttempt = typeof courseQuizAttempts.$inferInsert

export interface CourseQuizOption {
  id: string
  text: string
  isCorrect: boolean
}

// ============================================
// Course Assignments (Phase 3) — pflichtkurse mit Deadline + Reminder
// ============================================
// An assignment is a "you must do this" — distinct from access grants ("you
// may see this"). An assignment also implies access. Subject is either a
// user or a group, mirroring access grants.
export const courseAssignments = pgTable('course_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  subjectKind: courseAccessSubjectKind('subject_kind').notNull(),
  subjectId: uuid('subject_id').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('uq_course_assignments').on(table.courseId, table.subjectKind, table.subjectId),
  index('idx_course_assignments_course').on(table.courseId),
  index('idx_course_assignments_subject').on(table.subjectKind, table.subjectId),
  index('idx_course_assignments_due').on(table.dueDate),
])

export type CourseAssignment = typeof courseAssignments.$inferSelect
export type NewCourseAssignment = typeof courseAssignments.$inferInsert

// ============================================================================
// Terminbuchung Phase 1 — Calendar-Account-Verknüpfungen
// ============================================================================

export const userCalendarAccounts = pgTable('user_calendar_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull().default('google'),
  googleEmail: varchar('google_email', { length: 255 }).notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
  scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
  primaryCalendarId: varchar('primary_calendar_id', { length: 255 }),
  watchChannelId: uuid('watch_channel_id'),
  watchResourceId: varchar('watch_resource_id', { length: 255 }),
  watchExpiresAt: timestamp('watch_expires_at', { withTimezone: true }),
  syncToken: text('sync_token'),
  lastMessageNumber: bigint('last_message_number', { mode: 'number' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_user_calendar_accounts_user').on(table.userId).where(sql`revoked_at IS NULL`),
  activeUniq: uniqueIndex('idx_user_calendar_accounts_active').on(table.userId, table.provider).where(sql`revoked_at IS NULL`),
}))

export const userCalendarAccountsRelations = relations(userCalendarAccounts, ({ one, many }) => ({
  user: one(users, { fields: [userCalendarAccounts.userId], references: [users.id] }),
  watchedCalendars: many(userCalendarsWatched),
}))

export type UserCalendarAccount = typeof userCalendarAccounts.$inferSelect
export type NewUserCalendarAccount = typeof userCalendarAccounts.$inferInsert

export const userCalendarsWatched = pgTable('user_calendars_watched', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => userCalendarAccounts.id, { onDelete: 'cascade' }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  readForBusy: boolean('read_for_busy').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqAccountCalendar: uniqueIndex('uq_user_calendars_watched_account_calendar')
    .on(table.accountId, table.googleCalendarId),
  accountIdx: index('idx_user_calendars_watched_account').on(table.accountId),
}))

export const userCalendarsWatchedRelations = relations(userCalendarsWatched, ({ one }) => ({
  account: one(userCalendarAccounts, { fields: [userCalendarsWatched.accountId], references: [userCalendarAccounts.id] }),
}))

export type UserCalendarWatched = typeof userCalendarsWatched.$inferSelect
export type NewUserCalendarWatched = typeof userCalendarsWatched.$inferInsert

// ============================================================================
// Google Calendar Config — singleton row (admin-editable via UI in Pass 2)
// ============================================================================

export const googleCalendarConfig = pgTable('google_calendar_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: varchar('client_id', { length: 255 }),
  clientSecret: text('client_secret'),
  redirectUri: varchar('redirect_uri', { length: 500 }),
  appPublicUrl: varchar('app_public_url', { length: 255 }),
  tokenEncryptionKeyHex: varchar('token_encryption_key_hex', { length: 64 }).notNull(),
  appointmentTokenSecret: varchar('appointment_token_secret', { length: 128 }).notNull(),
  isSingleton: boolean('is_singleton').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  singletonUnique: unique('google_calendar_config_singleton').on(t.isSingleton),
}))

// ============================================================================
// Terminbuchung Phase 2 — Slot-Typen + Verfügbarkeit
// ============================================================================

export const slotTypes = pgTable('slot_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  bufferBeforeMinutes: integer('buffer_before_minutes').notNull().default(0),
  bufferAfterMinutes: integer('buffer_after_minutes').notNull().default(0),
  minNoticeHours: integer('min_notice_hours').notNull().default(24),
  maxAdvanceDays: integer('max_advance_days').notNull().default(60),
  color: varchar('color', { length: 7 }).notNull().default('#3b82f6'),
  isActive: boolean('is_active').notNull().default(true),
  location: varchar('location', { length: 20 }).notNull().default('phone'),
  locationDetails: text('location_details'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserSlug: uniqueIndex('uq_slot_types_user_slug').on(t.userId, t.slug),
  userActiveIdx: index('idx_slot_types_user_active').on(t.userId, t.isActive),
}))

export const slotTypesRelations = relations(slotTypes, ({ one }) => ({
  user: one(users, { fields: [slotTypes.userId], references: [users.id] }),
}))

export type SlotType = typeof slotTypes.$inferSelect
export type NewSlotType = typeof slotTypes.$inferInsert

export const availabilityRules = pgTable('availability_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dayOfWeek: smallint('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('idx_availability_rules_user').on(t.userId),
}))

export const availabilityRulesRelations = relations(availabilityRules, ({ one }) => ({
  user: one(users, { fields: [availabilityRules.userId], references: [users.id] }),
}))

export type AvailabilityRule = typeof availabilityRules.$inferSelect
export type NewAvailabilityRule = typeof availabilityRules.$inferInsert

export const availabilityOverrides = pgTable('availability_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  kind: varchar('kind', { length: 10 }).notNull(),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userStartIdx: index('idx_availability_overrides_user_start').on(t.userId, t.startAt),
}))

export const availabilityOverridesRelations = relations(availabilityOverrides, ({ one }) => ({
  user: one(users, { fields: [availabilityOverrides.userId], references: [users.id] }),
}))

export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect
export type NewAvailabilityOverride = typeof availabilityOverrides.$inferInsert

// ============================================================================
// Terminbuchung Phase 3 — externe Google-Events (Spiegel)
// ============================================================================

export const externalBusy = pgTable('external_busy', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => userCalendarAccounts.id, { onDelete: 'cascade' }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }).notNull(),
  googleEventId: varchar('google_event_id', { length: 255 }).notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  etag: varchar('etag', { length: 255 }),
  transparency: varchar('transparency', { length: 15 }).notNull().default('opaque'),
  isAllDay: boolean('is_all_day').notNull().default(false),
  summary: varchar('summary', { length: 500 }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqEvent: uniqueIndex('uq_external_busy_event').on(t.googleCalendarId, t.googleEventId),
  accountTimeIdx: index('idx_external_busy_account_time').on(t.accountId, t.startAt, t.endAt),
}))

export const externalBusyRelations = relations(externalBusy, ({ one }) => ({
  account: one(userCalendarAccounts, { fields: [externalBusy.accountId], references: [userCalendarAccounts.id] }),
}))

export type ExternalBusy = typeof externalBusy.$inferSelect
export type NewExternalBusy = typeof externalBusy.$inferInsert

// ============================================================================
// Terminbuchung Phase 4 — Buchungen
// ============================================================================

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slotTypeId: uuid('slot_type_id').notNull().references(() => slotTypes.id, { onDelete: 'restrict' }),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
  customerMessage: text('customer_message'),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  personId: uuid('person_id').references(() => persons.id, { onDelete: 'set null' }),
  source: varchar('source', { length: 20 }).notNull(),
  cancelTokenHash: varchar('cancel_token_hash', { length: 64 }),
  rescheduleTokenHash: varchar('reschedule_token_hash', { length: 64 }),
  icsSequence: integer('ics_sequence').notNull().default(0),
  googleEventId: varchar('google_event_id', { length: 255 }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }),
  syncError: text('sync_error'),
  staffNotes: text('staff_notes'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: varchar('cancelled_by', { length: 20 }),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userStartIdx: index('idx_appointments_user_start').on(t.userId, t.startAt),
  statusIdx: index('idx_appointments_status').on(t.status),
  googleEventIdx: index('idx_appointments_google_event').on(t.googleEventId).where(sql`google_event_id IS NOT NULL`),
  emailIdx: index('idx_appointments_email').on(t.customerEmail),
}))

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, { fields: [appointments.userId], references: [users.id] }),
  slotType: one(slotTypes, { fields: [appointments.slotTypeId], references: [slotTypes.id] }),
  lead: one(leads, { fields: [appointments.leadId], references: [leads.id] }),
  person: one(persons, { fields: [appointments.personId], references: [persons.id] }),
}))

export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert

// ============================================================================
// Social-Media Phase 1 — OAuth-Account-Verknüpfungen
// ============================================================================

export const socialOauthAccounts = pgTable('social_oauth_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 20 }).notNull(),
  externalAccountId: varchar('external_account_id', { length: 255 }).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
  meta: jsonb('meta').notNull().default(sql`'{}'::jsonb`),
  status: varchar('status', { length: 20 }).notNull().default('connected'),
  connectedBy: uuid('connected_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  oneActivePerProvider: uniqueIndex('idx_social_oauth_one_active_per_provider')
    .on(t.provider)
    .where(sql`status = 'connected'`),
  statusIdx: index('idx_social_oauth_status').on(t.status),
  tokenExpiryIdx: index('idx_social_oauth_token_expiry')
    .on(t.tokenExpiresAt)
    .where(sql`status = 'connected' AND token_expires_at IS NOT NULL`),
}))

export const socialOauthAccountsRelations = relations(socialOauthAccounts, ({ one }) => ({
  connectedByUser: one(users, {
    fields: [socialOauthAccounts.connectedBy],
    references: [users.id],
  }),
}))

export type SocialOauthAccount = typeof socialOauthAccounts.$inferSelect
export type NewSocialOauthAccount = typeof socialOauthAccounts.$inferInsert

// ============================================================================
// Social-Media Phase 2A — Posts + Targets
// ============================================================================

export const socialPosts = pgTable('social_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  masterBody: text('master_body').notNull().default(''),
  masterImagePath: varchar('master_image_path', { length: 500 }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_social_posts_status').on(t.status),
  scheduledIdx: index('idx_social_posts_scheduled').on(t.scheduledFor).where(sql`status = 'scheduled'`),
  createdByIdx: index('idx_social_posts_created_by').on(t.createdBy),
}))

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  creator: one(users, { fields: [socialPosts.createdBy], references: [users.id] }),
  approver: one(users, { fields: [socialPosts.approvedBy], references: [users.id] }),
  targets: many(socialPostTargets),
}))

export const socialPostTargets = pgTable('social_post_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(),
  bodyOverride: text('body_override'),
  publishStatus: varchar('publish_status', { length: 20 }).notNull().default('pending'),
  externalPostId: varchar('external_post_id', { length: 255 }),
  externalUrl: varchar('external_url', { length: 500 }),
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  postIdx: index('idx_social_post_targets_post').on(t.postId),
  statusIdx: index('idx_social_post_targets_status').on(t.publishStatus).where(sql`publish_status IN ('pending','publishing','failed')`),
  uniquePostProvider: uniqueIndex('uq_social_post_targets_post_provider').on(t.postId, t.provider),
}))

export const socialPostTargetsRelations = relations(socialPostTargets, ({ one }) => ({
  post: one(socialPosts, { fields: [socialPostTargets.postId], references: [socialPosts.id] }),
}))

export type SocialPost = typeof socialPosts.$inferSelect
export type NewSocialPost = typeof socialPosts.$inferInsert
export type SocialPostTarget = typeof socialPostTargets.$inferSelect
export type NewSocialPostTarget = typeof socialPostTargets.$inferInsert

export type GoogleCalendarConfig = typeof googleCalendarConfig.$inferSelect
