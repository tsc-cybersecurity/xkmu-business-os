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
  numeric,
  real,
  inet,
  index,
  serial,
  smallint,
  char,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// Tenants
// ============================================
export const tenants = pgTable('tenants', {
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
  wibaAuditSessions: many(wibaAuditSessions),
  wibaAnswers: many(wibaAnswers),
  cmsPages: many(cmsPages),
  cmsBlocks: many(cmsBlocks),
  cmsBlockTemplates: many(cmsBlockTemplates),
  blogPosts: many(blogPosts),
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
  index('idx_companies_created_at').on(table.tenantId, table.createdAt),
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
  firecrawlResearches: many(firecrawlResearches),
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
  birthday: timestamp('birthday', { withTimezone: true }),
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
  index('idx_persons_created_at').on(table.tenantId, table.createdAt),
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
  index('idx_leads_company_id').on(table.tenantId, table.companyId),
  index('idx_leads_person_id').on(table.tenantId, table.personId),
  index('idx_leads_created_at').on(table.tenantId, table.createdAt),
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
  index('idx_activities_type').on(table.tenantId, table.type),
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
// Contract Templates
// ============================================
export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_contract_templates_tenant').on(table.tenantId),
  index('idx_contract_templates_category').on(table.category),
])

export const contractTemplatesRelations = relations(contractTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [contractTemplates.tenantId],
    references: [tenants.id],
  }),
}))

// ============================================
// Contract Clauses (Bausteine)
// ============================================
export const contractClauses = pgTable('contract_clauses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  bodyHtml: text('body_html'),
  isSystem: boolean('is_system').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_contract_clauses_tenant').on(table.tenantId),
  index('idx_contract_clauses_category').on(table.category),
])

export const contractClausesRelations = relations(contractClauses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [contractClauses.tenantId],
    references: [tenants.id],
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientCompanyId: uuid('client_company_id').references(() => companies.id, { onDelete: 'set null' }),
  consultantId: uuid('consultant_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('draft'), // draft | in_progress | completed
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_wiba_audit_sessions_tenant').on(table.tenantId),
  index('idx_wiba_audit_sessions_status').on(table.tenantId, table.status),
  index('idx_wiba_audit_sessions_client').on(table.tenantId, table.clientCompanyId),
])

export const wibaAuditSessionsRelations = relations(wibaAuditSessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [wibaAuditSessions.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').notNull().references(() => wibaAuditSessions.id, { onDelete: 'cascade' }),
  requirementId: integer('requirement_id').notNull().references(() => wibaRequirements.id),
  status: varchar('status', { length: 20 }).notNull(), // ja | nein | nicht_relevant
  notes: text('notes'),
  answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_wiba_answers_session').on(table.sessionId),
  index('idx_wiba_answers_tenant_session').on(table.tenantId, table.sessionId),
])

export const wibaAnswersRelations = relations(wibaAnswers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [wibaAnswers.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientCompanyId: uuid('client_company_id').references(() => companies.id, { onDelete: 'set null' }),
  consultantId: uuid('consultant_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }),
  status: varchar('status', { length: 20 }).default('draft'), // draft, in_progress, completed
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_grundschutz_sessions_tenant').on(table.tenantId),
  index('idx_grundschutz_sessions_status').on(table.tenantId, table.status),
  index('idx_grundschutz_sessions_client').on(table.tenantId, table.clientCompanyId),
])

export const grundschutzAnswers = pgTable('grundschutz_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').notNull().references(() => grundschutzAuditSessions.id, { onDelete: 'cascade' }),
  controlId: varchar('control_id', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).default('offen'), // erfuellt, teilweise, nicht_erfuellt, nicht_relevant, offen
  notes: text('notes'),
  answeredAt: timestamp('answered_at', { withTimezone: true }),
}, (table) => [
  index('idx_grundschutz_answers_session').on(table.sessionId),
])

export const grundschutzAuditSessionsRelations = relations(grundschutzAuditSessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [grundschutzAuditSessions.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_gs_assets_tenant').on(table.tenantId),
  index('idx_gs_assets_company').on(table.tenantId, table.companyId),
  index('idx_gs_assets_category').on(table.tenantId, table.categoryType),
  index('idx_gs_assets_status').on(table.tenantId, table.status),
])

export const grundschutzAssetRelationsTable = pgTable('grundschutz_asset_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_gs_asset_ctrl_tenant').on(table.tenantId),
])

