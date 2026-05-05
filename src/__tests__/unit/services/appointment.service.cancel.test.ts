import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/slot-type.service', () => ({
  SlotTypeService: { getById: vi.fn() },
}))
vi.mock('@/lib/services/availability.service', () => ({
  AvailabilityService: { listRules: vi.fn(), listOverrides: vi.fn() },
}))
vi.mock('@/lib/services/availability-calc.service', () => ({
  AvailabilityCalcService: { computeFreeSlots: vi.fn() },
}))
vi.mock('@/lib/services/calendar-account.service', () => ({
  CalendarAccountService: {
    getActiveAccount: vi.fn(),
    listWatchedCalendars: vi.fn(),
    getValidAccessToken: vi.fn(),
  },
}))
vi.mock('@/lib/services/calendar-google.client', () => ({
  CalendarGoogleClient: {
    freeBusyQuery: vi.fn(),
    eventsInsert: vi.fn(),
    eventsDelete: vi.fn(),
  },
}))
vi.mock('@/lib/services/lead-match.service', () => ({
  LeadMatchService: { findOrCreate: vi.fn() },
}))
vi.mock('@/lib/services/appointment-mail.service', () => ({
  AppointmentMailService: {
    cancelPendingReminders: vi.fn(),
    queueCancellation: vi.fn(),
  },
}))

describe('AppointmentService.cancel', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.APPOINTMENT_TOKEN_SECRET = 'a'.repeat(64)
  })

  it('valid token + confirmed appt: cancels, queues mails, deletes Google event', async () => {
    const helper = setupDbMock()

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token, hash } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1',
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      endAt: new Date(Date.now() + 90 * 60 * 1000),
      status: 'confirmed',
      customerEmail: 'anna@example.com',
      customerName: 'Anna',
      customerPhone: '+491',
      customerMessage: null,
      cancelTokenHash: hash,
      rescheduleTokenHash: 'other-hash',
      googleEventId: 'gevent-1',
      googleCalendarId: 'primary',
      leadId: null,
      personId: null,
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValue({
      id: 'acc-1', primaryCalendarId: 'primary',
    } as never)
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')

    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsDelete).mockResolvedValue(undefined)

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    vi.mocked(AppointmentMailService.cancelPendingReminders).mockResolvedValue(0)
    vi.mocked(AppointmentMailService.queueCancellation).mockResolvedValue(undefined)

    // Capture .set() args from db.update(...).set(payload)
    const updatePayloads: unknown[] = []
    const originalUpdate = helper.db.update
    helper.db.update = vi.fn().mockImplementation((...args: unknown[]) => {
      const chain = (originalUpdate as unknown as (...a: unknown[]) => Record<string, unknown>)(...args)
      const originalSet = chain.set as (...a: unknown[]) => unknown
      chain.set = vi.fn().mockImplementation((payload: unknown) => {
        updatePayloads.push(payload)
        return (originalSet as (...a: unknown[]) => unknown)(payload)
      })
      return chain
    }) as unknown as typeof helper.db.update

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const result = await AppointmentService.cancel({ token })

    expect(result.alreadyCancelled).toBe(false)
    expect(helper.db.update).toHaveBeenCalledTimes(1)
    const setPayload = updatePayloads[0] as Record<string, unknown>
    expect(setPayload.status).toBe('cancelled')
    expect(setPayload.cancelTokenHash).toBeNull()
    expect(setPayload.rescheduleTokenHash).toBeNull()
    expect(setPayload.cancelledAt).toBeInstanceOf(Date)
    expect(setPayload.cancelledBy).toBe('customer')

    expect(AppointmentMailService.cancelPendingReminders).toHaveBeenCalledWith('a-1')
    expect(AppointmentMailService.queueCancellation).toHaveBeenCalledWith('a-1')
    expect(CalendarGoogleClient.eventsDelete).toHaveBeenCalledWith({
      accessToken: 'AT',
      calendarId: 'primary',
      eventId: 'gevent-1',
      sendUpdates: 'none',
    })
  })

  it('expired token throws AppointmentTokenError(expired)', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() - 1000),
    })

    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    try {
      await AppointmentService.cancel({ token })
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AppointmentTokenError)
      expect((err as InstanceType<typeof AppointmentTokenError>).reason).toBe('expired')
    }
  })

  it('bad signature throws AppointmentTokenError(invalid)', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    try {
      await AppointmentService.cancel({ token: 'garbage.payload' })
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AppointmentTokenError)
      expect((err as InstanceType<typeof AppointmentTokenError>).reason).toBe('invalid')
    }
  })

  it('token hash mismatch with DB throws AppointmentTokenError(revoked)', async () => {
    const helper = setupDbMock()

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1',
      userId: 'u-1',
      status: 'confirmed',
      customerEmail: 'x@y',
      cancelTokenHash: 'completely-different-hash',
      rescheduleTokenHash: null,
      googleEventId: null,
      googleCalendarId: null,
    }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    try {
      await AppointmentService.cancel({ token })
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AppointmentTokenError)
      expect((err as InstanceType<typeof AppointmentTokenError>).reason).toBe('revoked')
    }
  })

  it('already-cancelled appt returns {alreadyCancelled:true} without side effects', async () => {
    const helper = setupDbMock()

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token, hash } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1',
      userId: 'u-1',
      status: 'cancelled',
      customerEmail: 'x@y',
      cancelTokenHash: hash,
      rescheduleTokenHash: null,
      googleEventId: 'g-1',
      googleCalendarId: 'primary',
    }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const result = await AppointmentService.cancel({ token })

    expect(result.alreadyCancelled).toBe(true)
    expect(helper.db.update).not.toHaveBeenCalled()
    expect(AppointmentMailService.cancelPendingReminders).not.toHaveBeenCalled()
    expect(AppointmentMailService.queueCancellation).not.toHaveBeenCalled()
    expect(CalendarGoogleClient.eventsDelete).not.toHaveBeenCalled()
  })

  it('reschedule-purpose token throws AppointmentTokenError(wrong_purpose)', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'reschedule',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    try {
      await AppointmentService.cancel({ token })
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AppointmentTokenError)
      expect((err as InstanceType<typeof AppointmentTokenError>).reason).toBe('wrong_purpose')
    }
  })
})
