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
  cmsPages: many(cmsPages),
  cmsBlocks: many(cmsBlocks),
  cmsBlockTemplates: many(cmsBlockTemplates),
  blogPosts: many(blogPosts),
  mediaUploads: many(mediaUploads),
  companyResearches: many(companyResearches),
}))

// ============================================
// Roles (Rollen pro Tenant)
// ============================================
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_roles_tenant_id').on(table.tenantId),
  index('idx_roles_tenant_name').on(table.tenantId, table.name),
])

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('member'),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
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
  userRole: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
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
  companyResearches: many(companyResearches),
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
  index('idx_products_tenant_id').on(table.tenantId),
  index('idx_products_type').on(table.tenantId, table.type),
  index('idx_products_status').on(table.tenantId, table.status),
  index('idx_products_category_id').on(table.tenantId, table.categoryId),
  index('idx_products_sku').on(table.tenantId, table.sku),
  index('idx_products_name').on(table.tenantId, table.name),
  index('idx_products_slug').on(table.tenantId, table.slug),
  index('idx_products_is_public').on(table.tenantId, table.isPublic),
  index('idx_products_ean').on(table.tenantId, table.ean),
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
// AI Providers (Integrations Konfiguration)
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
// Documents (Rechnungen & Angebote)
// ============================================
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  // Metadata
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_documents_tenant_type').on(table.tenantId, table.type),
  index('idx_documents_tenant_status').on(table.tenantId, table.status),
  index('idx_documents_tenant_company').on(table.tenantId, table.companyId),
  index('idx_documents_tenant_number').on(table.tenantId, table.number),
  index('idx_documents_tenant_issue_date').on(table.tenantId, table.issueDate),
])

export const documentsRelations = relations(documents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_document_items_tenant_document').on(table.tenantId, table.documentId),
  index('idx_document_items_product').on(table.productId),
])

export const documentItemsRelations = relations(documentItems, ({ one }) => ({
  document: one(documents, {
    fields: [documentItems.documentId],
    references: [documents.id],
  }),
  tenant: one(tenants, {
    fields: [documentItems.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [documentItems.productId],
    references: [products.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientCompanyId: uuid('client_company_id').references(() => companies.id, { onDelete: 'set null' }),
  consultantId: uuid('consultant_id').references(() => users.id, { onDelete: 'set null' }),
  reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('draft'), // draft | in_progress | completed | approved
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_din_audit_sessions_tenant').on(table.tenantId),
  index('idx_din_audit_sessions_status').on(table.tenantId, table.status),
  index('idx_din_audit_sessions_client').on(table.tenantId, table.clientCompanyId),
])

export const dinAuditSessionsRelations = relations(dinAuditSessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dinAuditSessions.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').notNull().references(() => dinAuditSessions.id, { onDelete: 'cascade' }),
  requirementId: integer('requirement_id').notNull().references(() => dinRequirements.id),
  status: varchar('status', { length: 20 }).notNull(), // fulfilled | not_fulfilled | irrelevant
  justification: text('justification'),
  answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_din_answers_session').on(table.sessionId),
  index('idx_din_answers_tenant_session').on(table.tenantId, table.sessionId),
])

export const dinAnswersRelations = relations(dinAnswers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dinAnswers.tenantId],
    references: [tenants.id],
  }),
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
// DIN SPEC 27076 - Grants (Foerdermittel, statisch per Seed)
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
// CMS Pages (Editierbare Seiten)
// ============================================
export const cmsPages = pgTable('cms_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  seoTitle: varchar('seo_title', { length: 70 }),
  seoDescription: varchar('seo_description', { length: 160 }),
  seoKeywords: varchar('seo_keywords', { length: 255 }),
  ogImage: varchar('og_image', { length: 500 }),
  status: varchar('status', { length: 20 }).default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_pages_tenant_slug').on(table.tenantId, table.slug),
  index('idx_cms_pages_tenant_status').on(table.tenantId, table.status),
])

export const cmsPagesRelations = relations(cmsPages, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [cmsPages.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  blockType: varchar('block_type', { length: 50 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  content: jsonb('content').default({}),
  settings: jsonb('settings').default({}),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_blocks_page_sort').on(table.pageId, table.sortOrder),
  index('idx_cms_blocks_tenant').on(table.tenantId),
])

export const cmsBlocksRelations = relations(cmsBlocks, ({ one }) => ({
  page: one(cmsPages, {
    fields: [cmsBlocks.pageId],
    references: [cmsPages.id],
  }),
  tenant: one(tenants, {
    fields: [cmsBlocks.tenantId],
    references: [tenants.id],
  }),
}))

// ============================================
// CMS Block Templates (Wiederverwendbare Blockvorlagen)
// ============================================
export const cmsBlockTemplates = pgTable('cms_block_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  blockType: varchar('block_type', { length: 50 }).notNull(),
  content: jsonb('content').default({}),
  settings: jsonb('settings').default({}),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_block_templates_tenant').on(table.tenantId),
  index('idx_cms_block_templates_tenant_type').on(table.tenantId, table.blockType),
])

export const cmsBlockTemplatesRelations = relations(cmsBlockTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cmsBlockTemplates.tenantId],
    references: [tenants.id],
  }),
}))

// ============================================
// Blog Posts (Blog-Beiträge)
// ============================================
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_blog_posts_tenant_slug').on(table.tenantId, table.slug),
  index('idx_blog_posts_tenant_status').on(table.tenantId, table.status),
  index('idx_blog_posts_tenant_published').on(table.tenantId, table.publishedAt),
  index('idx_blog_posts_tenant_category').on(table.tenantId, table.category),
])

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [blogPosts.tenantId],
    references: [tenants.id],
  }),
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
}))

// ============================================
// Media Uploads (Hochgeladene Dateien)
// ============================================
export const mediaUploads = pgTable('media_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  alt: varchar('alt', { length: 255 }),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_media_uploads_tenant').on(table.tenantId),
])

export const mediaUploadsRelations = relations(mediaUploads, ({ one }) => ({
  tenant: one(tenants, {
    fields: [mediaUploads.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('completed'), // completed | applied | rejected
  researchData: jsonb('research_data'), // Full CompanyResearchResult + proposedProfileText
  scrapedPages: jsonb('scraped_pages'), // Array [{url, title, content, scrapedAt}]
  proposedChanges: jsonb('proposed_changes'), // Proposed CRM field updates
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_company_researches_tenant').on(table.tenantId),
  index('idx_company_researches_tenant_company').on(table.tenantId, table.companyId),
  index('idx_company_researches_tenant_status').on(table.tenantId, table.status),
])

export const companyResearchesRelations = relations(companyResearches, ({ one }) => ({
  tenant: one(tenants, {
    fields: [companyResearches.tenantId],
    references: [tenants.id],
  }),
  company: one(companies, {
    fields: [companyResearches.companyId],
    references: [companies.id],
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
