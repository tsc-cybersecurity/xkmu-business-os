import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/appointment.service', () => ({
  AppointmentService: {
    book: vi.fn(),
    bookManual: vi.fn(),
    cancel: vi.fn(),
  },
  SlotNoLongerAvailableError: class extends Error {
    constructor(message?: string) { super(message); this.name = 'SlotNoLongerAvailableError' }
  },
  AppointmentTokenError: class extends Error {
    constructor(public reason: 'expired' | 'invalid' | 'revoked' | 'wrong_purpose', message?: string) {
      super(message ?? reason)
      this.name = 'AppointmentTokenError'
    }
  },
}))

vi.mock('@/lib/services/audit-log.service', () => ({
  AuditLogService: { log: vi.fn() },
}))

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) =>
    fn({ userId: 'u-1', role: 'owner', roleId: null, apiKeyPermissions: null }),
  ),
}))

const VALID_SLOT_TYPE_ID = 'a0000000-0000-4000-8000-000000000001'
const VALID_USER_ID = 'a0000000-0000-4000-8000-0000000000aa'
const VALID_TOKEN = 'a'.repeat(40)

describe('Audit-log: appointment routes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('public booking → audit-log with userRole=customer, source=public', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'u-1', bookingPageActive: true }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const startAt = new Date('2026-09-01T09:00:00.000Z')
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.book).mockResolvedValueOnce({
      id: 'appt-1', status: 'confirmed', startAt, endAt: new Date('2026-09-01T09:30:00.000Z'),
    } as never)

    const { AuditLogService } = await import('@/lib/services/audit-log.service')

    const body = {
      slotTypeId: VALID_SLOT_TYPE_ID,
      startAt: startAt.toISOString(),
      customerName: 'Anna Schmidt',
      customerEmail: 'anna@example.com',
      customerPhone: '+491234',
      customerMessage: null,
      consentDsgvo: true,
    }
    const req = new Request('https://x/api/buchen/tino/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify(body),
    })

    const { POST } = await import('@/app/api/buchen/[slug]/book/route')
    const res = await POST(req as never, { params: Promise.resolve({ slug: 'tino' }) } as never)
    expect(res.status).toBe(200)

    expect(AuditLogService.log).toHaveBeenCalledTimes(1)
    expect(AuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        userRole: 'customer',
        action: 'appointment.create',
        entityType: 'appointment',
        entityId: 'appt-1',
        payload: expect.objectContaining({
          source: 'public',
          slotTypeId: VALID_SLOT_TYPE_ID,
          startAt: startAt.toISOString(),
          customerEmail: 'anna@example.com',
        }),
      }),
    )
  })

  it('manual booking via /api/v1/appointments → audit-log with userRole=staff, userId=u-1', async () => {
    const startAt = new Date('2026-09-01T09:00:00.000Z')
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.bookManual).mockResolvedValueOnce({
      id: 'appt-2', status: 'confirmed', startAt, endAt: new Date('2026-09-01T09:30:00.000Z'),
    } as never)

    const { AuditLogService } = await import('@/lib/services/audit-log.service')

    const body = {
      userId: VALID_USER_ID,
      slotTypeId: VALID_SLOT_TYPE_ID,
      startAtUtc: startAt.toISOString(),
      customerName: 'Anna',
      customerEmail: 'anna@example.com',
      customerPhone: '+491234',
      customerMessage: null,
    }
    const req = new Request('https://x/api/v1/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const { POST } = await import('@/app/api/v1/appointments/route')
    const res = await POST(req as never)
    expect(res.status).toBe(201)

    expect(AuditLogService.log).toHaveBeenCalledTimes(1)
    expect(AuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-1',
        userRole: 'staff',
        action: 'appointment.create',
        entityType: 'appointment',
        entityId: 'appt-2',
        payload: expect.objectContaining({
          source: 'manual',
          slotTypeId: VALID_SLOT_TYPE_ID,
          startAt: startAt.toISOString(),
          customerEmail: 'anna@example.com',
        }),
      }),
    )
  })

  it('public cancel via token → audit-log with userRole=customer, action=appointment.cancel', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockResolvedValueOnce({
      alreadyCancelled: false,
      appointmentId: 'appt-3',
    })

    const { AuditLogService } = await import('@/lib/services/audit-log.service')

    const req = new Request('https://x/api/buchen/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '5.6.7.8' },
      body: JSON.stringify({ token: VALID_TOKEN, reason: 'no longer needed' }),
    })

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(req as never)
    expect(res.status).toBe(200)

    expect(AuditLogService.log).toHaveBeenCalledTimes(1)
    expect(AuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        userRole: 'customer',
        action: 'appointment.cancel',
        entityType: 'appointment',
        entityId: 'appt-3',
        payload: expect.objectContaining({
          cancelledBy: 'customer',
          reason: 'no longer needed',
          alreadyCancelled: false,
        }),
      }),
    )
  })
})
