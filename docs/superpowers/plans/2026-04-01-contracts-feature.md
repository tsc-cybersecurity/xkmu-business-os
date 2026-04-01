# Contracts Feature (Vertraege) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Contracts module under Finance with template-based contract creation, clause library, AI-powered template generation, project assignment, and conversion to offers/invoices.

**Architecture:** Extends the existing `documents` table with contract-specific columns (`type='contract'`). Two new tables (`contract_templates`, `contract_clauses`) for the template/clause system. Reuses existing DocumentService, DocumentForm, LineItemsEditor, and StatusBadge components. New API routes only for templates and clauses.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, PostgreSQL, jsPDF, AI Service (Gemini/OpenAI/OpenRouter), shadcn/ui, React Hook Form + Zod

---

### Task 1: Database Migration — Extend documents table + new tables

**Files:**
- Create: `drizzle/migrations/0031_contracts.sql`
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/table-whitelist.ts`

- [ ] **Step 1: Create the SQL migration file**

Create `drizzle/migrations/0031_contracts.sql`:

```sql
-- Add contract-specific columns to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS contract_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_renewal_type VARCHAR(30) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS contract_renewal_period VARCHAR(30),
  ADD COLUMN IF NOT EXISTS contract_notice_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS contract_template_id UUID,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_body_html TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract_template ON documents(contract_template_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract_dates ON documents(tenant_id, contract_start_date, contract_end_date)
  WHERE type = 'contract';

-- Contract Templates
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  body_html TEXT,
  placeholders JSONB DEFAULT '[]'::jsonb,
  clauses JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_tenant ON contract_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON contract_templates(category);

-- Contract Clauses (Bausteine)
CREATE TABLE IF NOT EXISTS contract_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  body_html TEXT,
  is_system BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_clauses_tenant ON contract_clauses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_category ON contract_clauses(category);
```

- [ ] **Step 2: Update Drizzle schema**

Add to `src/lib/db/schema.ts` after the existing `documents` table definition (after line ~800). Add the new columns to the documents table definition:

```typescript
// Add these fields inside the documents pgTable definition, after `convertedFromId`:
  // Contract-specific fields
  contractStartDate: timestamp('contract_start_date', { withTimezone: true }),
  contractEndDate: timestamp('contract_end_date', { withTimezone: true }),
  contractRenewalType: varchar('contract_renewal_type', { length: 30 }).default('none'),
  contractRenewalPeriod: varchar('contract_renewal_period', { length: 30 }),
  contractNoticePeriodDays: integer('contract_notice_period_days'),
  contractTemplateId: uuid('contract_template_id'),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  contractBodyHtml: text('contract_body_html'),
```

Add the two new table definitions after the `documentItems` section:

```typescript
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
```

- [ ] **Step 3: Update table whitelist**

In `src/lib/db/table-whitelist.ts`, add to `TENANT_TABLES` array:

```typescript
  'contract_templates',
  'contract_clauses',
```

- [ ] **Step 4: Run migration**

```bash
npm run db:push
```

- [ ] **Step 5: Commit**

```bash
git add drizzle/migrations/0031_contracts.sql src/lib/db/schema.ts src/lib/db/table-whitelist.ts
git commit -m "feat: add contracts database schema (migration, Drizzle schema, whitelist)"
```

---

### Task 2: Validation Schemas + Document Service Updates

**Files:**
- Modify: `src/lib/utils/validation.ts`
- Modify: `src/lib/services/document.service.ts`
- Modify: `src/lib/services/document.types.ts`

- [ ] **Step 1: Update validation schemas**

In `src/lib/utils/validation.ts`, change `documentTypeSchema` (line 356):

```typescript
export const documentTypeSchema = z.enum(['invoice', 'offer', 'contract'])
```

Add contract status schema after the offer status schema (line 358):

```typescript
export const contractStatusSchema = z.enum(['draft', 'sent', 'signed', 'active', 'terminated', 'expired', 'rejected'])
```

Add contract-specific create schema after `updateDocumentStatusSchema` (line ~401):

```typescript
export const createContractSchema = createDocumentSchema.extend({
  type: z.literal('contract'),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional().or(z.literal('')),
  contractRenewalType: z.enum(['none', 'manual', 'auto']).default('none'),
  contractRenewalPeriod: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  contractNoticePeriodDays: z.number().min(0).optional(),
  contractTemplateId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  contractBodyHtml: z.string().optional().or(z.literal('')),
})

export const updateContractSchema = createContractSchema.partial()
```

- [ ] **Step 2: Update DocumentService number generation**

In `src/lib/services/document.service.ts`, update `generateNumber` method (line 44):

```typescript
const prefix = type === 'invoice' ? 'RE' : type === 'contract' ? 'VT' : 'AN'
```

- [ ] **Step 3: Add contract status transitions**

After the `OFFER_TRANSITIONS` constant (line ~38), add:

```typescript
const CONTRACT_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['signed', 'rejected'],
  signed: ['active'],
  active: ['terminated', 'expired'],
}
```

- [ ] **Step 4: Update updateStatus to handle contracts**

In the `updateStatus` method (line ~329), change the transitions lookup:

```typescript
const transitions = existing.type === 'invoice'
  ? INVOICE_TRANSITIONS
  : existing.type === 'contract'
    ? CONTRACT_TRANSITIONS
    : OFFER_TRANSITIONS
