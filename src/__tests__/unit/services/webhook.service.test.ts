import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const TEST_WEBHOOK_ID = '00000000-0000-0000-0000-000000000040'

function webhookFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_WEBHOOK_ID,
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    events: ['company.created', 'company.updated'],
    secret: null,
    isActive: true,
    failCount: 0,
    lastTriggeredAt: null,
    lastStatus: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('WebhookService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.stubGlobal('fetch', vi.fn())
  })

  async function getService() {
    const mod = await import('@/lib/services/webhook.service')
    return mod.WebhookService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a webhook and returns it', async () => {
      const fixture = webhookFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['company.created'],
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('defaults isActive to true', async () => {
      const fixture = webhookFixture({ isActive: true })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Webhook',
        url: 'https://example.com/wh',
        events: ['company.created'],
      })

      expect(result.isActive).toBe(true)
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns webhook when found', async () => {
      const fixture = webhookFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_WEBHOOK_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns webhook', async () => {
      const fixture = webhookFixture({ name: 'Updated Webhook' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_WEBHOOK_ID, { name: 'Updated Webhook' })

      expect(result).toEqual(fixture)
      expect(result!.name).toBe('Updated Webhook')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent', { name: 'X' })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_WEBHOOK_ID }])

      const service = await getService()
      const result = await service.delete(TEST_WEBHOOK_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete('nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [webhookFixture(), webhookFixture({ id: '00000000-0000-0000-0000-000000000041' })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50)
    })

    it('uses default page=1 and limit=50', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.list()

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50)
    })

    it('respects isActive filter', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ isActive: true })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })
  })

  // ---- getByEvent ----

  describe('getByEvent', () => {
    it('returns active webhooks matching the event', async () => {
      const matchingWebhook = webhookFixture({ events: ['company.created', 'company.updated'], isActive: true })
      const otherWebhook = webhookFixture({
        id: '00000000-0000-0000-0000-000000000042',
        events: ['person.created'],
        isActive: true,
      })

      dbMock.mockSelect.mockResolvedValue([matchingWebhook, otherWebhook])

      const service = await getService()
      const result = await service.getByEvent('company.created')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(TEST_WEBHOOK_ID)
    })

    it('returns empty array when no matching webhooks', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getByEvent('unknown.event')

      expect(result).toEqual([])
    })

    it('filters out webhooks that do not include the event', async () => {
      const webhook = webhookFixture({ events: ['person.created'] })
      dbMock.mockSelect.mockResolvedValue([webhook])

      const service = await getService()
      const result = await service.getByEvent('company.created')

      expect(result).toHaveLength(0)
    })
  })

  // ---- fire ----

  describe('fire', () => {
    it('sends HTTP POST to matching webhooks', async () => {
      const webhook = webhookFixture({ events: ['company.created'] })
      dbMock.mockSelect.mockResolvedValue([webhook])
      dbMock.mockUpdate.mockResolvedValue([webhook])

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })
      vi.stubGlobal('fetch', mockFetch)

      const service = await getService()
      await service.fire('company.created', { id: '123' })

      await new Promise((r) => setTimeout(r, 10))

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      )
    })

    it('does not call fetch when no matching webhooks', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)

      const service = await getService()
      await service.fire('nonexistent.event', {})

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ---- sendWebhook ----

  describe('sendWebhook', () => {
    it('sends POST with correct headers', async () => {
      const webhook = webhookFixture()
      dbMock.mockUpdate.mockResolvedValue([webhook])

      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', mockFetch)

      const service = await getService()
      await service.sendWebhook(webhook as never, 'company.created', { id: '123' })

      expect(mockFetch).toHaveBeenCalledWith(
        webhook.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'company.created',
          }),
        })
      )
    })

    it('adds HMAC signature header when secret is set', async () => {
      const webhook = webhookFixture({ secret: 'my-secret' })
      dbMock.mockUpdate.mockResolvedValue([webhook])

      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', mockFetch)

      const service = await getService()
      await service.sendWebhook(webhook as never, 'company.created', {})

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['X-Webhook-Signature']).toMatch(/^sha256=/)
    })

    it('updates db with lastStatus on success', async () => {
      const webhook = webhookFixture()
      dbMock.mockUpdate.mockResolvedValue([webhook])

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

      const service = await getService()
      await service.sendWebhook(webhook as never, 'company.created', {})

      expect(dbMock.db.update).toHaveBeenCalled()
    })

    it('updates failCount on fetch error and rethrows', async () => {
      const webhook = webhookFixture()
      dbMock.mockUpdate.mockResolvedValue([webhook])

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      const service = await getService()
      await expect(service.sendWebhook(webhook as never, 'company.created', {})).rejects.toThrow('Network error')

      expect(dbMock.db.update).toHaveBeenCalled()
    })
  })
})
