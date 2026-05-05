import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

const FUTURE_DATE = new Date('2026-09-01T09:00:00Z')

describe('AppointmentService.bookForPortal', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('happy path: looks up linked person, delegates to book() with portal source and personIdOverride', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'person-1',
      firstName: 'Erika',
      lastName: 'Mustermann',
      email: 'erika@example.com',
      phone: '+49 30 123456',
      mobile: '+49 170 9999999',
      portalUserId: 'pu-1',
    }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')

    const fakeResult = {
      id: 'appt-1',
      status: 'confirmed',
      startAt: FUTURE_DATE,
      endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000),
    }
    const bookSpy = vi.spyOn(AppointmentService, 'book').mockResolvedValue(fakeResult)

    const result = await AppointmentService.bookForPortal({
      portalUserId: 'pu-1',
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      message: 'Hello',
    })

    expect(result).toEqual(fakeResult)
    expect(bookSpy).toHaveBeenCalledTimes(1)
    expect(bookSpy).toHaveBeenCalledWith({
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customerName: 'Erika Mustermann',
      customerEmail: 'erika@example.com',
      customerPhone: '+49 30 123456',
      customerMessage: 'Hello',
      source: 'portal',
      personIdOverride: 'person-1',
    })
  })

  it('throws person_not_linked when no person row matches portalUserId', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([])  // no person linked
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')

    await expect(
      AppointmentService.bookForPortal({
        portalUserId: 'pu-missing',
        userId: 'u-1',
        slotTypeId: 'st-1',
        startAtUtc: FUTURE_DATE,
      }),
    ).rejects.toThrow('person_not_linked')
  })

  it('throws person_missing_email when linked person has no email', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'person-2',
      firstName: 'Max',
      lastName: 'Nomail',
      email: null,
      phone: null,
      mobile: null,
      portalUserId: 'pu-2',
    }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')

    await expect(
      AppointmentService.bookForPortal({
        portalUserId: 'pu-2',
        userId: 'u-1',
        slotTypeId: 'st-1',
        startAtUtc: FUTURE_DATE,
      }),
    ).rejects.toThrow('person_missing_email')
  })
})