```

- [ ] **Step 5: Add convertContractToDocument method**

Add after the `convertOfferToInvoice` method:

```typescript
  async convertContractToDocument(
    tenantId: string,
    contractId: string,
    targetType: 'offer' | 'invoice',
    createdBy?: string
  ): Promise<Document | null> {
    const contract = await this.getById(tenantId, contractId)
    if (!contract) return null
    if (contract.type !== 'contract') throw new Error('Nur Vertraege koennen umgewandelt werden')

    const number = await this.generateNumber(tenantId, targetType)

    const [newDoc] = await db
      .insert(documents)
      .values({
        tenantId,
        type: targetType,
        number,
        companyId: contract.companyId,
        contactPersonId: contract.contactPersonId,
        status: 'draft',
        issueDate: new Date(),
        subtotal: contract.subtotal,
        taxTotal: contract.taxTotal,
        total: contract.total,
        discount: contract.discount,
        discountType: contract.discountType,
        notes: contract.notes,
        paymentTerms: contract.paymentTerms,
        customerName: contract.customerName,
        customerStreet: contract.customerStreet,
        customerHouseNumber: contract.customerHouseNumber,
        customerPostalCode: contract.customerPostalCode,
        customerCity: contract.customerCity,
        customerCountry: contract.customerCountry,
        customerVatId: contract.customerVatId,
        convertedFromId: contractId,
        createdBy,
      })
      .returning()

    // Copy items
    if (contract.items.length > 0) {
      await db.insert(documentItems).values(
        contract.items.map((item) => ({
          documentId: newDoc.id,
          tenantId,
          position: item.position,
          productId: item.productId,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount,
          discountType: item.discountType,
          lineTotal: item.lineTotal,
        }))
      )
    }

    return newDoc
  },
```

- [ ] **Step 6: Update document create to handle contract fields**

In the `create` method, after the existing `values` object (line ~98), add contract-specific fields:

```typescript
        // Contract-specific fields
        contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
        contractRenewalType: data.contractRenewalType || null,
        contractRenewalPeriod: data.contractRenewalPeriod || null,
        contractNoticePeriodDays: data.contractNoticePeriodDays ?? null,
        contractTemplateId: emptyToNull(data.contractTemplateId),
        projectId: emptyToNull(data.projectId),
        contractBodyHtml: emptyToNull(data.contractBodyHtml),
```

Do the same in the `update` method for the `.set()` call.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils/validation.ts src/lib/services/document.service.ts src/lib/services/document.types.ts
git commit -m "feat: add contract validation schemas, status transitions, and conversion logic"
```

---

### Task 3: Contract Templates & Clauses Service + API Routes

**Files:**
- Create: `src/lib/services/contract-template.service.ts`
- Create: `src/lib/services/contract-clause.service.ts`
- Create: `src/app/api/v1/contract-templates/route.ts`
- Create: `src/app/api/v1/contract-templates/[id]/route.ts`
- Create: `src/app/api/v1/contract-templates/generate/route.ts`
- Create: `src/app/api/v1/contract-clauses/route.ts`
- Create: `src/app/api/v1/contract-clauses/[id]/route.ts`

- [ ] **Step 1: Create contract template service**

Create `src/lib/services/contract-template.service.ts`:

