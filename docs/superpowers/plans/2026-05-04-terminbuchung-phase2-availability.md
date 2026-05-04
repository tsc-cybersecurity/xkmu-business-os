# Terminbuchung Phase 2 — Slot-Typen + Verfügbarkeit + Backend-Kalender — Implementation Plan

> **Plan-Pakete für Terminbuchung**
> - ✅ Phase 1: Schema-Grundlage, Google-OAuth, Connect-UI (gemerged in main)
> - **Phase 2 (diese Datei):** Slot-Typen + Wochenraster + Overrides + Backend-Kalender-Übersicht (read-only — keine Buchung, kein Sync, keine Termine)
> - Phase 3: Push-Webhook + `external_busy` + Channel-Renewal-Cron + Token-Refresh-Cron
> - Phase 4: Öffentliche Buchungsseite + availability-API + book-API + Live-FreeBusy + Event-Insert + Confirmation-Mail
> - Phasen 5–8 wie in der Spec

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mitarbeiter können auf `/intern/termine/slot-types` eigene Termin-Arten anlegen (Name, Dauer, Puffer, Vorlauf, Beschreibung, Farbe, Location). Auf `/intern/termine/availability` definieren sie ihr Wochenraster (z. B. Mo–Fr 09–17) plus zeitspezifische Ausnahmen (Urlaub blockieren, ausnahmsweise Samstag freigeben). Die Übersichtsseite `/intern/termine` zeigt eine Wochenansicht der Verfügbarkeit. **Noch keine Buchungen, kein Google-Sync — die UI ist konfigurativ.**

**Architecture:** Drei neue Tabellen (`slot_types`, `availability_rules`, `availability_overrides`) plus zwei Services (`slot-type.service.ts`, `availability.service.ts`) nach existierendem Pattern. Drei API-Routen pro Resource (Liste/Create + Detail mit Update/Delete). Drei UI-Seiten unter `/intern/termine/`. Permission-Modul `appointments` ist bereits registriert (Phase 1).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Postgres), Zod, Vitest. UI: shadcn/ui Cards/Sheet/Tabs/Input + `@dnd-kit/sortable` für Slot-Typ-Reorder.

**Spec:** `docs/superpowers/specs/2026-05-04-terminbuchung-design.md` §1.3, §1.4, §1.5, §3.1, §3.2, §3.3.

**Codebase-Patterns (wie Phase 1):**
- Services: `export const FooService = { method() { ... } }`
- API: `withPermission(request, 'appointments', action, callback)`
- Tests: `setupDbMock()` aus `src/__tests__/helpers/mock-db.ts` + `vi.resetModules()` + dynamic import
- API mit Zod-`safeParse` (nicht `parse`) — gibt 400 statt 500 bei Bad Body
- DB-Cascade: `ON DELETE CASCADE` für FK auf `users(id)` (User-Delete räumt alles auf)

---

## Phase A — Foundation (Schema)

### Task 1: Migration 0041 + Drizzle-Schema

**Files:**
- Create: `drizzle/migrations/0041_slot_types_availability.sql`
- Modify: `src/lib/db/schema.ts` (am Ende anhängen)
- Modify: `src/lib/db/table-whitelist.ts` (drei neue Tabellen)

- [ ] **Step 1: SQL-Migration**

```sql
-- Terminbuchung Phase 2: Slot-Typen + Verfügbarkeit

CREATE TABLE slot_types (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                   varchar(100) NOT NULL,
  name                   varchar(255) NOT NULL,
  description            text,
  duration_minutes       integer NOT NULL CHECK (duration_minutes > 0),
  buffer_before_minutes  integer NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes   integer NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
  min_notice_hours       integer NOT NULL DEFAULT 24 CHECK (min_notice_hours >= 0),
  max_advance_days       integer NOT NULL DEFAULT 60 CHECK (max_advance_days > 0),
  color                  varchar(7) NOT NULL DEFAULT '#3b82f6',
  is_active              boolean NOT NULL DEFAULT true,
  location               varchar(20) NOT NULL DEFAULT 'phone',  -- phone | video | onsite | custom
  location_details       text,
  display_order          integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_slot_types_user_slug UNIQUE (user_id, slug)
);
CREATE INDEX idx_slot_types_user_active ON slot_types(user_id, is_active);

CREATE TABLE availability_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Mo … 6=So
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_availability_rules_time_order CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_rules_user ON availability_rules(user_id);

CREATE TABLE availability_overrides (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_at  timestamptz NOT NULL,
  end_at    timestamptz NOT NULL,
  kind      varchar(10) NOT NULL CHECK (kind IN ('free', 'block')),
  reason    varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_availability_overrides_time_order CHECK (end_at > start_at)
);
CREATE INDEX idx_availability_overrides_user_start ON availability_overrides(user_id, start_at);
```

- [ ] **Step 2: Drizzle-Schema in `src/lib/db/schema.ts` anhängen**

```typescript
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
  dayOfWeek: smallint('day_of_week').notNull(),  // 0=Monday … 6=Sunday
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
  kind: varchar('kind', { length: 10 }).notNull(),  // 'free' | 'block'
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
```

Imports prüfen — `smallint`, `integer`, `time`, `uniqueIndex`, `index` müssen aus `drizzle-orm/pg-core` importiert sein. Falls `smallint` oder `time` fehlen, ergänzen.

- [ ] **Step 3: Whitelist erweitern**

In `src/lib/db/table-whitelist.ts` `TENANT_TABLES`:

```typescript
'slot_types',
'availability_rules',
'availability_overrides',
```

- [ ] **Step 4: Migration ausführen + tsc**

```bash
npm run db:migrate
npx tsc --noEmit
```

Beides muss clean durchlaufen.

- [ ] **Step 5: Commit**

```bash
git add drizzle/migrations/0041_slot_types_availability.sql src/lib/db/schema.ts src/lib/db/table-whitelist.ts
git commit -m "feat(termine): schema for slot types + availability rules/overrides (Phase 2)"
```

---

## Phase B — Services + Unit-Tests

### Task 2: SlotTypeService

**Files:**
- Create: `src/lib/services/slot-type.service.ts`
- Test: `src/__tests__/unit/services/slot-type.service.test.ts`

**Public API:**
- `list(userId): Promise<SlotType[]>` — alle Slot-Typen des Users, sortiert nach `displayOrder`
- `listActive(userId): Promise<SlotType[]>` — nur `is_active=true`
- `getById(id): Promise<SlotType | null>`
- `getByUserAndSlug(userId, slug): Promise<SlotType | null>` — für Buchungsseite (Phase 4)
- `create(userId, input): Promise<SlotType>`
- `update(id, input): Promise<SlotType>` — Partial-Update aller Felder
- `delete(id): Promise<void>`
- `reorder(userId, ids[]): Promise<void>` — setzt `displayOrder` gemäß Array-Reihenfolge

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/slot-type.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

