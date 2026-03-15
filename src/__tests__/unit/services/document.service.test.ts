import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID, TEST_USER_ID, TEST_COMPANY_ID } from '../../helpers/fixtures'

const TEST_DOC_ID = '00000000-0000-0000-0000-000000000030'
const TEST_ITEM_ID = '00000000-0000-0000-0000-000000000031'
const TEST_PERSON_ID = '00000000-0000-0000-0000-000000000032'

function documentFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_DOC_ID,
    tenantId: TEST_TENANT_ID,
    type: 'invoice',
    number: 'RE-2026-0001',
    companyId: null,
    contactPersonId: null,
    status: 'draft',
    issueDate: new Date('2026-01-01T00:00:00Z'),
    dueDate: null,
    validUntil: null,
    subtotal: '100.00',
    taxTotal: '19.00',
    total: '119.00',
    discount: null,
    discountType: null,
    notes: null,
    paymentTerms: null,
    customerName: 'Test GmbH',
    customerStreet: null,
    customerHouseNumber: null,
    customerPostalCode: null,
    customerCity: null,
    customerCountry: null,
    customerVatId: null,
    convertedFromId: null,
    createdBy: TEST_USER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function documentWithDetailsFixture(overrides: Record<string, unknown> = {}) {
  return {
    ...documentFixture(overrides),
    company: null,
    contactPerson: null,
    items: [],
  }
}

function documentWithCompanyFixture() {
  return {
    ...documentFixture({ companyId: TEST_COMPANY_ID }),
    company: { id: TEST_COMPANY_ID, name: 'Test GmbH' },
    contactPerson: null,
    items: [],
  }
}

function documentItemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ITEM_ID,
    tenantId: TEST_TENANT_ID,
    documentId: TEST_DOC_ID,
    position: 0,
    productId: null,
    name: 'Test Position',
    description: null,
    quantity: '1',
    unit: 'Stück',
    unitPrice: '100.00',
    vatRate: '19',
    discount: null,
    discountType: null,
    lineTotal: '100.00',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('DocumentService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/document.service')
    return mod.DocumentService
  }

  // ---- generateNumber ----

  describe('generateNumber', () => {
    it('generates invoice number with RE prefix', async () => {
      dbMock.mockSelect.mockResolvedValue([{ count: 0 }])

      const service = await getService()
      const number = await service.generateNumber(TEST_TENANT_ID, 'invoice', 2026)

      expect(number).toBe('RE-2026-0001')
    })

    it('generates offer number with AN prefix', async () => {
      dbMock.mockSelect.mockResolvedValue([{ count: 0 }])

      const service = await getService()
      const number = await service.generateNumber(TEST_TENANT_ID, 'offer', 2026)

      expect(number).toBe('AN-2026-0001')
    })

    it('increments number when documents exist', async () => {
      dbMock.mockSelect.mockResolvedValue([{ count: 5 }])

      const service = await getService()
      const number = await service.generateNumber(TEST_TENANT_ID, 'invoice', 2026)

      expect(number).toBe('RE-2026-0006')
    })
  })

  // ---- create ----

  describe('create', () => {
    it('creates document with explicit number', async () => {
      const fixture = documentFixture({ number: 'RE-2026-0001' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        type: 'invoice',
        number: 'RE-2026-0001',
      }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('auto-generates number when not provided', async () => {
      const fixture = documentFixture()
      // generateNumber calls select, then insert
      dbMock.mockSelect.mockResolvedValue([{ count: 0 }])
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        type: 'invoice',
      })

      expect(result).toBeDefined()
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('snapshots company address when companyId provided without customerName', async () => {
      const companyData = {
        id: TEST_COMPANY_ID,
        name: 'Test GmbH',
        street: 'Teststraße',
        houseNumber: '42',
        postalCode: '12345',
        city: 'Berlin',
        country: 'DE',
        vatId: 'DE123456789',
      }
      const fixture = documentFixture({
        companyId: TEST_COMPANY_ID,
        customerName: 'Test GmbH',
        customerCity: 'Berlin',
      })

      // generateNumber select, then company lookup select, then insert
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])
      dbMock.mockSelect.mockResolvedValueOnce([companyData])
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        type: 'invoice',
        companyId: TEST_COMPANY_ID,
      })

      expect(result.customerName).toBe('Test GmbH')
    })

    it('sets status to draft by default', async () => {
      const fixture = documentFixture({ status: 'draft' })
      dbMock.mockSelect.mockResolvedValue([{ count: 0 }])
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        type: 'invoice',
      })

      expect(result.status).toBe('draft')
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns document with company and items when found', async () => {
      const rowFixture = documentWithCompanyFixture()
      const itemFixtures = [documentItemFixture()]

      dbMock.mockSelect.mockResolvedValueOnce([rowFixture])
      dbMock.mockSelect.mockResolvedValueOnce(itemFixtures)

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, TEST_DOC_ID)

      expect(result).toBeDefined()
      expect(result!.id).toBe(TEST_DOC_ID)
      expect(result!.company).toEqual({ id: TEST_COMPANY_ID, name: 'Test GmbH' })
      expect(result!.items).toHaveLength(1)
    })

    it('returns document with null company when no companyId', async () => {
      const rowFixture = {
        ...documentWithDetailsFixture(),
        company: { id: null, name: null },
      }
      dbMock.mockSelect.mockResolvedValueOnce([rowFixture])
      dbMock.mockSelect.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, TEST_DOC_ID)

      expect(result!.company).toBeNull()
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates draft document and returns it', async () => {
      const existingFixture = { status: 'draft' }
      const updatedFixture = documentFixture({ notes: 'Updated notes' })

      dbMock.mockSelect.mockResolvedValue([existingFixture])
      dbMock.mockUpdate.mockResolvedValue([updatedFixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_DOC_ID, {
        notes: 'Updated notes',
      })

      expect(result).toEqual(updatedFixture)
      expect(result!.notes).toBe('Updated notes')
    })

    it('throws error when document is not in draft status', async () => {
      dbMock.mockSelect.mockResolvedValue([{ status: 'sent' }])

      const service = await getService()

      await expect(
        service.update(TEST_TENANT_ID, TEST_DOC_ID, { notes: 'test' })
      ).rejects.toThrow('Entwurf')
    })

    it('returns null when document not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, 'nonexistent', { notes: 'test' })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when draft document deleted', async () => {
      dbMock.mockSelect.mockResolvedValue([{ status: 'draft' }])
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_DOC_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_DOC_ID)

      expect(result).toBe(true)
    })

    it('returns false when document not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBe(false)
    })

    it('throws error when trying to delete non-draft document', async () => {
      dbMock.mockSelect.mockResolvedValue([{ status: 'sent' }])

      const service = await getService()

      await expect(
        service.delete(TEST_TENANT_ID, TEST_DOC_ID)
      ).rejects.toThrow('Entwurf')
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [
        { ...documentWithDetailsFixture(), company: null, contactPerson: null },
        { ...documentWithDetailsFixture({ id: '00000000-0000-0000-0000-000000000033', number: 'RE-2026-0002' }), company: null, contactPerson: null },
      ]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 2 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
      expect(result.meta.totalPages).toBe(1)
    })

    it('uses default page=1 and limit=20', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 40 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID, { page: 2, limit: 10 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(4)
    })

    it('passes type filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { type: 'invoice' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes status filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { status: 'sent' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes search filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { search: 'RE-2026' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })
  })

  // ---- updateStatus ----

  describe('updateStatus', () => {
    it('transitions invoice from draft to sent', async () => {
      const existingFixture = { status: 'draft', type: 'invoice' }
      const updatedFixture = documentFixture({ status: 'sent' })

      dbMock.mockSelect.mockResolvedValue([existingFixture])
      dbMock.mockUpdate.mockResolvedValue([updatedFixture])

      const service = await getService()
      const result = await service.updateStatus(TEST_TENANT_ID, TEST_DOC_ID, 'sent')

      expect(result!.status).toBe('sent')
    })

    it('transitions invoice from sent to paid', async () => {
      const existingFixture = { status: 'sent', type: 'invoice' }
      const updatedFixture = documentFixture({ status: 'paid' })

      dbMock.mockSelect.mockResolvedValue([existingFixture])
      dbMock.mockUpdate.mockResolvedValue([updatedFixture])

      const service = await getService()
      const result = await service.updateStatus(TEST_TENANT_ID, TEST_DOC_ID, 'paid')

      expect(result!.status).toBe('paid')
    })

    it('throws error for invalid invoice transition', async () => {
      dbMock.mockSelect.mockResolvedValue([{ status: 'draft', type: 'invoice' }])

      const service = await getService()

      await expect(
        service.updateStatus(TEST_TENANT_ID, TEST_DOC_ID, 'paid')
      ).rejects.toThrow('nicht erlaubt')
    })

    it('transitions offer from draft to sent', async () => {
      const updatedFixture = documentFixture({ type: 'offer', status: 'sent' })
      dbMock.mockSelect.mockResolvedValue([{ status: 'draft', type: 'offer' }])
      dbMock.mockUpdate.mockResolvedValue([updatedFixture])

      const service = await getService()
      const result = await service.updateStatus(TEST_TENANT_ID, TEST_DOC_ID, 'sent')

      expect(result!.status).toBe('sent')
    })

    it('returns null when document not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.updateStatus(TEST_TENANT_ID, 'nonexistent', 'sent')

      expect(result).toBeNull()
    })
  })

  // ---- addItem ----

  describe('addItem', () => {
    it('adds item to document and returns it', async () => {
      const maxPosFixture = [{ max: -1 }]
      const itemFixture = documentItemFixture()

      // First select: get max position, second select (recalculate): items, third select: doc discount
      dbMock.mockSelect.mockResolvedValueOnce(maxPosFixture)
      dbMock.mockInsert.mockResolvedValueOnce([itemFixture])
      // recalculateTotals: items select, then doc select, then update
      dbMock.mockSelect.mockResolvedValueOnce([itemFixture])
      dbMock.mockSelect.mockResolvedValueOnce([{ discount: null, discountType: null }])
      dbMock.mockUpdate.mockResolvedValue([documentFixture()])

      const service = await getService()
      const result = await service.addItem(TEST_TENANT_ID, TEST_DOC_ID, {
        name: 'Test Position',
        quantity: 1,
        unitPrice: 100,
        vatRate: 19,
      })

      expect(result).toEqual(itemFixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })
  })

  // ---- removeItem ----

  describe('removeItem', () => {
    it('removes item and returns true', async () => {
      dbMock.mockDelete.mockResolvedValueOnce([{ id: TEST_ITEM_ID }])
      // recalculateTotals: items select, doc select, update
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ discount: null, discountType: null }])
      dbMock.mockUpdate.mockResolvedValue([documentFixture()])

      const service = await getService()
      const result = await service.removeItem(TEST_TENANT_ID, TEST_DOC_ID, TEST_ITEM_ID)

      expect(result).toBe(true)
    })

    it('returns false when item not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.removeItem(TEST_TENANT_ID, TEST_DOC_ID, 'nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- getItems ----

  describe('getItems', () => {
    it('returns items for a document', async () => {
      const items = [documentItemFixture(), documentItemFixture({ id: TEST_ITEM_ID + '1', position: 1 })]
      dbMock.mockSelect.mockResolvedValue(items)

      const service = await getService()
      const result = await service.getItems(TEST_TENANT_ID, TEST_DOC_ID)

      expect(result).toHaveLength(2)
    })

    it('returns empty array when no items', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getItems(TEST_TENANT_ID, TEST_DOC_ID)

      expect(result).toEqual([])
    })
  })
})
