# Testing Guide - xKMU BusinessOS

## Schnellstart

```bash
# Alle Tests ausfuehren
npm test

# Nur Unit-Tests (Validation + Services)
npm run test:unit

# Nur Integrationstests (API Routes)
npm run test:integration

# Watch-Modus (Tests laufen bei Aenderungen automatisch)
npm run test:watch

# Mit Coverage-Report
npm run test:coverage
```

## Teststruktur

```
src/__tests__/
├── setup.ts                              # Globales Setup (Mock-Reset)
├── helpers/
│   ├── fixtures.ts                       # Test-Daten Factories
│   ├── mock-db.ts                        # Drizzle DB Mock
│   ├── mock-auth.ts                      # Auth/Permission Mock
│   └── mock-request.ts                   # NextRequest Builder
├── unit/
│   ├── validation/                       # Zod Schema Tests
│   │   ├── company.validation.test.ts
│   │   ├── person.validation.test.ts
│   │   ├── lead.validation.test.ts
│   │   ├── idea.validation.test.ts
│   │   ├── activity.validation.test.ts
│   │   ├── product.validation.test.ts
│   │   ├── product-category.validation.test.ts
│   │   ├── document.validation.test.ts
│   │   ├── webhook.validation.test.ts
│   │   ├── user.validation.test.ts
│   │   ├── role.validation.test.ts
│   │   ├── tenant.validation.test.ts
│   │   ├── blog.validation.test.ts
│   │   ├── cms.validation.test.ts
│   │   ├── marketing.validation.test.ts
│   │   └── social-media.validation.test.ts
│   └── services/                         # Service Unit Tests
│       └── company.service.test.ts       # Referenz-Implementierung
└── integration/
    └── api/                              # API Route Tests
        └── companies.route.test.ts       # Referenz-Implementierung
```

## Test-Typen

### 1. Validation Tests (Zod Schemas)

Testen die Eingabe-Validierung direkt gegen die Zod-Schemas. Kein Mocking noetig.

```typescript
import { describe, it, expect } from 'vitest'
import { createCompanySchema } from '@/lib/utils/validation'

describe('createCompanySchema', () => {
  it('accepts valid input', () => {
    const result = createCompanySchema.safeParse({ name: 'Test GmbH' })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = createCompanySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
```

**Was wird getestet:**
- Pflichtfelder vorhanden/fehlend
- Feldlaengen (min/max)
- Enum-Werte (gueltig/ungueltig)
- Default-Werte
- Optionale Felder, nullable Felder
- Email/URL-Validierung
- Regex-Patterns (z.B. Slug, Rollenname)

### 2. Service Unit Tests (mit DB-Mocks)

Testen die Geschaeftslogik der Services isoliert von der Datenbank.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { companyFixture, TEST_TENANT_ID } from '../../helpers/fixtures'

describe('CompanyService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()        // Module-Cache leeren
    dbMock = setupDbMock()   // DB Mock registrieren
  })

  async function getService() {
    // Service NACH dem Mock dynamisch importieren
    const mod = await import('@/lib/services/company.service')
    return mod.CompanyService
  }

  it('creates a company', async () => {
    dbMock.mockInsert.mockResolvedValue([companyFixture()])

    const service = await getService()
    const result = await service.create(TEST_TENANT_ID, { name: 'Test' })

    expect(result.name).toBe('Test GmbH')
    expect(dbMock.db.insert).toHaveBeenCalled()
  })
})
```

**Wichtig:**
- `vi.resetModules()` muss VOR `setupDbMock()` aufgerufen werden
- Service muss per dynamischem `import()` NACH dem Mock geladen werden
- Fuer `list()` Methoden mit `Promise.all`: `mockResolvedValueOnce` zweimal aufrufen (Items + Count)

### 3. API Route Integration Tests (mit Auth + DB Mocks)

Testen den kompletten Request-Flow durch die API Route Handler.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext, mockAuthForbidden } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture, companyFixture } from '../../helpers/fixtures'

describe('POST /api/v1/companies', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())  // Als Admin authentifiziert
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/route')
    return mod.POST
  }

  it('returns 201 with valid data', async () => {
    dbMock.mockSelect.mockResolvedValue([])          // Kein Duplikat
    dbMock.mockInsert.mockResolvedValue([companyFixture()])

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', { name: 'Test' })
    const res = await handler(req)

    expect(res.status).toBe(201)
  })

  it('returns 401 without auth', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(null)  // Nicht authentifiziert

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', { name: 'Test' })
    const res = await handler(req)

    expect(res.status).toBe(401)
  })
})
```