```typescript
import { db } from '@/lib/db'
import { contractTemplates } from '@/lib/db/schema'
import { eq, and, or, isNull, desc } from 'drizzle-orm'

export const ContractTemplateService = {
  async list(tenantId: string, category?: string) {
    const conditions = [
      or(eq(contractTemplates.tenantId, tenantId), isNull(contractTemplates.tenantId)),
    ]
    if (category) conditions.push(eq(contractTemplates.category, category))

    return db
      .select()
      .from(contractTemplates)
      .where(and(...conditions))
      .orderBy(contractTemplates.isSystem, desc(contractTemplates.updatedAt))
  },

  async getById(tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(contractTemplates)
      .where(
        and(
          eq(contractTemplates.id, id),
          or(eq(contractTemplates.tenantId, tenantId), isNull(contractTemplates.tenantId))
        )
      )
      .limit(1)
    return row ?? null
  },

  async create(tenantId: string, data: {
    name: string
    category: string
    description?: string
    bodyHtml?: string
    placeholders?: unknown[]
    clauses?: unknown[]
  }) {
    const [row] = await db
      .insert(contractTemplates)
      .values({
        tenantId,
        name: data.name,
        category: data.category,
        description: data.description || null,
        bodyHtml: data.bodyHtml || null,
        placeholders: data.placeholders || [],
        clauses: data.clauses || [],
        isSystem: false,
      })
      .returning()
    return row
  },

  async update(tenantId: string, id: string, data: Partial<{
    name: string
    category: string
    description: string
    bodyHtml: string
    placeholders: unknown[]
    clauses: unknown[]
  }>) {
    const existing = await this.getById(tenantId, id)
    if (!existing) return null
    if (existing.isSystem) throw new Error('System-Templates koennen nicht bearbeitet werden')

    const [row] = await db
      .update(contractTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contractTemplates.id, id), eq(contractTemplates.tenantId, tenantId)))
      .returning()
    return row ?? null
  },

  async delete(tenantId: string, id: string) {
    const existing = await this.getById(tenantId, id)
    if (!existing) return false
    if (existing.isSystem) throw new Error('System-Templates koennen nicht geloescht werden')

    const result = await db
      .delete(contractTemplates)
      .where(and(eq(contractTemplates.id, id), eq(contractTemplates.tenantId, tenantId)))
      .returning({ id: contractTemplates.id })
    return result.length > 0
  },

  async duplicate(tenantId: string, id: string) {
    const original = await this.getById(tenantId, id)
    if (!original) return null

    return this.create(tenantId, {
      name: `${original.name} (Kopie)`,
      category: original.category,
      description: original.description || undefined,
      bodyHtml: original.bodyHtml || undefined,
      placeholders: (original.placeholders as unknown[]) || [],
      clauses: (original.clauses as unknown[]) || [],
    })
  },
}
```

- [ ] **Step 2: Create contract clause service**

Create `src/lib/services/contract-clause.service.ts`:

```typescript
import { db } from '@/lib/db'
import { contractClauses } from '@/lib/db/schema'
import { eq, and, or, isNull, asc } from 'drizzle-orm'

export const ContractClauseService = {
  async list(tenantId: string, category?: string) {
    const conditions = [
      or(eq(contractClauses.tenantId, tenantId), isNull(contractClauses.tenantId)),
    ]
    if (category) conditions.push(eq(contractClauses.category, category))

    return db
      .select()
      .from(contractClauses)
      .where(and(...conditions))
      .orderBy(contractClauses.sortOrder, asc(contractClauses.name))
  },

  async getById(tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(contractClauses)
      .where(
        and(
          eq(contractClauses.id, id),
          or(eq(contractClauses.tenantId, tenantId), isNull(contractClauses.tenantId))
        )
      )
      .limit(1)
    return row ?? null
  },

  async create(tenantId: string, data: {
    name: string
    category: string
    bodyHtml?: string
    sortOrder?: number
  }) {
    const [row] = await db
      .insert(contractClauses)
      .values({
        tenantId,
        name: data.name,
        category: data.category,
        bodyHtml: data.bodyHtml || null,
        sortOrder: data.sortOrder ?? 0,
        isSystem: false,
      })
      .returning()
    return row
  },

  async update(tenantId: string, id: string, data: Partial<{
    name: string
    category: string
    bodyHtml: string
    sortOrder: number
  }>) {
    const existing = await this.getById(tenantId, id)
    if (!existing) return null
    if (existing.isSystem) throw new Error('System-Bausteine koennen nicht bearbeitet werden')

    const [row] = await db
      .update(contractClauses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contractClauses.id, id), eq(contractClauses.tenantId, tenantId)))
      .returning()
    return row ?? null
  },

  async delete(tenantId: string, id: string) {
    const existing = await this.getById(tenantId, id)
    if (!existing) return false
    if (existing.isSystem) throw new Error('System-Bausteine koennen nicht geloescht werden')

    const result = await db
      .delete(contractClauses)
      .where(and(eq(contractClauses.id, id), eq(contractClauses.tenantId, tenantId)))
      .returning({ id: contractClauses.id })
    return result.length > 0
  },
}
```