export const grundschutzAssetsRelations = relations(grundschutzAssets, ({ one, many }) => ({
  tenant: one(tenants, { fields: [grundschutzAssets.tenantId], references: [tenants.id] }),
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
  label: varchar('label', { length: 100 }).notNull(),
  colorHex: char('color_hex', { length: 6 }),
  deadlineHours: numeric('deadline_hours', { precision: 6, scale: 2 }),
  condition: varchar('condition', { length: 200 }),
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
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
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
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
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
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
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
// CMS Navigation Items (Navigations-Einträge)
// ============================================
export const cmsNavigationItems = pgTable('cms_navigation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_cms_nav_items_tenant_location_sort').on(table.tenantId, table.location, table.sortOrder),
])

export const cmsNavigationItemsRelations = relations(cmsNavigationItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cmsNavigationItems.tenantId],
    references: [tenants.id],
  }),
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
  defaultContent: jsonb('default_content').default({}),
  defaultSettings: jsonb('default_settings').default({}),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_block_type_defs_slug').on(table.slug),
  index('idx_cms_block_type_defs_active').on(table.isActive),
])

export type CmsBlockTypeDefinition = typeof cmsBlockTypeDefinitions.$inferSelect
export type NewCmsBlockTypeDefinition = typeof cmsBlockTypeDefinitions.$inferInsert

// ============================================
// CMS Settings (Design & Konfiguration pro Tenant)
// ============================================
export const cmsSettings = pgTable('cms_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_cms_settings_tenant_key').on(table.tenantId, table.key),
])

export const cmsSettingsRelations = relations(cmsSettings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cmsSettings.tenantId],
    references: [tenants.id],
  }),
}))

export type CmsSettings = typeof cmsSettings.$inferSelect
export type NewCmsSettings = typeof cmsSettings.$inferInsert

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
  index('idx_media_uploads_created_at').on(table.tenantId, table.createdAt),
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
// Firecrawl Researches (Website-Crawl-Ergebnisse)
// ============================================
export const firecrawlResearches = pgTable('firecrawl_researches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('completed'), // crawling | completed | failed
  pageCount: integer('page_count'),
  pages: jsonb('pages'), // Array [{url, title, markdown, scrapedAt}]
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_firecrawl_researches_tenant').on(table.tenantId),
  index('idx_firecrawl_researches_tenant_company').on(table.tenantId, table.companyId),
])

export const firecrawlResearchesRelations = relations(firecrawlResearches, ({ one }) => ({
  tenant: one(tenants, {
    fields: [firecrawlResearches.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  extractedText: text('extracted_text'),
  extractionStatus: varchar('extraction_status', { length: 20 }).default('pending'), // pending | processing | completed | failed
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_business_documents_tenant').on(table.tenantId),
  index('idx_business_documents_status').on(table.tenantId, table.extractionStatus),
])

export const businessDocumentsRelations = relations(businessDocuments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [businessDocuments.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_business_profiles_tenant').on(table.tenantId),
])

export const businessProfilesRelations = relations(businessProfiles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [businessProfiles.tenantId],
    references: [tenants.id],
  }),
}))

// ============================================
// Marketing Campaigns (Kampagnen)
// ============================================
export const marketingCampaigns = pgTable('marketing_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_marketing_campaigns_tenant').on(table.tenantId),
  index('idx_marketing_campaigns_status').on(table.tenantId, table.status),
  index('idx_marketing_campaigns_type').on(table.tenantId, table.type),
])

export const marketingCampaignsRelations = relations(marketingCampaigns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [marketingCampaigns.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_marketing_tasks_tenant').on(table.tenantId),
  index('idx_marketing_tasks_campaign').on(table.campaignId),
  index('idx_marketing_tasks_status').on(table.tenantId, table.status),
  index('idx_marketing_tasks_scheduled').on(table.tenantId, table.scheduledAt),
])

export const marketingTasksRelations = relations(marketingTasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [marketingTasks.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // email | call | sms
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_marketing_templates_tenant').on(table.tenantId),
  index('idx_marketing_templates_type').on(table.tenantId, table.type),
])

export const marketingTemplatesRelations = relations(marketingTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [marketingTemplates.tenantId],
    references: [tenants.id],
  }),
}))

// ============================================
// Social Media Topics (Themen-Kategorien)
// ============================================
export const socialMediaTopics = pgTable('social_media_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#3b82f6'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_social_media_topics_tenant').on(table.tenantId),
])

export const socialMediaTopicsRelations = relations(socialMediaTopics, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [socialMediaTopics.tenantId],
    references: [tenants.id],
  }),
  posts: many(socialMediaPosts),
}))

