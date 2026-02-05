import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  decimal,
  inet,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// Tenants
// ============================================
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  settings: jsonb('settings').default({}),
  status: varchar('status', { length: 20 }).default('active'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_tenants_slug').on(table.slug),
  index('idx_tenants_status').on(table.status),
])

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
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
}))

// ============================================
// Users
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('member'),
  status: varchar('status', { length: 20 }).default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_users_tenant_id').on(table.tenantId),
  index('idx_users_email').on(table.email),
  index('idx_users_role').on(table.tenantId, table.role),
])

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  createdCompanies: many(companies),
  createdPersons: many(persons),
  assignedLeads: many(leads),
  apiKeys: many(apiKeys),
}))

// ============================================
// API Keys
// ============================================
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 10 }).notNull(),
  permissions: jsonb('permissions').default(['read', 'write']),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_api_keys_tenant_id').on(table.tenantId),
  index('idx_api_keys_key_prefix').on(table.keyPrefix),
])

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [apiKeys.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_companies_tenant_id').on(table.tenantId),
  index('idx_companies_status').on(table.tenantId, table.status),
  index('idx_companies_name').on(table.tenantId, table.name),
])

export const companiesRelations = relations(companies, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [companies.tenantId],
    references: [tenants.id],
  }),
  createdByUser: one(users, {
    fields: [companies.createdBy],
    references: [users.id],
  }),
  persons: many(persons),
  leads: many(leads),
  activities: many(activities),
}))

// ============================================
// Persons
// ============================================
export const persons = pgTable('persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
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
  // Metadata
  notes: text('notes'),
  customFields: jsonb('custom_fields').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_persons_tenant_id').on(table.tenantId),
  index('idx_persons_company_id').on(table.tenantId, table.companyId),
  index('idx_persons_email').on(table.tenantId, table.email),
  index('idx_persons_name').on(table.tenantId, table.lastName, table.firstName),
])

export const personsRelations = relations(persons, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [persons.tenantId],
    references: [tenants.id],
  }),
  company: one(companies, {
    fields: [persons.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [persons.createdBy],
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  // Metadata
  tags: text('tags').array().default([]),
  notes: text('notes'),
  // Raw Data
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_leads_tenant_id').on(table.tenantId),
  index('idx_leads_status').on(table.tenantId, table.status),
  index('idx_leads_ai_status').on(table.tenantId, table.aiResearchStatus),
  index('idx_leads_assigned_to').on(table.tenantId, table.assignedTo),
])

export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }),
  description: text('description'),
  parentId: uuid('parent_id'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_product_categories_tenant_id').on(table.tenantId),
  index('idx_product_categories_slug').on(table.tenantId, table.slug),
  index('idx_product_categories_parent_id').on(table.tenantId, table.parentId),
])

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [productCategories.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  // Metadata
  notes: text('notes'),
  customFields: jsonb('custom_fields').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_products_tenant_id').on(table.tenantId),
  index('idx_products_type').on(table.tenantId, table.type),
  index('idx_products_status').on(table.tenantId, table.status),
  index('idx_products_category_id').on(table.tenantId, table.categoryId),
  index('idx_products_sku').on(table.tenantId, table.sku),
  index('idx_products_name').on(table.tenantId, table.name),
])

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
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
// AI Providers (KI-Anbieter Konfiguration)
// ============================================
export const aiProviders = pgTable('ai_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_ai_providers_tenant_id').on(table.tenantId),
  index('idx_ai_providers_active').on(table.tenantId, table.isActive),
  index('idx_ai_providers_priority').on(table.tenantId, table.priority),
])

export const aiProvidersRelations = relations(aiProviders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [aiProviders.tenantId],
    references: [tenants.id],
  }),
  logs: many(aiLogs),
}))

// ============================================
// AI Logs (KI Prompt/Response Logging)
// ============================================
export const aiLogs = pgTable('ai_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_ai_logs_tenant_id').on(table.tenantId),
  index('idx_ai_logs_provider').on(table.tenantId, table.providerType),
  index('idx_ai_logs_status').on(table.tenantId, table.status),
  index('idx_ai_logs_feature').on(table.tenantId, table.feature),
  index('idx_ai_logs_created_at').on(table.tenantId, table.createdAt),
])

export const aiLogsRelations = relations(aiLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [aiLogs.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_ai_prompt_templates_tenant_slug').on(table.tenantId, table.slug),
  index('idx_ai_prompt_templates_tenant_active').on(table.tenantId, table.isActive),
])

export const aiPromptTemplatesRelations = relations(aiPromptTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [aiPromptTemplates.tenantId],
    references: [tenants.id],
  }),
}))

// ============================================
// Ideas (Ideen-Labor)
// ============================================
export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  rawContent: text('raw_content').notNull(),
  structuredContent: jsonb('structured_content').default({}),
  type: varchar('type', { length: 20 }).notNull().default('text'), // text | voice
  status: varchar('status', { length: 20 }).default('backlog'), // backlog | in_progress | converted
  tags: text('tags').array().default([]),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_ideas_tenant_id').on(table.tenantId),
  index('idx_ideas_status').on(table.tenantId, table.status),
])

export const ideasRelations = relations(ideas, ({ one }) => ({
  tenant: one(tenants, {
    fields: [ideas.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_activities_tenant_id').on(table.tenantId),
  index('idx_activities_lead').on(table.tenantId, table.leadId),
  index('idx_activities_company').on(table.tenantId, table.companyId),
  index('idx_activities_person').on(table.tenantId, table.personId),
  index('idx_activities_created_at').on(table.tenantId, table.createdAt),
])

export const activitiesRelations = relations(activities, ({ one }) => ({
  tenant: one(tenants, {
    fields: [activities.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_webhooks_tenant_id').on(table.tenantId),
  index('idx_webhooks_active').on(table.tenantId, table.isActive),
])

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [webhooks.tenantId],
    references: [tenants.id],
  }),
}))

// ============================================
// Audit Log
// ============================================
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_audit_log_tenant_id').on(table.tenantId),
  index('idx_audit_log_entity').on(table.entityType, table.entityId),
  index('idx_audit_log_created_at').on(table.createdAt),
])

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLog.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}))

// ============================================
// Type Exports
// ============================================
export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

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