## Test Helpers

### fixtures.ts - Test-Daten

```typescript
import { authFixture, companyFixture, createCompanyInput } from '../helpers/fixtures'

// Standard Auth-Context (Admin)
const auth = authFixture()

// Auth mit anderer Rolle
const viewer = authFixture({ role: 'viewer' })

// Standard Company-Objekt (wie aus der DB)
const company = companyFixture()

// Company mit ueberschriebenen Feldern
const company = companyFixture({ name: 'Custom', status: 'customer' })

// Eingabe-Daten fuer POST/PUT
const input = createCompanyInput({ name: 'Neue Firma' })
```

### mock-db.ts - Datenbank Mock

```typescript
import { setupDbMock } from '../helpers/mock-db'

const dbMock = setupDbMock()

// Standard-Rueckgabe fuer alle Aufrufe
dbMock.mockSelect.mockResolvedValue([company])

// Einmalige Rueckgabe (fuer Promise.all in list())
dbMock.mockSelect.mockResolvedValueOnce([items])   // Erster Aufruf: Items
dbMock.mockSelect.mockResolvedValueOnce([{ count: 5 }])  // Zweiter: Count

// Pruefen ob DB aufgerufen wurde
expect(dbMock.db.insert).toHaveBeenCalled()
expect(dbMock.db.select).toHaveBeenCalledTimes(2)
```

### mock-auth.ts - Authentifizierung Mock

```typescript
import { mockAuthContext, mockAuthForbidden } from '../helpers/mock-auth'

// Authentifiziert mit bestimmtem Context
mockAuthContext(authFixture())

// Nicht authentifiziert (401)
mockAuthContext(null)

// Keine Berechtigung (403)
mockAuthForbidden()
```

### mock-request.ts - Request Builder

```typescript
import { createTestRequest, createTestParams } from '../helpers/mock-request'

// GET Request
const req = createTestRequest('GET', '/api/v1/companies?page=2')

// POST Request mit Body
const req = createTestRequest('POST', '/api/v1/companies', { name: 'Test' })

// Route-Parameter fuer [id] Routes (Next.js 16 Pattern)
const params = createTestParams('some-uuid')
const res = await handler(req, params)
```

## Neues Modul testen

Um Tests fuer ein neues Modul hinzuzufuegen:

### 1. Validation Tests

Datei erstellen: `src/__tests__/unit/validation/<modul>.validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { createXxxSchema, updateXxxSchema } from '@/lib/utils/validation'

describe('createXxxSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createXxxSchema.safeParse({ /* Pflichtfelder */ })
    expect(result.success).toBe(true)
  })
  // Weitere Tests fuer jede Feld-Constraint...
})

describe('updateXxxSchema', () => {
  it('accepts empty object', () => {
    const result = updateXxxSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})
```

### 2. Service Tests

Datei erstellen: `src/__tests__/unit/services/<modul>.service.test.ts`

Kopiere `company.service.test.ts` und ersetze:
- Import des Services
- Fixture-Funktionen
- Methodennamen und erwartete Ergebnisse

### 3. Route Tests

Datei erstellen: `src/__tests__/integration/api/<modul>.route.test.ts`

Kopiere `companies.route.test.ts` und ersetze:
- Import-Pfade der Route
- Schema- und Service-Referenzen
- Request-URLs und Bodies

## Aktueller Stand

| Kategorie | Dateien | Tests |
|-----------|---------|-------|
| Validation (Zod) | 18 | ~755 |
| Service (Unit) | 18 | ~416 |
| Integration (API) | 1 | 20 |
| **Gesamt** | **37** | **~1171** |

### Validation Tests (alle Schemas abgedeckt)