- [ ] **Step 3: Create template API routes**

Create `src/app/api/v1/contract-templates/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { ContractTemplateService } from '@/lib/services/contract-template.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const category = request.nextUrl.searchParams.get('category') || undefined
    const templates = await ContractTemplateService.list(auth.tenantId, category)
    return apiSuccess(templates)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const body = await request.json()
    if (!body.name || !body.category) {
      return apiError('VALIDATION_ERROR', 'Name und Kategorie sind erforderlich', 400)
    }
    const template = await ContractTemplateService.create(auth.tenantId, body)
    return apiSuccess(template, undefined, 201)
  })
}
```

Create `src/app/api/v1/contract-templates/[id]/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { ContractTemplateService } from '@/lib/services/contract-template.service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { id } = await params
    const template = await ContractTemplateService.getById(auth.tenantId, id)
    if (!template) return apiNotFound('Template nicht gefunden')
    return apiSuccess(template)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id } = await params
    const body = await request.json()
    try {
      const template = await ContractTemplateService.update(auth.tenantId, id, body)
      if (!template) return apiNotFound('Template nicht gefunden')
      return apiSuccess(template)
    } catch (err) {
      return apiError('FORBIDDEN', (err as Error).message, 403)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'delete', async (auth) => {
    const { id } = await params
    try {
      const deleted = await ContractTemplateService.delete(auth.tenantId, id)
      if (!deleted) return apiNotFound('Template nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (err) {
      return apiError('FORBIDDEN', (err as Error).message, 403)
    }
  })
}
```

- [ ] **Step 4: Create clauses API routes**

Create `src/app/api/v1/contract-clauses/route.ts` (same pattern as templates):

```typescript
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { ContractClauseService } from '@/lib/services/contract-clause.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const category = request.nextUrl.searchParams.get('category') || undefined
    const clauses = await ContractClauseService.list(auth.tenantId, category)
    return apiSuccess(clauses)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const body = await request.json()
    if (!body.name || !body.category) {
      return apiError('VALIDATION_ERROR', 'Name und Kategorie sind erforderlich', 400)
    }
    const clause = await ContractClauseService.create(auth.tenantId, body)
    return apiSuccess(clause, undefined, 201)
  })
}
```

Create `src/app/api/v1/contract-clauses/[id]/route.ts` (same pattern as template [id]):

```typescript
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { ContractClauseService } from '@/lib/services/contract-clause.service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { id } = await params
    const clause = await ContractClauseService.getById(auth.tenantId, id)
    if (!clause) return apiNotFound('Baustein nicht gefunden')
    return apiSuccess(clause)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id } = await params
    const body = await request.json()
    try {
      const clause = await ContractClauseService.update(auth.tenantId, id, body)
      if (!clause) return apiNotFound('Baustein nicht gefunden')
      return apiSuccess(clause)
    } catch (err) {
      return apiError('FORBIDDEN', (err as Error).message, 403)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'delete', async (auth) => {
    const { id } = await params
    try {
      const deleted = await ContractClauseService.delete(auth.tenantId, id)
      if (!deleted) return apiNotFound('Baustein nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (err) {
      return apiError('FORBIDDEN', (err as Error).message, 403)
    }
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/contract-template.service.ts src/lib/services/contract-clause.service.ts src/app/api/v1/contract-templates/ src/app/api/v1/contract-clauses/
git commit -m "feat: add contract template and clause services with API routes"
```

---

### Task 4: Navigation + Status Badge + Finance Hub

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/app/intern/(dashboard)/finance/page.tsx`
- Modify: `src/app/intern/(dashboard)/finance/_components/status-badge.tsx`

- [ ] **Step 1: Add contracts to sidebar**

In `src/components/layout/sidebar.tsx`, add to the Finanzen children array (after line 85, before Zeiterfassung):

```typescript
      { name: 'Vertraege', href: '/intern/finance/contracts', requiredModule: 'documents' },
```

- [ ] **Step 2: Update Finance hub page**

Replace `src/app/intern/(dashboard)/finance/page.tsx`:

```typescript
'use client'

import { CategoryPage } from '../_components/category-page'
import { FileText, Receipt, FileCheck, FileSignature } from 'lucide-react'