describe('SlotTypeService', () => {
  beforeEach(() => vi.resetModules())

  it('list returns slot types ordered by displayOrder', async () => {
    const helper = setupDbMock()
    const rows = [
      { id: '1', userId: 'u-1', slug: 'kurz', displayOrder: 0 },
      { id: '2', userId: 'u-1', slug: 'lang', displayOrder: 1 },
    ]
    helper.selectMock.mockResolvedValueOnce(rows)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    const out = await SlotTypeService.list('u-1')
    expect(out).toHaveLength(2)
  })

  it('create inserts a new row', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce([{ id: 'new-id', userId: 'u-1', slug: 'erstgespraech' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    const out = await SlotTypeService.create('u-1', {
      slug: 'erstgespraech', name: 'Erstgespräch', durationMinutes: 30,
    })
    expect(out.id).toBe('new-id')
  })

  it('update applies partial fields', async () => {
    const helper = setupDbMock()
    helper.updateMock.mockResolvedValueOnce([{ id: 'st-1', name: 'Neu' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    const out = await SlotTypeService.update('st-1', { name: 'Neu' })
    expect(out.name).toBe('Neu')
  })

  it('delete removes by id', async () => {
    const helper = setupDbMock()
    helper.deleteMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    await SlotTypeService.delete('st-1')
    expect(helper.db.delete).toHaveBeenCalled()
  })

  it('reorder sets displayOrder for each id', async () => {
    const helper = setupDbMock()
    helper.updateMock.mockResolvedValueOnce(undefined)
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    await SlotTypeService.reorder('u-1', ['b', 'a'])
    expect(helper.db.update).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: FAIL beobachten**

```bash
npx vitest run src/__tests__/unit/services/slot-type.service.test.ts
```

- [ ] **Step 3: Service implementieren**

`src/lib/services/slot-type.service.ts`:

```typescript
import { db } from '@/lib/db'
import { slotTypes, type NewSlotType, type SlotType } from '@/lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'

export type SlotTypeCreateInput = Omit<NewSlotType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type SlotTypeUpdateInput = Partial<SlotTypeCreateInput>

export const SlotTypeService = {
  async list(userId: string): Promise<SlotType[]> {
    return db.select().from(slotTypes)
      .where(eq(slotTypes.userId, userId))
      .orderBy(asc(slotTypes.displayOrder), asc(slotTypes.createdAt))
  },

  async listActive(userId: string): Promise<SlotType[]> {
    return db.select().from(slotTypes)
      .where(and(eq(slotTypes.userId, userId), eq(slotTypes.isActive, true)))
      .orderBy(asc(slotTypes.displayOrder), asc(slotTypes.createdAt))
  },

  async getById(id: string): Promise<SlotType | null> {
    const rows = await db.select().from(slotTypes).where(eq(slotTypes.id, id)).limit(1)
    return rows[0] ?? null
  },

  async getByUserAndSlug(userId: string, slug: string): Promise<SlotType | null> {
    const rows = await db.select().from(slotTypes)
      .where(and(eq(slotTypes.userId, userId), eq(slotTypes.slug, slug)))
      .limit(1)
    return rows[0] ?? null
  },

  async create(userId: string, input: SlotTypeCreateInput): Promise<SlotType> {
    const [row] = await db.insert(slotTypes).values({ ...input, userId }).returning()
    return row
  },

  async update(id: string, input: SlotTypeUpdateInput): Promise<SlotType> {
    const [row] = await db.update(slotTypes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(slotTypes.id, id))
      .returning()
    return row
  },

  async delete(id: string): Promise<void> {
    await db.delete(slotTypes).where(eq(slotTypes.id, id))
  },

  async reorder(userId: string, ids: string[]): Promise<void> {
    // Batch via individual UPDATEs — small list (typically < 20 slot types per user)
    await Promise.all(
      ids.map((id, index) =>
        db.update(slotTypes)
          .set({ displayOrder: index, updatedAt: new Date() })
          .where(and(eq(slotTypes.id, id), eq(slotTypes.userId, userId))),
      ),
    )
  },
}
```

- [ ] **Step 4: PASS**

```bash
npx vitest run src/__tests__/unit/services/slot-type.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/slot-type.service.ts src/__tests__/unit/services/slot-type.service.test.ts
git commit -m "feat(termine): SlotTypeService — CRUD + reorder"
```

---

### Task 3: AvailabilityService

**Files:**
- Create: `src/lib/services/availability.service.ts`
- Test: `src/__tests__/unit/services/availability.service.test.ts`

**Public API:**
- `listRules(userId): Promise<AvailabilityRule[]>` — sortiert nach `dayOfWeek, startTime`
- `createRule(userId, input)`, `updateRule(id, input)`, `deleteRule(id)`
- `listOverrides(userId, fromDate?, toDate?)` — optional Datumsfenster
- `createOverride(userId, input)`, `deleteOverride(id)` (Updates bei Overrides nicht nötig — einfach löschen + neu)

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/availability.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

describe('AvailabilityService', () => {
  beforeEach(() => vi.resetModules())

  it('listRules returns rules sorted by day + time', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([
      { id: '1', userId: 'u-1', dayOfWeek: 0, startTime: '09:00:00', endTime: '12:00:00' },
      { id: '2', userId: 'u-1', dayOfWeek: 0, startTime: '13:00:00', endTime: '17:00:00' },
    ])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    const out = await AvailabilityService.listRules('u-1')
    expect(out).toHaveLength(2)
  })

  it('createRule inserts a row', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce([{ id: 'r-1' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    const out = await AvailabilityService.createRule('u-1', {
      dayOfWeek: 1, startTime: '09:00', endTime: '17:00',
    })
    expect(out.id).toBe('r-1')
  })

  it('listOverrides without date range returns all', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'o-1' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    const out = await AvailabilityService.listOverrides('u-1')
    expect(out).toHaveLength(1)
  })

  it('createOverride accepts free and block', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce([{ id: 'o-1', kind: 'block' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    const out = await AvailabilityService.createOverride('u-1', {
      startAt: new Date('2026-12-24T00:00:00Z'),
      endAt: new Date('2026-12-26T23:59:59Z'),
      kind: 'block',
      reason: 'Weihnachten',
    })
    expect(out.kind).toBe('block')
  })
})
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Service implementieren**

`src/lib/services/availability.service.ts`:

```typescript
import { db } from '@/lib/db'
import {
  availabilityRules, availabilityOverrides,
  type AvailabilityRule, type NewAvailabilityRule,
  type AvailabilityOverride, type NewAvailabilityOverride,
} from '@/lib/db/schema'
import { and, asc, eq, gte, lte } from 'drizzle-orm'

export type RuleCreateInput = Omit<NewAvailabilityRule, 'id' | 'userId' | 'createdAt'>
export type RuleUpdateInput = Partial<RuleCreateInput>

export type OverrideCreateInput = Omit<NewAvailabilityOverride, 'id' | 'userId' | 'createdAt'>

export const AvailabilityService = {
  async listRules(userId: string): Promise<AvailabilityRule[]> {
    return db.select().from(availabilityRules)
      .where(eq(availabilityRules.userId, userId))
      .orderBy(asc(availabilityRules.dayOfWeek), asc(availabilityRules.startTime))
  },

  async createRule(userId: string, input: RuleCreateInput): Promise<AvailabilityRule> {
    const [row] = await db.insert(availabilityRules)
      .values({ ...input, userId })
      .returning()
    return row
  },

  async updateRule(id: string, input: RuleUpdateInput): Promise<AvailabilityRule> {
    const [row] = await db.update(availabilityRules)
      .set(input)
      .where(eq(availabilityRules.id, id))
      .returning()
    return row
  },

  async deleteRule(id: string): Promise<void> {
    await db.delete(availabilityRules).where(eq(availabilityRules.id, id))
  },

  async listOverrides(userId: string, fromDate?: Date, toDate?: Date): Promise<AvailabilityOverride[]> {
    const conditions = [eq(availabilityOverrides.userId, userId)]
    if (fromDate) conditions.push(gte(availabilityOverrides.endAt, fromDate))
    if (toDate) conditions.push(lte(availabilityOverrides.startAt, toDate))
    return db.select().from(availabilityOverrides)
      .where(and(...conditions))
      .orderBy(asc(availabilityOverrides.startAt))
  },

  async createOverride(userId: string, input: OverrideCreateInput): Promise<AvailabilityOverride> {
    const [row] = await db.insert(availabilityOverrides)
      .values({ ...input, userId })
      .returning()
    return row
  },

  async deleteOverride(id: string): Promise<void> {
    await db.delete(availabilityOverrides).where(eq(availabilityOverrides.id, id))
  },
}
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/availability.service.ts src/__tests__/unit/services/availability.service.test.ts
git commit -m "feat(termine): AvailabilityService — rules + overrides CRUD"
```

---

## Phase C — API-Routen

### Task 4: Slot-Types API

**Files:**
- Create: `src/app/api/v1/slot-types/route.ts` (GET list, POST create)
- Create: `src/app/api/v1/slot-types/[id]/route.ts` (GET, PATCH, DELETE)
- Create: `src/app/api/v1/slot-types/reorder/route.ts` (POST)
- Test: `src/__tests__/integration/api/slot-types.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/integration/api/slot-types.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))
vi.mock('@/lib/services/slot-type.service', () => ({
  SlotTypeService: {
    list: vi.fn(),
    listActive: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  },
}))

describe('Slot-Types API', () => {
  beforeEach(() => vi.resetModules())

  it('GET /api/v1/slot-types returns own slot types', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.list).mockResolvedValueOnce([{ id: '1', name: 'Erst' } as never])
    const { GET } = await import('@/app/api/v1/slot-types/route')
    const res = await GET(new Request('https://x/api/v1/slot-types') as never)
    expect(res.status).toBe(200)
    expect(SlotTypeService.list).toHaveBeenCalledWith('u-1')
  })

  it('POST /api/v1/slot-types creates a new slot type', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.create).mockResolvedValueOnce({ id: 'new', name: 'Erstgespräch' } as never)
    const { POST } = await import('@/app/api/v1/slot-types/route')
    const req = new Request('https://x/api/v1/slot-types', {
      method: 'POST',
      body: JSON.stringify({
        slug: 'erstgespraech', name: 'Erstgespräch', durationMinutes: 30,
      }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(201)
  })

  it('POST returns 400 for invalid body', async () => {
    const { POST } = await import('@/app/api/v1/slot-types/route')
    const req = new Request('https://x/api/v1/slot-types', {
      method: 'POST',
      body: JSON.stringify({ slug: 'a' }),  // missing name + durationMinutes
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('PATCH /api/v1/slot-types/[id] enforces ownership', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({ id: 'st-1', userId: 'OTHER-USER' } as never)
    const { PATCH } = await import('@/app/api/v1/slot-types/[id]/route')
    const req = new Request('https://x/api/v1/slot-types/st-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'X' }),
    })
    const res = await PATCH(req as never, { params: Promise.resolve({ id: 'st-1' }) } as never)
    expect(res.status).toBe(404)  // 404 to avoid leaking existence
  })

  it('DELETE /api/v1/slot-types/[id] removes own slot type', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({ id: 'st-1', userId: 'u-1' } as never)
    const { DELETE } = await import('@/app/api/v1/slot-types/[id]/route')
    const res = await DELETE(
      new Request('https://x/api/v1/slot-types/st-1', { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: 'st-1' }) } as never,
    )
    expect(res.status).toBe(200)
    expect(SlotTypeService.delete).toHaveBeenCalledWith('st-1')
  })

  it('POST /api/v1/slot-types/reorder updates display order', async () => {
    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    const { POST } = await import('@/app/api/v1/slot-types/reorder/route')
    const req = new Request('https://x/api/v1/slot-types/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids: ['b', 'a'] }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(SlotTypeService.reorder).toHaveBeenCalledWith('u-1', ['b', 'a'])
  })
})
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Routen implementieren**

`src/app/api/v1/slot-types/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { SlotTypeService } from '@/lib/services/slot-type.service'

const SlugRegex = /^[a-z0-9-]{1,100}$/
const HexColorRegex = /^#[0-9a-fA-F]{6}$/

const CreateSchema = z.object({
  slug: z.string().regex(SlugRegex, 'lowercase a-z, 0-9 oder -'),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive(),
  bufferBeforeMinutes: z.number().int().min(0).default(0),
  bufferAfterMinutes: z.number().int().min(0).default(0),
  minNoticeHours: z.number().int().min(0).default(24),
  maxAdvanceDays: z.number().int().positive().default(60),
  color: z.string().regex(HexColorRegex).default('#3b82f6'),
  isActive: z.boolean().default(true),
  location: z.enum(['phone', 'video', 'onsite', 'custom']).default('phone'),
  locationDetails: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const slotTypes = await SlotTypeService.list(auth.userId)
    return NextResponse.json({ slotTypes })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'create', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = CreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    try {
      const created = await SlotTypeService.create(auth.userId, parsed.data)
      return NextResponse.json({ slotType: created }, { status: 201 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('uq_slot_types_user_slug')) {
        return NextResponse.json({ error: 'slug_already_exists' }, { status: 409 })
      }
      throw err
    }
  })
}
```

`src/app/api/v1/slot-types/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { SlotTypeService } from '@/lib/services/slot-type.service'

const UpdateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,100}$/).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().optional(),
  bufferBeforeMinutes: z.number().int().min(0).optional(),
  bufferAfterMinutes: z.number().int().min(0).optional(),
  minNoticeHours: z.number().int().min(0).optional(),
  maxAdvanceDays: z.number().int().positive().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isActive: z.boolean().optional(),
  location: z.enum(['phone', 'video', 'onsite', 'custom']).optional(),
  locationDetails: z.string().nullable().optional(),
})

interface RouteContext { params: Promise<{ id: string }> }

async function getOwnedSlotType(id: string, userId: string) {
  const st = await SlotTypeService.getById(id)
  // Return null for both not-found and not-owned to avoid leaking existence
  if (!st || st.userId !== userId) return null
  return st
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    const st = await getOwnedSlotType(id, auth.userId)
    if (!st) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ slotType: st })
  })
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    const st = await getOwnedSlotType(id, auth.userId)
    if (!st) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const parsed = UpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const updated = await SlotTypeService.update(id, parsed.data)
    return NextResponse.json({ slotType: updated })
  })
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    const st = await getOwnedSlotType(id, auth.userId)
    if (!st) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    await SlotTypeService.delete(id)
    return NextResponse.json({ ok: true })
  })
}
```

`src/app/api/v1/slot-types/reorder/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { SlotTypeService } from '@/lib/services/slot-type.service'

const ReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = ReorderSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    await SlotTypeService.reorder(auth.userId, parsed.data.ids)
    return NextResponse.json({ ok: true })
  })
}
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/slot-types/ src/__tests__/integration/api/slot-types.test.ts
git commit -m "feat(termine): /api/v1/slot-types CRUD + reorder with ownership guards"
```

---

### Task 5: Availability-API

**Files:**
- Create: `src/app/api/v1/availability/rules/route.ts` (GET, POST)
- Create: `src/app/api/v1/availability/rules/[id]/route.ts` (PATCH, DELETE)
- Create: `src/app/api/v1/availability/overrides/route.ts` (GET, POST)
- Create: `src/app/api/v1/availability/overrides/[id]/route.ts` (DELETE)
- Test: `src/__tests__/integration/api/availability.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/integration/api/availability.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))
vi.mock('@/lib/services/availability.service', () => ({
  AvailabilityService: {
    listRules: vi.fn(), createRule: vi.fn(), updateRule: vi.fn(), deleteRule: vi.fn(),
    listOverrides: vi.fn(), createOverride: vi.fn(), deleteOverride: vi.fn(),
  },
}))

const ownedRule = { id: 'r-1', userId: 'u-1', dayOfWeek: 1, startTime: '09:00:00', endTime: '17:00:00' }
const otherRule = { id: 'r-2', userId: 'OTHER', dayOfWeek: 1, startTime: '09:00:00', endTime: '17:00:00' }