// ============================================
// Social Media Posts (Beitraege)
// ============================================
export const socialMediaPosts = pgTable('social_media_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').references(() => socialMediaTopics.id, { onDelete: 'set null' }),
  platform: varchar('platform', { length: 30 }).notNull(), // linkedin | twitter | instagram | facebook | xing
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  hashtags: text('hashtags').array().default([]),
  imageUrl: varchar('image_url', { length: 500 }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('draft'), // draft | scheduled | posted | failed
  aiGenerated: boolean('ai_generated').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_social_media_posts_tenant').on(table.tenantId),
  index('idx_social_media_posts_platform').on(table.tenantId, table.platform),
  index('idx_social_media_posts_status').on(table.tenantId, table.status),
  index('idx_social_media_posts_scheduled').on(table.tenantId, table.scheduledAt),
  index('idx_social_media_posts_topic').on(table.tenantId, table.topicId),
])

export const socialMediaPostsRelations = relations(socialMediaPosts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [socialMediaPosts.tenantId],
    references: [tenants.id],
  }),
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
// n8n Connections (pro Tenant)
// ============================================
export const n8nConnections = pgTable('n8n_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  apiUrl: varchar('api_url', { length: 500 }).notNull(),
  apiKey: text('api_key').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_n8n_connections_tenant_id').on(table.tenantId),
])

export const n8nConnectionsRelations = relations(n8nConnections, ({ one }) => ({
  tenant: one(tenants, {
    fields: [n8nConnections.tenantId],
    references: [tenants.id],
  }),
}))

// ============================================
// n8n Workflow Logs
// ============================================
export const n8nWorkflowLogs = pgTable('n8n_workflow_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_n8n_workflow_logs_tenant_id').on(table.tenantId),
  index('idx_n8n_workflow_logs_status').on(table.tenantId, table.status),
])

export const n8nWorkflowLogsRelations = relations(n8nWorkflowLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [n8nWorkflowLogs.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_opportunities_tenant').on(table.tenantId),
  index('idx_opportunities_status').on(table.tenantId, table.status),
  index('idx_opportunities_created_at').on(table.tenantId, table.createdAt),
  index('idx_opportunities_city').on(table.tenantId, table.city),
  index('idx_opportunities_place_id').on(table.tenantId, table.placeId),
])

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  tenant: one(tenants, { fields: [opportunities.tenantId], references: [tenants.id] }),
  convertedCompany: one(companies, { fields: [opportunities.convertedCompanyId], references: [companies.id] }),
}))

export type Opportunity = typeof opportunities.$inferSelect
export type NewOpportunity = typeof opportunities.$inferInsert

// ============================================
// Chat
// ============================================
export const chatConversations = pgTable('chat_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).default('Neuer Chat'),
  providerId: uuid('provider_id').references(() => aiProviders.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 100 }),
  context: jsonb('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_chat_conversations_tenant_user').on(table.tenantId, table.userId),
  index('idx_chat_conversations_created').on(table.tenantId, table.createdAt),
])

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [chatConversations.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_cockpit_systems_tenant').on(table.tenantId),
  index('idx_cockpit_systems_category').on(table.tenantId, table.category),
  index('idx_cockpit_systems_status').on(table.tenantId, table.status),
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
  tenant: one(tenants, {
    fields: [cockpitSystems.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_generated_images_tenant').on(table.tenantId),
  index('idx_generated_images_category').on(table.tenantId, table.category),
  index('idx_generated_images_created_at').on(table.tenantId, table.createdAt),
])

export const generatedImagesRelations = relations(generatedImages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [generatedImages.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_processes_tenant').on(table.tenantId),
  index('idx_processes_tenant_key').on(table.tenantId, table.key),
])

export const processesRelations = relations(processes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [processes.tenantId],
    references: [tenants.id],
  }),
  tasks: many(processTasks),
}))

export type Process = typeof processes.$inferSelect
export type NewProcess = typeof processes.$inferInsert

// ============================================
// Process Tasks (Aufgaben im Prozesshandbuch)
// ============================================
export const processTasks = pgTable('process_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_process_tasks_tenant').on(table.tenantId),
  index('idx_process_tasks_process').on(table.processId),
  index('idx_process_tasks_tenant_key').on(table.tenantId, table.taskKey),
  index('idx_process_tasks_app_status').on(table.tenantId, table.appStatus),
])

export const processTasksRelations = relations(processTasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [processTasks.tenantId],
    references: [tenants.id],
  }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_receipts_tenant').on(table.tenantId),
  index('idx_receipts_tenant_date').on(table.tenantId, table.date),
])