export default function FinancePage() {
  return (
    <CategoryPage
      title="Finanzen"
      description="Rechnungen, Angebote und Vertraege verwalten"
      icon={FileText}
      items={[
        { name: 'Rechnungen', href: '/intern/finance/invoices', description: 'Rechnungen erstellen und verwalten', icon: Receipt },
        { name: 'Angebote', href: '/intern/finance/offers', description: 'Angebote erstellen und nachverfolgen', icon: FileCheck },
        { name: 'Vertraege', href: '/intern/finance/contracts', description: 'Kundenvertraege mit Templates erstellen und verwalten', icon: FileSignature },
      ]}
    />
  )
}
```

- [ ] **Step 3: Add contract statuses to status badge**

In `src/app/intern/(dashboard)/finance/_components/status-badge.tsx`, add contract config after `offerStatusConfig`:

```typescript
const contractStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Entwurf', className: 'bg-gray-400' },
  sent: { label: 'Versendet', className: 'bg-blue-500' },
  signed: { label: 'Unterschrieben', className: 'bg-green-600' },
  active: { label: 'Aktiv', className: 'bg-green-500' },
  terminated: { label: 'Beendet', className: 'bg-gray-600' },
  expired: { label: 'Abgelaufen', className: 'bg-orange-500' },
  rejected: { label: 'Abgelehnt', className: 'bg-red-500' },
}
```

Update `DocumentStatusBadge` component to handle contracts:

```typescript
export function DocumentStatusBadge({ status, type }: DocumentStatusBadgeProps) {
  const config = type === 'invoice'
    ? invoiceStatusConfig
    : type === 'contract'
      ? contractStatusConfig
      : offerStatusConfig
  const statusInfo = config[status] || { label: status, className: 'bg-gray-400' }

  return (
    <Badge className={statusInfo.className}>
      {statusInfo.label}
    </Badge>
  )
}