describe('Availability Rules API', () => {
  beforeEach(() => vi.resetModules())

  it('GET /api/v1/availability/rules returns own rules', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([ownedRule] as never)
    const { GET } = await import('@/app/api/v1/availability/rules/route')
    const res = await GET(new Request('https://x/api/v1/availability/rules') as never)
    expect(res.status).toBe(200)
  })

  it('POST creates a rule', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.createRule).mockResolvedValueOnce(ownedRule as never)
    const { POST } = await import('@/app/api/v1/availability/rules/route')
    const req = new Request('https://x/api/v1/availability/rules', {
      method: 'POST',
      body: JSON.stringify({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(201)
  })

  it('POST 400 when end_time <= start_time', async () => {
    const { POST } = await import('@/app/api/v1/availability/rules/route')
    const req = new Request('https://x/api/v1/availability/rules', {
      method: 'POST',
      body: JSON.stringify({ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('PATCH enforces ownership via listRules', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([otherRule] as never)
    const { PATCH } = await import('@/app/api/v1/availability/rules/[id]/route')
    const req = new Request('https://x/api/v1/availability/rules/r-2', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PATCH(req as never, { params: Promise.resolve({ id: 'r-2' }) } as never)
    expect(res.status).toBe(404)
  })

  it('DELETE removes own rule', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([ownedRule] as never)
    const { DELETE } = await import('@/app/api/v1/availability/rules/[id]/route')
    const res = await DELETE(
      new Request('https://x/api/v1/availability/rules/r-1', { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: 'r-1' }) } as never,
    )
    expect(res.status).toBe(200)
    expect(AvailabilityService.deleteRule).toHaveBeenCalledWith('r-1')
  })
})

describe('Availability Overrides API', () => {
  beforeEach(() => vi.resetModules())

  it('GET returns overrides, optional date filter', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([] as never)
    const { GET } = await import('@/app/api/v1/availability/overrides/route')
    const res = await GET(new Request('https://x/api/v1/availability/overrides?from=2026-05-01&to=2026-05-31') as never)
    expect(res.status).toBe(200)
  })

  it('POST creates a block override', async () => {
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.createOverride).mockResolvedValueOnce({ id: 'o-1', kind: 'block' } as never)
    const { POST } = await import('@/app/api/v1/availability/overrides/route')
    const req = new Request('https://x/api/v1/availability/overrides', {
      method: 'POST',
      body: JSON.stringify({
        startAt: '2026-12-24T00:00:00Z',
        endAt: '2026-12-26T23:59:59Z',
        kind: 'block',
        reason: 'Weihnachten',
      }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Routen implementieren**

Helper für Ownership-Check (in beiden Detail-Routen verwendet) — kann als `_helpers.ts` ausgelagert werden falls gewünscht.

`src/app/api/v1/availability/rules/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'

// time as 'HH:MM' or 'HH:MM:SS'
const TimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

const RuleCreateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(TimeRegex),
  endTime: z.string().regex(TimeRegex),
  isActive: z.boolean().default(true),
}).refine(d => d.endTime > d.startTime, {
  message: 'endTime must be after startTime',
  path: ['endTime'],
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const rules = await AvailabilityService.listRules(auth.userId)
    return NextResponse.json({ rules })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'create', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = RuleCreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const rule = await AvailabilityService.createRule(auth.userId, parsed.data)
    return NextResponse.json({ rule }, { status: 201 })
  })
}
```

`src/app/api/v1/availability/rules/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'

const TimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

const RuleUpdateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(TimeRegex).optional(),
  endTime: z.string().regex(TimeRegex).optional(),
  isActive: z.boolean().optional(),
})

interface RouteContext { params: Promise<{ id: string }> }

async function ownsRule(userId: string, ruleId: string): Promise<boolean> {
  // Fetch all user rules and check — small list per user, no extra service method needed
  const rules = await AvailabilityService.listRules(userId)
  return rules.some(r => r.id === ruleId)
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    if (!await ownsRule(auth.userId, id)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const parsed = RuleUpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const updated = await AvailabilityService.updateRule(id, parsed.data)
    return NextResponse.json({ rule: updated })
  })
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    if (!await ownsRule(auth.userId, id)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    await AvailabilityService.deleteRule(id)
    return NextResponse.json({ ok: true })
  })
}
```

`src/app/api/v1/availability/overrides/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'

const OverrideCreateSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  kind: z.enum(['free', 'block']),
  reason: z.string().max(255).nullable().optional(),
}).refine(d => new Date(d.endAt) > new Date(d.startAt), {
  message: 'endAt must be after startAt',
  path: ['endAt'],
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const overrides = await AvailabilityService.listOverrides(
      auth.userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    )
    return NextResponse.json({ overrides })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'create', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = OverrideCreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const override = await AvailabilityService.createOverride(auth.userId, {
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      kind: parsed.data.kind,
      reason: parsed.data.reason ?? null,
    })
    return NextResponse.json({ override }, { status: 201 })
  })
}
```

`src/app/api/v1/availability/overrides/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'

interface RouteContext { params: Promise<{ id: string }> }

async function ownsOverride(userId: string, overrideId: string): Promise<boolean> {
  const overrides = await AvailabilityService.listOverrides(userId)
  return overrides.some(o => o.id === overrideId)
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    if (!await ownsOverride(auth.userId, id)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    await AvailabilityService.deleteOverride(id)
    return NextResponse.json({ ok: true })
  })
}
```

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/availability/ src/__tests__/integration/api/availability.test.ts
git commit -m "feat(termine): /api/v1/availability/{rules,overrides} with ownership guards"
```

---

## Phase D — UI

### Task 6: Slot-Typen-Verwaltung `/intern/termine/slot-types`

**Files:**
- Create: `src/app/intern/(dashboard)/termine/slot-types/page.tsx` (Server Component)
- Create: `src/app/intern/(dashboard)/termine/slot-types/_components/SlotTypesView.tsx` (Client)
- Create: `src/app/intern/(dashboard)/termine/slot-types/_components/SlotTypeFormSheet.tsx` (Client)
- Modify: `src/app/intern/(dashboard)/termine/layout.tsx` (Tab-Navigation für die drei Termine-Unterseiten)

- [ ] **Step 1: Layout um Tab-Nav ergänzen**

In `src/app/intern/(dashboard)/termine/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'

export default function TermineLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Termine</h1>
      </header>
      <nav className="flex gap-1 border-b">
        {[
          { href: '/intern/termine', label: 'Übersicht' },
          { href: '/intern/termine/slot-types', label: 'Termin-Arten' },
          { href: '/intern/termine/availability', label: 'Verfügbarkeit' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-primary/50 hover:text-foreground text-muted-foreground"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  )
}
```

(Active-Tab-Highlighting kann später per `usePathname()` ergänzt werden — außerhalb Phase 2.)

- [ ] **Step 2: Server-Page**

`src/app/intern/(dashboard)/termine/slot-types/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SlotTypeService } from '@/lib/services/slot-type.service'
import { SlotTypesView } from './_components/SlotTypesView'

export default async function SlotTypesPage() {
  const session = await getSession()
  if (!session) redirect('/intern/login')

  const slotTypes = await SlotTypeService.list(session.user.id)

  return <SlotTypesView initialSlotTypes={slotTypes.map(st => ({
    ...st,
    createdAt: st.createdAt.toISOString(),
    updatedAt: st.updatedAt.toISOString(),
  }))} />
}
```

- [ ] **Step 3: Client-Component (Liste + Form-Sheet)**

`src/app/intern/(dashboard)/termine/slot-types/_components/SlotTypesView.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { SlotTypeFormSheet, type SlotTypeFormValues } from './SlotTypeFormSheet'

interface SlotTypeRow {
  id: string
  slug: string
  name: string
  description: string | null
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  minNoticeHours: number
  maxAdvanceDays: number
  color: string
  isActive: boolean
  location: string
  locationDetails: string | null
  displayOrder: number
}

export function SlotTypesView({ initialSlotTypes }: { initialSlotTypes: SlotTypeRow[] }) {
  const [items, setItems] = useState<SlotTypeRow[]>(initialSlotTypes)
  const [editing, setEditing] = useState<SlotTypeRow | 'new' | null>(null)
  const [busy, setBusy] = useState(false)

  function copyBookingUrl(slug: string) {
    const url = `${window.location.origin}/buchen/<dein-slug>/${slug}`  // user slug folgt in Phase 4
    navigator.clipboard.writeText(url)
    toast.success('URL kopiert (User-Slug noch zu setzen — Phase 4)')
  }

  async function save(data: SlotTypeFormValues, existingId?: string) {
    setBusy(true)
    try {
      const res = await fetch(
        existingId ? `/api/v1/slot-types/${existingId}` : '/api/v1/slot-types',
        {
          method: existingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Speichern fehlgeschlagen')
      }
      const body = await res.json()
      const saved: SlotTypeRow = body.slotType
      setItems(curr => existingId
        ? curr.map(it => it.id === existingId ? saved : it)
        : [...curr, saved],
      )
      setEditing(null)
      toast.success(existingId ? 'Aktualisiert' : 'Angelegt')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Diesen Termin-Typ wirklich löschen?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/slot-types/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      setItems(curr => curr.filter(it => it.id !== id))
      toast.success('Gelöscht')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Definiere die Termin-Arten, die Kunden buchen können.
        </p>
        <Button onClick={() => setEditing('new')} disabled={busy}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Termin-Art
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Noch keine Termin-Arten angelegt. Lege z. B. ein „Erstgespräch 30 min" an.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map(it => (
            <Card key={it.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="h-10 w-10 shrink-0 rounded-md"
                      style={{ backgroundColor: it.color }}
                    />
                    <div className="min-w-0">
                      <CardTitle className="text-base">{it.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        /{it.slug} · {it.durationMinutes} min
                        {it.bufferBeforeMinutes > 0 && ` · ${it.bufferBeforeMinutes}m vor`}
                        {it.bufferAfterMinutes > 0 && ` · ${it.bufferAfterMinutes}m nach`}
                        {!it.isActive && ' · inaktiv'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyBookingUrl(it.slug)} aria-label="URL kopieren">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(it)} aria-label="Bearbeiten">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(it.id)} disabled={busy} aria-label="Löschen">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <SlotTypeFormSheet
          mode={editing === 'new' ? 'create' : 'edit'}
          initial={editing === 'new' ? null : editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={data => save(data, editing === 'new' ? undefined : editing.id)}
        />
      )}
    </div>
  )
}
```

`src/app/intern/(dashboard)/termine/slot-types/_components/SlotTypeFormSheet.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface SlotTypeFormValues {
  slug: string
  name: string
  description: string | null
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  minNoticeHours: number
  maxAdvanceDays: number
  color: string
  isActive: boolean
  location: 'phone' | 'video' | 'onsite' | 'custom'
  locationDetails: string | null
}

const defaults: SlotTypeFormValues = {
  slug: '', name: '', description: null,
  durationMinutes: 30,
  bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
  minNoticeHours: 24, maxAdvanceDays: 60,
  color: '#3b82f6', isActive: true,
  location: 'phone', locationDetails: null,
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[äöüß]/g, c => ({ä:'ae',ö:'oe',ü:'ue',ß:'ss'} as Record<string,string>)[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function SlotTypeFormSheet(props: {
  mode: 'create' | 'edit'
  initial: SlotTypeFormValues | null
  busy: boolean
  onCancel: () => void
  onSubmit: (data: SlotTypeFormValues) => void
}) {
  const [form, setForm] = useState<SlotTypeFormValues>(props.initial ?? defaults)
  const [slugTouched, setSlugTouched] = useState(props.mode === 'edit')

  function setField<K extends keyof SlotTypeFormValues>(k: K, v: SlotTypeFormValues[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setName(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : slugify(name),
    }))
  }

  return (
    <Sheet open onOpenChange={o => { if (!o) props.onCancel() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{props.mode === 'create' ? 'Neue Termin-Art' : 'Termin-Art bearbeiten'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={e => { setSlugTouched(true); setField('slug', e.target.value) }}
              placeholder="erstgespraech"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Dauer</Label>
            <div className="flex gap-2">
              {[30, 60, 240].map(min => (
                <Button
                  key={min}
                  type="button"
                  variant={form.durationMinutes === min ? 'default' : 'outline'}
                  onClick={() => setField('durationMinutes', min)}
                  size="sm"
                >
                  {min} min
                </Button>
              ))}
              <Input
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={e => setField('durationMinutes', parseInt(e.target.value) || 0)}
                className="w-24"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bb">Puffer vor (min)</Label>
              <Input id="bb" type="number" min={0} value={form.bufferBeforeMinutes}
                onChange={e => setField('bufferBeforeMinutes', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ba">Puffer nach (min)</Label>
              <Input id="ba" type="number" min={0} value={form.bufferAfterMinutes}
                onChange={e => setField('bufferAfterMinutes', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mn">Min. Vorlauf (h)</Label>
              <Input id="mn" type="number" min={0} value={form.minNoticeHours}
                onChange={e => setField('minNoticeHours', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ma">Max. Vorlauf (Tage)</Label>
              <Input id="ma" type="number" min={1} value={form.maxAdvanceDays}
                onChange={e => setField('maxAdvanceDays', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Beschreibung (Markdown)</Label>
            <Textarea id="desc" rows={3} value={form.description ?? ''}
              onChange={e => setField('description', e.target.value || null)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="color">Farbe</Label>
              <Input id="color" type="color" value={form.color}
                onChange={e => setField('color', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc">Ort</Label>
              <select id="loc"
                value={form.location}
                onChange={e => setField('location', e.target.value as SlotTypeFormValues['location'])}
                className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm">
                <option value="phone">Telefon</option>
                <option value="video">Video</option>
                <option value="onsite">Vor Ort</option>
                <option value="custom">Sonstiges</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ld">Ort-Details</Label>
            <Input id="ld" value={form.locationDetails ?? ''}
              placeholder="z. B. „Zoom-Link wird per Mail gesendet"
              onChange={e => setField('locationDetails', e.target.value || null)} />
          </div>

          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={form.isActive}
              onChange={e => setField('isActive', e.target.checked)} />
            <Label htmlFor="active">Aktiv (auf Buchungsseite anzeigen)</Label>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={props.onCancel} disabled={props.busy}>Abbrechen</Button>
          <Button onClick={() => props.onSubmit(form)} disabled={props.busy || !form.name || !form.slug}>
            Speichern
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

(Falls eines der shadcn/ui-Komponenten — `Sheet`, `Textarea` — nicht existiert: shadcn-add-Befehl verwenden, oder schau wie andere Module dasselbe lösen.)

- [ ] **Step 4: tsc + manueller Smoketest**

```bash
npx tsc --noEmit
npm run dev
# Browser: /intern/termine/slot-types
# - Neuer Termin-Typ anlegen (Name → Slug auto, Dauer 30, Puffer 0/0)
# - Bearbeiten ändert Werte
# - Löschen entfernt
```

- [ ] **Step 5: Commit**

```bash
git add src/app/intern/\(dashboard\)/termine/
git commit -m "feat(termine): slot types management UI"
```

---

### Task 7: Verfügbarkeits-Editor `/intern/termine/availability`

**Files:**
- Create: `src/app/intern/(dashboard)/termine/availability/page.tsx`
- Create: `src/app/intern/(dashboard)/termine/availability/_components/AvailabilityView.tsx`
- Create: `src/app/intern/(dashboard)/termine/availability/_components/RulesEditor.tsx`
- Create: `src/app/intern/(dashboard)/termine/availability/_components/OverridesEditor.tsx`

**Layout:** zwei Tabs „Wochenraster" / „Ausnahmen". Pro Tab eine Editor-Komponente.

- [ ] **Step 1: Server-Page**

`src/app/intern/(dashboard)/termine/availability/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AvailabilityService } from '@/lib/services/availability.service'
import { AvailabilityView } from './_components/AvailabilityView'

export default async function AvailabilityPage() {
  const session = await getSession()
  if (!session) redirect('/intern/login')

  const [rules, overrides] = await Promise.all([
    AvailabilityService.listRules(session.user.id),
    AvailabilityService.listOverrides(session.user.id),
  ])

  return (
    <AvailabilityView
      initialRules={rules}
      initialOverrides={overrides.map(o => ({
        ...o,
        startAt: o.startAt.toISOString(),
        endAt: o.endAt.toISOString(),
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  )
}
```

- [ ] **Step 2: Tabs-Container**

`src/app/intern/(dashboard)/termine/availability/_components/AvailabilityView.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AvailabilityRule } from '@/lib/db/schema'
import { RulesEditor } from './RulesEditor'
import { OverridesEditor, type OverrideRow } from './OverridesEditor'

export function AvailabilityView(props: {
  initialRules: AvailabilityRule[]
  initialOverrides: OverrideRow[]
}) {
  const [rules, setRules] = useState(props.initialRules)
  const [overrides, setOverrides] = useState(props.initialOverrides)

  return (
    <Tabs defaultValue="rules">
      <TabsList>
        <TabsTrigger value="rules">Wochenraster</TabsTrigger>
        <TabsTrigger value="overrides">Ausnahmen</TabsTrigger>
      </TabsList>
      <TabsContent value="rules" className="mt-4">
        <RulesEditor rules={rules} onChange={setRules} />
      </TabsContent>
      <TabsContent value="overrides" className="mt-4">
        <OverridesEditor overrides={overrides} onChange={setOverrides} />
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 3: RulesEditor**

`src/app/intern/(dashboard)/termine/availability/_components/RulesEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { AvailabilityRule } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

const DAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

function ruleTime(t: string): string {
  // PG returns 'HH:MM:SS' — strip seconds
  return t.length === 8 ? t.slice(0, 5) : t
}

export function RulesEditor({ rules, onChange }: {
  rules: AvailabilityRule[]
  onChange: (next: AvailabilityRule[]) => void
}) {
  const [busy, setBusy] = useState(false)

  async function addRule(dayOfWeek: number) {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/availability/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, startTime: '09:00', endTime: '17:00' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Anlegen fehlgeschlagen')
      const { rule } = await res.json()
      onChange([...rules, rule])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function patchRule(id: string, patch: Partial<{ startTime: string; endTime: string; isActive: boolean }>) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Update fehlgeschlagen')
      const { rule } = await res.json()
      onChange(rules.map(r => r.id === id ? rule : r))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function deleteRule(id: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      onChange(rules.filter(r => r.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Definiere für jeden Wochentag, in welchen Zeitfenstern du buchbar bist. Mehrere Intervalle pro Tag möglich.
      </p>
      {DAYS_DE.map((day, idx) => {
        const dayRules = rules.filter(r => r.dayOfWeek === idx)
        return (
          <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="w-24 pt-1.5 text-sm font-medium">{day}</div>
            <div className="flex-1 space-y-2">
              {dayRules.length === 0 ? (
                <div className="text-sm text-muted-foreground">— frei —</div>
              ) : dayRules.map(r => (
                <div key={r.id} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={ruleTime(r.startTime)}
                    onChange={e => patchRule(r.id, { startTime: e.target.value })}
                    className="w-28"
                    disabled={busy}
                  />
                  <span>–</span>
                  <Input
                    type="time"
                    value={ruleTime(r.endTime)}
                    onChange={e => patchRule(r.id, { endTime: e.target.value })}
                    className="w-28"
                    disabled={busy}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)} disabled={busy} aria-label="Entfernen">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addRule(idx)} disabled={busy}>
                <Plus className="mr-1 h-4 w-4" />
                Intervall
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: OverridesEditor**

`src/app/intern/(dashboard)/termine/availability/_components/OverridesEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Trash2, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export interface OverrideRow {
  id: string
  userId: string
  startAt: string  // ISO
  endAt: string    // ISO
  kind: 'free' | 'block'
  reason: string | null
  createdAt: string
}

function fmtRange(a: string, b: string): string {
  const da = new Date(a), db = new Date(b)
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  return `${da.toLocaleString('de-DE', opts)} – ${db.toLocaleString('de-DE', opts)}`
}

export function OverridesEditor({ overrides, onChange }: {
  overrides: OverrideRow[]
  onChange: (next: OverrideRow[]) => void
}) {
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    startAt: '', endAt: '', kind: 'block' as 'free' | 'block', reason: '',
  })

  async function create() {
    if (!form.startAt || !form.endAt) {
      toast.error('Start und Ende erforderlich')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/v1/availability/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          kind: form.kind,
          reason: form.reason || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Anlegen fehlgeschlagen')
      const { override } = await res.json()
      onChange([...overrides, override].sort((a, b) => a.startAt.localeCompare(b.startAt)))
      setShowForm(false)
      setForm({ startAt: '', endAt: '', kind: 'block', reason: '' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Eintrag wirklich löschen?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/overrides/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      onChange(overrides.filter(o => o.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  const today = new Date()
  const upcoming = overrides.filter(o => new Date(o.endAt) >= today)
  const past = overrides.filter(o => new Date(o.endAt) < today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Einzelne Zeitfenster blockieren (Urlaub, Feiertag) oder zusätzlich freigeben (z. B. ausnahmsweise Samstag).
        </p>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} disabled={busy}>
            Neue Ausnahme
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.kind === 'block' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, kind: 'block' })}
              >
                <Ban className="mr-2 h-4 w-4" />
                Blockieren
              </Button>
              <Button
                type="button"
                variant={form.kind === 'free' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, kind: 'free' })}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Zusätzlich freigeben
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="from">Von</Label>
                <Input id="from" type="datetime-local" value={form.startAt}
                  onChange={e => setForm({ ...form, startAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">Bis</Label>
                <Input id="to" type="datetime-local" value={form.endAt}
                  onChange={e => setForm({ ...form, endAt: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Grund (optional)</Label>
              <Input id="reason" value={form.reason} placeholder="z. B. Urlaub"
                onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={busy}>Speichern</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} disabled={busy}>Abbrechen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="font-medium mb-2 text-sm">Bevorstehend ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine bevorstehenden Ausnahmen.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(o => (
              <Card key={o.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    {o.kind === 'block'
                      ? <Ban className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{fmtRange(o.startAt, o.endAt)}</p>
                      {o.reason && <p className="text-xs text-muted-foreground">{o.reason}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(o.id)} disabled={busy} aria-label="Löschen">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">Vergangene anzeigen ({past.length})</summary>
          <div className="space-y-2 mt-2">
            {past.map(o => (
              <Card key={o.id}>
                <CardContent className="p-3 text-muted-foreground flex items-center justify-between">
                  <p className="text-sm">{fmtRange(o.startAt, o.endAt)} {o.reason && ` · ${o.reason}`}</p>
                  <Button variant="ghost" size="icon" onClick={() => remove(o.id)} disabled={busy} aria-label="Löschen">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
```

- [ ] **Step 5: tsc + manueller Smoketest**

- [ ] **Step 6: Commit**

```bash
git add src/app/intern/\(dashboard\)/termine/availability/
git commit -m "feat(termine): availability editor (weekly rules + overrides)"
```

---

### Task 8: Übersichts-Seite — Wochenkalender (read-only)

Ersetzt den Stub auf `/intern/termine`. Zeigt eine Wochenansicht mit:
- Wochenraster aus `availability_rules` als heller Hintergrund
- `availability_overrides` (kind=block) als rote Schraffur
- `availability_overrides` (kind=free) als grünliche Highlights
- Heutige Spalte hervorgehoben
- Wochen-Navigation (Vorwoche / Aktuelle Woche / Nächste Woche)

Termine + externe Google-Events kommen erst in Phase 3+4.

**Files:**
- Modify: `src/app/intern/(dashboard)/termine/page.tsx`
- Create: `src/app/intern/(dashboard)/termine/_components/WeekCalendarView.tsx`

- [ ] **Step 1: Server-Page**

`src/app/intern/(dashboard)/termine/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AvailabilityService } from '@/lib/services/availability.service'
import { WeekCalendarView } from './_components/WeekCalendarView'

interface PageProps {
  searchParams: Promise<{ week?: string }>
}

export default async function TermineOverviewPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/intern/login')
  const { week } = await searchParams

  // Compute week range (Mon..Sun) — current week if not specified
  const anchor = week ? new Date(week) : new Date()
  const monday = startOfWeek(anchor)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const [rules, overrides] = await Promise.all([
    AvailabilityService.listRules(session.user.id),
    AvailabilityService.listOverrides(session.user.id, monday, sunday),
  ])

  return (
    <WeekCalendarView
      monday={monday.toISOString()}
      rules={rules}
      overrides={overrides.map(o => ({
        ...o,
        startAt: o.startAt.toISOString(),
        endAt: o.endAt.toISOString(),
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  )
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day  // ISO week starts Mon
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}
```

- [ ] **Step 2: Wochenkalender-Komponente**

`src/app/intern/(dashboard)/termine/_components/WeekCalendarView.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AvailabilityRule } from '@/lib/db/schema'

interface OverrideLite {
  id: string
  startAt: string
  endAt: string
  kind: 'free' | 'block'
  reason: string | null
}

const DAYS_DE_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOURS = Array.from({ length: 17 }, (_, i) => 6 + i)  // 06:00 – 22:00

function ruleTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function WeekCalendarView(props: {
  monday: string
  rules: AvailabilityRule[]
  overrides: OverrideLite[]
}) {
  const router = useRouter()
  const monday = new Date(props.monday)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

  function navigate(weeks: number) {
    const next = new Date(monday)
    next.setDate(next.getDate() + weeks * 7)
    router.push(`/intern/termine?week=${next.toISOString().slice(0, 10)}`)
  }

  // Calendar grid: 7 columns × (17h × 4 quarter-hours) = 7 × 68 cells
  // For each cell, determine: in-rules / blocked / free-override
  function cellState(dayIdx: number, hourMinute: number): 'available' | 'blocked' | 'free-override' | 'idle' {
    const day = days[dayIdx]
    const cellStart = new Date(day)
    cellStart.setHours(0, 0, 0, 0)
    cellStart.setMinutes(hourMinute)
    const cellEnd = new Date(cellStart)
    cellEnd.setMinutes(cellEnd.getMinutes() + 15)

    // Override checks first (they override rules)
    for (const o of props.overrides) {
      const oStart = new Date(o.startAt)
      const oEnd = new Date(o.endAt)
      if (cellStart < oEnd && cellEnd > oStart) {
        return o.kind === 'block' ? 'blocked' : 'free-override'
      }
    }

    // Rules: dayOfWeek 0=Mo..6=So in our schema; JS Date getDay 0=Sun..6=Sat
    const jsDay = day.getDay()
    const ourDay = jsDay === 0 ? 6 : jsDay - 1
    const matching = props.rules.filter(r => r.dayOfWeek === ourDay && r.isActive)
    for (const r of matching) {
      const start = ruleTimeToMinutes(r.startTime)
      const end = ruleTimeToMinutes(r.endTime)
      if (hourMinute >= start && hourMinute + 15 <= end) return 'available'
    }
    return 'idle'
  }

  const cellClass = (state: ReturnType<typeof cellState>): string => {
    switch (state) {
      case 'available': return 'bg-emerald-50 dark:bg-emerald-950/40'
      case 'blocked': return 'bg-red-100 dark:bg-red-950/50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)]'
      case 'free-override': return 'bg-emerald-200 dark:bg-emerald-900/60'
      default: return ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Vorwoche">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(0)}>Heute</Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Nächste Woche">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium">
            KW {weekNumber(monday)} · {monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – {days[6].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px]">
          <div className="border-b bg-muted/40 p-2 text-xs font-medium" />
          {days.map((d, i) => {
            const isToday = d.getTime() === today.getTime()
            return (
              <div
                key={i}
                className={`border-b border-l bg-muted/40 p-2 text-xs font-medium text-center ${isToday ? 'bg-primary/10' : ''}`}
              >
                <div>{DAYS_DE_SHORT[i]}</div>
                <div className="text-muted-foreground">{d.getDate()}.{d.getMonth() + 1}.</div>
              </div>
            )
          })}

          {HOURS.map(h => (
            <div key={`row-${h}`} className="contents">
              <div className="border-r border-b p-1 text-xs text-muted-foreground text-right pr-2">
                {String(h).padStart(2, '0')}:00
              </div>
              {days.map((_, dayIdx) => (
                <div key={`cell-${h}-${dayIdx}`} className="border-l border-b">
                  {[0, 15, 30, 45].map(min => {
                    const hourMinute = h * 60 + min
                    const state = cellState(dayIdx, hourMinute)
                    return (
                      <div
                        key={min}
                        className={`h-3.5 ${cellClass(state)} ${min === 0 ? '' : 'border-t border-dashed border-muted-foreground/10'}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Hinweis: Termine und externe Google-Events werden in den Phasen 3 und 4 ergänzt. Aktuell siehst du nur dein Wochenraster und Ausnahmen.
      </p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-emerald-50 border" />
        verfügbar
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-emerald-200 border" />
        zusätzlich frei
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-red-100 border" />
        blockiert
      </span>
    </div>
  )
}

function weekNumber(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  // Thursday in current week decides the year
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const yearStart = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7)
}
```

- [ ] **Step 2: tsc + manueller Smoketest**

```bash
npx tsc --noEmit
npm run dev
# Browser: /intern/termine
# - Wochenraster zeigt grüne verfügbare Slots
# - Ausnahme-Block zeigt rote Schraffur
# - Heute hervorgehoben
# - Vorwoche / Nächste Woche funktioniert
```

- [ ] **Step 3: Commit**

```bash
git add src/app/intern/\(dashboard\)/termine/page.tsx src/app/intern/\(dashboard\)/termine/_components/
git commit -m "feat(termine): read-only week calendar overview (rules + overrides)"
```

---

## Phase E — Abschluss

### Task 9: Lint + Build + Tests gesamt

- [ ] **Step 1: Vollständiger Test-Lauf**

```bash
npx vitest run
```

Erwartet: alle neuen Tests grün, alle bestehenden bleiben grün.

- [ ] **Step 2: tsc**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Erwartet: keine neuen Fehler in geänderten/neuen Dateien.

- [ ] **Step 4: E2E-Smoketest manuell**

- [ ] Login als User
- [ ] `/intern/termine/slot-types` → Termin-Art „Erstgespräch 30 min" anlegen mit Puffer 5/10, Aktiv. Bearbeiten ändert Werte. Löschen entfernt.
- [ ] Slug-Kollision: zwei Termin-Arten mit gleichem Slug → 409
- [ ] `/intern/termine/availability` → Tab Wochenraster → für Mo–Fr Intervall 09:00–17:00 anlegen
- [ ] Mehrere Intervalle pro Tag (Mi 09–12 und 13–17) → speichern, beide sichtbar
- [ ] Tab Ausnahmen → Block über Weihnachten anlegen → in Liste sichtbar
- [ ] Free-Override (zusätzlich Samstag) anlegen
- [ ] `/intern/termine` → Wochenkalender zeigt Mo–Fr-Verfügbarkeit grün, Weihnachten rot, Samstag-Ausnahme grün hervorgehoben
- [ ] Wochen-Navigation: vor/zurück, springt zur richtigen Woche

### Task 10: Merge auf main + push

```bash
git log --oneline main..HEAD   # alle Phase-2-Commits prüfen
git checkout main
git pull --rebase origin main
git merge --no-ff feat/termine-phase2 -m "Merge branch 'feat/termine-phase2'"
git push origin main
```

(Wenn auf einem Feature-Branch — ansonsten direkt auf main wie Phase 1.)

---

## Self-Review-Checkliste (vor Plan-Abnahme)

Spec-Coverage Phase 2 (§1.3, §1.4, §1.5, §3.1–§3.3, §9.3 #2):
- ✅ Slot-Typen (CRUD, slug-unique, Puffer, Vorlauf, Farbe, Aktiv, Location) → Tasks 2, 4, 6
- ✅ Wochenraster (mehrere Intervalle pro Tag, end > start) → Tasks 3, 5, 7
- ✅ Overrides (free/block, Datumsbereich) → Tasks 3, 5, 7
- ✅ Backend-Kalender-Übersicht (Wochen-Raster + Overrides, read-only) → Task 8
- ✅ Tab-Nav im Termine-Layout → Task 6 Step 1
- ✅ Ownership-Guards (404 bei fremder Ressource) → Tasks 4, 5
- ✅ Validation (Zod safeParse, 409 bei slug-Kollision) → Tasks 4, 5

Bewusst nicht in Phase 2:
- Buchungsseite + Buchungen → Phase 4
- `availability-calc.service.ts` (Slot-Generierung mit Puffern) → Phase 4
- Externe Google-Events im Kalender → Phase 3
- Drag-Reorder UI für Slot-Typen (API ist da, UI nicht) → kann nachgereicht werden, nicht spec-blockierend
- Active-Tab-Highlighting im Layout (kosmetisch)
- Bulk-Aktionen wie „Mo–Fr kopieren" im Wochenraster

Type-Konsistenz: Service-Methoden + API-Routen + UI-State-Shapes verwenden dieselben Drizzle-`$inferSelect`-Typen (`SlotType`, `AvailabilityRule`, `AvailabilityOverride`).

Placeholder-Scan: keine TBDs, alle Code-Steps zeigen vollständige Implementierung.