export const receiptsRelations = relations(receipts, ({ one }) => ({
  tenant: one(tenants, { fields: [receipts.tenantId], references: [tenants.id] }),
}))

export type Receipt = typeof receipts.$inferSelect
export type NewReceipt = typeof receipts.$inferInsert

// ============================================
// Feedback Forms
// ============================================
export const feedbackForms = pgTable('feedback_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  questions: jsonb('questions').default([]), // [{type: 'stars'|'text'|'scale', label, required}]
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  token: varchar('token', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_feedback_forms_tenant').on(table.tenantId),
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
  tenant: one(tenants, { fields: [feedbackForms.tenantId], references: [tenants.id] }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_projects_tenant').on(table.tenantId),
  index('idx_projects_tenant_status').on(table.tenantId, table.status),
])

export const projectTasks = pgTable('project_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_project_tasks_project').on(table.projectId),
  index('idx_project_tasks_column').on(table.projectId, table.columnId),
])

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, { fields: [projects.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [projects.companyId], references: [companies.id] }),
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  tasks: many(projectTasks),
}))

export const projectTasksRelations = relations(projectTasks, ({ one }) => ({
  tenant: one(tenants, { fields: [projectTasks.tenantId], references: [tenants.id] }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }), // report, proposal, protocol, security, runbook
  bodyHtml: text('body_html'), // HTML mit {{platzhalter}}
  placeholders: jsonb('placeholders').default([]), // [{key, label, description, aiFillable}]
  headerHtml: text('header_html'),
  footerHtml: text('footer_html'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_document_templates_tenant').on(table.tenantId),
  index('idx_document_templates_category').on(table.tenantId, table.category),
])

export const documentTemplatesRelations = relations(documentTemplates, ({ one }) => ({
  tenant: one(tenants, { fields: [documentTemplates.tenantId], references: [tenants.id] }),
}))

export type DocumentTemplate = typeof documentTemplates.$inferSelect

// ============================================
// Newsletter
// ============================================
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  tags: text('tags').array().default([]),
  status: varchar('status', { length: 20 }).default('active'), // active, unsubscribed, bounced
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
}, (table) => [
  index('idx_newsletter_subs_tenant').on(table.tenantId),
  index('idx_newsletter_subs_tenant_email').on(table.tenantId, table.email),
])

export const newsletterCampaigns = pgTable('newsletter_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_newsletter_campaigns_tenant').on(table.tenantId),
])

export const newsletterSubscribersRelations = relations(newsletterSubscribers, ({ one }) => ({
  tenant: one(tenants, { fields: [newsletterSubscribers.tenantId], references: [tenants.id] }),
}))

export const newsletterCampaignsRelations = relations(newsletterCampaigns, ({ one }) => ({
  tenant: one(tenants, { fields: [newsletterCampaigns.tenantId], references: [tenants.id] }),
}))

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect

// ============================================
// Time Entries (Zeiterfassung)
// ============================================
export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_time_entries_tenant').on(table.tenantId),
  index('idx_time_entries_tenant_date').on(table.tenantId, table.date),
  index('idx_time_entries_tenant_company').on(table.tenantId, table.companyId),
  index('idx_time_entries_user_date').on(table.userId, table.date),
])

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [timeEntries.tenantId], references: [tenants.id] }),
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
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(), // Mit {{platzhalter}}
  bodyHtml: text('body_html').notNull(), // HTML mit {{platzhalter}}
  placeholders: jsonb('placeholders').default([]), // [{key, label, description}]
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_email_templates_tenant').on(table.tenantId),
  index('idx_email_templates_tenant_slug').on(table.tenantId, table.slug),
])

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [emailTemplates.tenantId],
    references: [tenants.id],
  }),
}))

export type EmailTemplate = typeof emailTemplates.$inferSelect
export type NewEmailTemplate = typeof emailTemplates.$inferInsert

// ============================================
// Task Queue (Ersetzt Cron-Jobs)
// ============================================
export const taskQueue = pgTable('task_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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
  index('idx_task_queue_tenant_status').on(table.tenantId, table.status),
  index('idx_task_queue_tenant_scheduled').on(table.tenantId, table.scheduledFor),
  index('idx_task_queue_tenant_type').on(table.tenantId, table.type),
])

export const taskQueueRelations = relations(taskQueue, ({ one }) => ({
  tenant: one(tenants, {
    fields: [taskQueue.tenantId],
    references: [tenants.id],
  }),
}))

export type TaskQueueItem = typeof taskQueue.$inferSelect
export type NewTaskQueueItem = typeof taskQueue.$inferInsert