export function getStatusLabel(status: string, type: string): string {
  const config = type === 'invoice'
    ? invoiceStatusConfig
    : type === 'contract'
      ? contractStatusConfig
      : offerStatusConfig
  return config[status]?.label || status
}
```

Add export at the bottom:

```typescript
export const contractStatuses = Object.entries(contractStatusConfig).map(([value, { label }]) => ({ value, label }))
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx src/app/intern/(dashboard)/finance/page.tsx src/app/intern/(dashboard)/finance/_components/status-badge.tsx
git commit -m "feat: add contracts navigation, finance hub card, and status badge config"
```

---

### Task 5: Contract List Page

**Files:**
- Create: `src/app/intern/(dashboard)/finance/contracts/page.tsx`

- [ ] **Step 1: Create contracts list page**

Create `src/app/intern/(dashboard)/finance/contracts/page.tsx` modeled after the invoices list page but with `type=contract` and contract-specific columns (Laufzeit, Projekt):

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, FileSignature, FileText, BookTemplate } from 'lucide-react'
import { DocumentStatusBadge, contractStatuses } from '../_components/status-badge'
import { Can } from '@/hooks/use-permissions'
import { Loader2 } from 'lucide-react'

interface ContractListItem {
  id: string
  number: string
  status: string
  issueDate: string | null
  total: string
  customerName: string | null
  contractStartDate: string | null
  contractEndDate: string | null
  contractRenewalType: string | null
  projectId: string | null
  company: { id: string; name: string } | null
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)

  useEffect(() => { setPage(1) }, [search, statusFilter])

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ type: 'contract' })
        if (search) params.set('search', search)
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
        params.set('page', page.toString())

        const res = await fetch(`/api/v1/documents?${params}`)
        const json = await res.json()
        if (json.success) {
          setContracts(json.data?.items || json.data || [])
          setMeta(json.meta || json.data?.meta || null)
        }
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
  }, [search, statusFilter, page])

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('de-DE') : '—'
  const formatEur = (v: string | null) => v ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(v)) : '—'

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="h-6 w-6" />
            Vertraege
          </h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} Vertraege` : 'Laden...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/intern/finance/contracts/templates">
            <Button variant="outline" size="sm">
              <BookTemplate className="mr-1 h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Can module="documents" action="create">
            <Link href="/intern/finance/contracts/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Neuer Vertrag
              </Button>
            </Link>
          </Can>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {contractStatuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Keine Vertraege gefunden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Laufzeit</TableHead>
                  <TableHead className="text-right">Wert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/intern/finance/contracts/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.number}
                      </Link>
                    </TableCell>
                    <TableCell>{c.company?.name || c.customerName || '—'}</TableCell>
                    <TableCell><DocumentStatusBadge status={c.status} type="contract" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(c.contractStartDate)}
                      {c.contractEndDate ? ` – ${formatDate(c.contractEndDate)}` : ' – unbefristet'}
                    </TableCell>
                    <TableCell className="text-right">{formatEur(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Seite {meta.page} von {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Zurueck</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages}>Weiter</Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/intern/(dashboard)/finance/contracts/page.tsx
git commit -m "feat: add contracts list page with filtering and pagination"
```

---

### Task 6: Contract Detail Page

**Files:**
- Create: `src/app/intern/(dashboard)/finance/contracts/[id]/page.tsx`

- [ ] **Step 1: Create contract detail page**

Create `src/app/intern/(dashboard)/finance/contracts/[id]/page.tsx` with tabs (Uebersicht, Vertrag, Positionen, Dokumente), status actions, and conversion buttons. This page loads the contract via `GET /api/v1/documents/{id}` and displays it with tabs. The implementation should follow the pattern of the invoices detail page but with contract-specific tabs and actions.

Key sections:
- Header with number, status badge, and action buttons (PDF Export, Versenden, Angebot/Rechnung erstellen, Status-Wechsel)
- Tab 1 "Uebersicht": Stammdaten (Kunde, Kontakt, Laufzeit, Kuendigung, Projekt, Erneuerung)
- Tab 2 "Vertrag": Rendered contract body HTML (editable in draft mode)
- Tab 3 "Positionen": Reuse `LineItemsEditor` component
- Tab 4 "Dokumente": PDF export button, send history

The conversion buttons call `POST /api/v1/documents/{id}/convert` with `{ targetType: 'offer' | 'invoice' }` and redirect to the new document.

This is a large component (~400-500 lines). Follow the same patterns as `src/app/intern/(dashboard)/finance/invoices/[id]/page.tsx` for data fetching, tab structure, and action handling.

- [ ] **Step 2: Commit**

```bash
git add "src/app/intern/(dashboard)/finance/contracts/[id]/page.tsx"
git commit -m "feat: add contract detail page with tabs and conversion actions"
```

---

### Task 7: New Contract Page (Template Selection + Form)

**Files:**
- Create: `src/app/intern/(dashboard)/finance/contracts/new/page.tsx`

- [ ] **Step 1: Create new contract page**

Create `src/app/intern/(dashboard)/finance/contracts/new/page.tsx` with the following flow:

1. Step 1: Template selection grid (fetches from `GET /api/v1/contract-templates`, grouped by category)
2. Step 2: Contract form with:
   - Company selector (from existing companies API)
   - Project selector (from `GET /api/v1/projects`)
   - Contract dates (start, end, optional)
   - Renewal settings (type, period, notice days)
   - Template placeholder filling
   - Contract body HTML preview/edit
   - Line items editor (reuse existing component)
3. Save via `POST /api/v1/documents` with `type: 'contract'`

This page combines template selection with the document form. After selecting a template, placeholders are filled and the contract body is generated.

- [ ] **Step 2: Commit**

```bash
git add "src/app/intern/(dashboard)/finance/contracts/new/page.tsx"
git commit -m "feat: add new contract page with template selection and form"
```

---

### Task 8: Contract Templates Management Page

**Files:**
- Create: `src/app/intern/(dashboard)/finance/contracts/templates/page.tsx`
- Create: `src/app/intern/(dashboard)/finance/contracts/templates/new/page.tsx`

- [ ] **Step 1: Create templates list page**

Create `src/app/intern/(dashboard)/finance/contracts/templates/page.tsx`:
- Fetches templates from `GET /api/v1/contract-templates`
- Displays as card grid grouped by category
- System templates show a lock icon and "Duplizieren" button
- Custom templates show "Bearbeiten" and "Loeschen" buttons
- "Neues Template" button links to `/contracts/templates/new`

- [ ] **Step 2: Create AI template generation page**

Create `src/app/intern/(dashboard)/finance/contracts/templates/new/page.tsx`:
- 3-step wizard:
  - Step 1: Category dropdown + "Was soll der Vertrag regeln?" textarea
  - Step 2: Loading state while AI generates (calls `POST /api/v1/contract-templates/generate`)
  - Step 3: Preview generated template, edit body, adjust placeholders, save
- Warning banner: "KI-generierte Vertraege ersetzen keine Rechtsberatung"

- [ ] **Step 3: Create AI generation API route**

Create `src/app/api/v1/contract-templates/generate/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai/ai.service'

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const { goal, category } = await request.json()
    if (!goal) return apiError('VALIDATION_ERROR', 'Vertragsziel ist erforderlich', 400)

    const systemPrompt = `Du bist ein erfahrener Wirtschaftsjurist fuer deutsche KMU. Erstelle einen Vertragstemplate-Entwurf basierend auf deutschem Recht (BGB, HGB, DSGVO).

Strukturiere den Vertrag in folgende Abschnitte (jeweils als eigenstaendiger Baustein):
1. Praeambel und Vertragsgegenstand
2. Leistungsbeschreibung
3. Verguetung und Zahlungsbedingungen
4. Laufzeit und Kuendigung
5. Haftung und Gewaehrleistung
6. Geheimhaltung
7. Datenschutz (DSGVO)
8. Schlussbestimmungen

Verwende {{Platzhalter}} fuer variable Inhalte (z.B. {{firmenname_auftraggeber}}, {{firmenname_auftragnehmer}}, {{vertragsbeginn}}, {{laufzeit}}).

Antworte als JSON mit diesem Format:
{
  "name": "Template-Name",
  "description": "Kurzbeschreibung",
  "sections": [
    { "category": "general", "name": "Abschnittsname", "body_html": "<p>HTML-Inhalt</p>" }
  ],
  "placeholders": [
    { "key": "firmenname_auftraggeber", "label": "Firma Auftraggeber", "type": "text", "required": true }
  ]
}`

    const userPrompt = `Erstelle einen Vertragstemplate fuer folgendes Ziel:

Kategorie: ${category || 'allgemein'}
Vertragsziel: ${goal}

Beruecksichtige branchenspezifische Anforderungen und aktuelle Rechtsprechung.`

    try {
      const response = await AIService.completeWithContext(userPrompt, {
        tenantId: auth.tenantId,
        userId: auth.userId,
        feature: 'contract_template_generation',
      }, { systemPrompt })

      let parsed
      try {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/)
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch {
        parsed = null
      }

      if (!parsed) {
        return apiSuccess({ raw: response.text, parsed: null })
      }

      return apiSuccess({
        name: parsed.name || 'Neues Template',
        description: parsed.description || '',
        category: category || 'consulting',
        sections: parsed.sections || [],
        placeholders: parsed.placeholders || [],
        bodyHtml: (parsed.sections || []).map((s: { body_html: string }) => s.body_html).join('\n\n'),
      })
    } catch (err) {
      return apiError('AI_ERROR', (err as Error).message, 500)
    }
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/intern/(dashboard)/finance/contracts/templates/" "src/app/api/v1/contract-templates/generate/"
git commit -m "feat: add contract template management and AI generation"
```

---

### Task 9: Contract Clauses (Bausteine) Page

**Files:**
- Create: `src/app/intern/(dashboard)/finance/contracts/clauses/page.tsx`

- [ ] **Step 1: Create clauses library page**

Create `src/app/intern/(dashboard)/finance/contracts/clauses/page.tsx`:
- Fetches from `GET /api/v1/contract-clauses`
- Category filter tabs/buttons (general, liability, termination, payment, confidentiality, data_protection, sla, ip_rights)
- Card list with clause name, category badge, preview of body text
- System clauses: read-only with "Duplizieren" option
- Custom clauses: edit inline or in dialog, delete
- "Neuer Baustein" button opens create dialog with name, category dropdown, and HTML textarea

- [ ] **Step 2: Commit**

```bash
git add "src/app/intern/(dashboard)/finance/contracts/clauses/"
git commit -m "feat: add contract clauses library page"
```

---

### Task 10: Seed System Templates & Clauses

**Files:**
- Create: `src/app/api/v1/contract-templates/seed/route.ts`

- [ ] **Step 1: Create seed endpoint**

Create `src/app/api/v1/contract-templates/seed/route.ts` that inserts the 4 system templates and ~24 system clauses. Each template includes appropriate default clauses and placeholders. Each clause has proper HTML content for German contract law.

The seed endpoint should:
1. Check if system templates already exist (skip if already seeded)
2. Insert 4 templates (IT-Dienstleistung, Beratung, Softwareentwicklung, Hosting/SaaS)
3. Insert ~24 clauses across 8 categories (3 per category)
4. Return count of inserted items

Templates and clauses have `is_system: true` and `tenant_id: null` (global).

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/v1/contract-templates/seed/"
git commit -m "feat: add seed endpoint for system contract templates and clauses"
```

---

### Task 11: Contract PDF Export

**Files:**
- Create: `src/lib/services/contract-pdf.service.ts`

- [ ] **Step 1: Create contract PDF service**

Create `src/lib/services/contract-pdf.service.ts` following the pattern of `ir-pdf.service.ts`:

```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateContractPdf(contract: any): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = 20

  // Header: Company name / Vertragsnummer
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('Vertrag', margin, y)
  doc.text(contract.number || '', pageWidth - margin, y, { align: 'right' })
  y += 8

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(`Vertrag ${contract.number}`, margin, y)
  y += 10

  // Parties
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  if (contract.customerName) {
    doc.setFont('helvetica', 'bold')
    doc.text('Vertragspartner:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.text(contract.customerName, margin, y)
    y += 4
    const address = [contract.customerStreet, contract.customerHouseNumber].filter(Boolean).join(' ')
    if (address) { doc.text(address, margin, y); y += 4 }
    const city = [contract.customerPostalCode, contract.customerCity].filter(Boolean).join(' ')
    if (city) { doc.text(city, margin, y); y += 4 }
    y += 4
  }

  // Contract dates
  doc.setFont('helvetica', 'bold')
  doc.text('Vertragsdaten:', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const startDate = contract.contractStartDate ? new Date(contract.contractStartDate).toLocaleDateString('de-DE') : '—'
  const endDate = contract.contractEndDate ? new Date(contract.contractEndDate).toLocaleDateString('de-DE') : 'unbefristet'
  doc.text(`Laufzeit: ${startDate} bis ${endDate}`, margin, y)
  y += 8

  // Contract body (HTML rendered as text)
  if (contract.contractBodyHtml) {
    const bodyText = contract.contractBodyHtml
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()

    doc.setFontSize(9)
    const lines = doc.splitTextToSize(bodyText, contentWidth)
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage()
        y = 20
      }
      doc.text(line, margin, y)
      y += 4
    }
    y += 6
  }

  // Positions table
  const items = contract.items || []
  if (items.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Leistungen / Positionen', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Pos', 'Bezeichnung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
      body: items.map((item: any, i: number) => [
        String(i + 1),
        item.name || '',
        item.quantity || '1',
        item.unit || 'Stk',
        `${Number(item.unitPrice || 0).toFixed(2)} EUR`,
        `${Number(item.lineTotal || 0).toFixed(2)} EUR`,
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
    })

    y = (doc as any).lastAutoTable.finalY + 8

    // Totals
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Netto: ${Number(contract.subtotal || 0).toFixed(2)} EUR`, pageWidth - margin, y, { align: 'right' })
    y += 5
    doc.text(`MwSt: ${Number(contract.taxTotal || 0).toFixed(2)} EUR`, pageWidth - margin, y, { align: 'right' })
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text(`Gesamt: ${Number(contract.total || 0).toFixed(2)} EUR`, pageWidth - margin, y, { align: 'right' })
    y += 15
  }

  // Signature fields
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    y = 20
  }
  const sigY = Math.max(y + 10, doc.internal.pageSize.getHeight() - 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setDrawColor(100, 100, 100)

  doc.line(margin, sigY, margin + 65, sigY)
  doc.text('Ort, Datum / Auftraggeber', margin, sigY + 4)

  doc.line(pageWidth - margin - 65, sigY, pageWidth - margin, sigY)
  doc.text('Ort, Datum / Auftragnehmer', pageWidth - margin - 65, sigY + 4)

  // Page numbers
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Seite ${i} von ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
  }

  return doc
}
```

- [ ] **Step 2: Wire PDF export in contract detail page**

Import and call `generateContractPdf(contract)` from the PDF Export button in the contract detail page (Task 6). Call `doc.save(\`Vertrag_${contract.number}.pdf\`)`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/contract-pdf.service.ts
git commit -m "feat: add contract PDF export service"
```

---

### Task 12: Convert Endpoint Update

**Files:**
- Modify: `src/app/api/v1/documents/[id]/convert/route.ts`

- [ ] **Step 1: Update convert endpoint to handle contracts**

The existing convert endpoint handles offer→invoice. Extend it to also handle contract→offer and contract→invoice. Check the `type` of the source document and call `DocumentService.convertContractToDocument()` for contracts, or the existing `convertOfferToInvoice()` for offers.

```typescript
// In the POST handler, after getting the document:
if (doc.type === 'contract') {
  const targetType = body.targetType // 'offer' | 'invoice'
  if (!targetType || !['offer', 'invoice'].includes(targetType)) {
    return apiError('VALIDATION_ERROR', 'targetType muss offer oder invoice sein', 400)
  }
  const result = await DocumentService.convertContractToDocument(auth.tenantId, id, targetType, auth.userId)
  return apiSuccess(result, undefined, 201)
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/v1/documents/[id]/convert/route.ts"
git commit -m "feat: support contract-to-offer and contract-to-invoice conversion"
```