| Modul | Tests | Schemas |
|-------|-------|---------|
| Company | 20 | createCompanySchema, updateCompanySchema |
| Person | 35 | createPersonSchema, updatePersonSchema |
| Lead | 31 | createLeadSchema, updateLeadSchema |
| Idea | 18 | createIdeaSchema, updateIdeaSchema |
| Activity | 26 | createActivitySchema, updateActivitySchema |
| Product | 58 | createProductSchema, updateProductSchema |
| ProductCategory | 17 | createProductCategorySchema, updateProductCategorySchema |
| Document | 71 | createDocumentSchema, createDocumentItemSchema, + Status |
| Webhook | 28 | createWebhookSchema, updateWebhookSchema |
| User | 57 | createUserSchema, loginSchema, registerSchema, + Passwort |
| Role | 31 | createRoleSchema, updateRoleSchema |
| Tenant | 23 | createTenantSchema, updateTenantSchema |
| Blog | 45 | createBlogPostSchema, generateBlogPostSchema |
| CMS | 60 | Pages, Blocks, Navigation Schemas |
| Marketing | 65 | Campaigns, Tasks, Templates Schemas |
| Social Media | 40 | Posts, Topics Schemas |
| Misc | 49 | contactForm, businessDocumentUpload, pagination, convertIdea |
| AI Schemas | 65 | generateMarketing/Social/ContentPlan/Topics, improveSocialPost |

### Service Unit Tests

| Modul | Tests | Methoden |
|-------|-------|----------|
| Company | 30 | create, getById, update, delete, list, search, addTag, removeTag, getPersons, checkDuplicate |
| Person | 38 | create, getById, update, delete, list, search, addTag, removeTag, setPrimaryContact |
| Lead | 28 | create, getById, update, delete, list, updateStatus, assignTo, getStatusCounts, updateAIResearch |
| Idea | 22 | create, getById, update, delete, list, listGroupedByStatus |
| Activity | 22 | create, getById, delete, list, listByLead, listByCompany |
| Product | 30 | create, getById, update, delete, list, search, addTag, removeTag, generateSlug |
| Document | 30 | create, getById, update, delete, list, generateNumber, updateStatus, addItem, removeItem |
| User | 25 | create, authenticate, getById, getByEmail, update, updatePassword, delete, list, emailExists |
| Role | 25 | getById, getByName, list, getWithPermissions, create, update, delete, setPermissions, getUserPermissions |
| Webhook | 26 | create, getById, update, delete, list, getByEvent, fire, sendWebhook |
| BlogPost | 22 | create, getById, getBySlug, update, delete, publish, unpublish, list, listPublished, generateSlug |
| CmsPage | 14 | create, getById, getBySlug, update, delete, publish, list |
| CmsBlock | 15 | listByPage, create, update, delete, reorder, duplicate |
| CmsNavigation | 13 | list, create, update, delete, reorder |
| MarketingCampaign | 16 | create, getById, update, delete, list |
| MarketingTask | 16 | create, getById, update, delete, list, listByCampaign |
| SocialMediaPost | 19 | create, getById, update, delete, list, bulkCreate |
| SocialMediaTopic | 14 | list, getById, create, update, delete |
| Social/CryptoConfig | 4 | getSocialTokenKey (env-fallback, validation) |
| Social/PostStatus | 4 | status state-machine helpers |
| Social/MetaOAuthClient | 6 | buildAuthorizeUrl, exchangeCode, exchangeForLongLived, listPagesWithIg |
| Social/MetaPublishClient | 6 | publishToFacebookPage, publishToInstagram (2-step) |
| Social/MetaProvider | 5 | publish (FB/IG dispatch, account-loading, error-handling) |
| Social/InstagramOAuthClient | 4 | buildAuthorizeUrl, exchangeCode, getUserInfo |
| Social/InstagramPublishClient | 5 | publishImage (container + publish) |
| Social/InstagramProvider | 4 | publish, hashtag-compose, image-url-absolutize |
| Social/SocialAccountService | 8 | connectMeta, connectInstagram, connectX, connectLinkedIn, list, disconnect |
| Social/SocialPostService | 8 | listForCalendar, reconcilePublishTask, status-transitions |

### API Route Integration Tests

| Modul | Tests | Endpoints |
|-------|-------|-----------|
| Companies | 20 | POST, GET, GET [id], PUT [id], DELETE [id] + Auth |

## Konfiguration

- **Config:** `vitest.config.ts`
- **Setup:** `src/__tests__/setup.ts`
- **Environment:** Node (kein jsdom noetig fuer API Tests)
- **Path Alias:** `@/*` -> `./src/*`
