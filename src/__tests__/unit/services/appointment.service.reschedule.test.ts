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
    eventsPatch: vi.fn(),
  },
}))
vi.mock('@/lib/services/lead-match.service', () => ({
  LeadMatchService: { findOrCreate: vi.fn() },
}))
vi.mock('@/lib/services/appointment-mail.service', () => ({
  AppointmentMailService: {
    cancelPendingReminders: vi.fn(),
    queueReschedule: vi.fn(),
    queueReminders: vi.fn(),
  },
}))

const NEW_START = new Date('2026-09-15T10:00:00Z')
const NEW_END = new Date('2026-09-15T10:30:00Z')

const SLOT_TYPE = {
  id: 'st-1', userId: 'u-1', name: 'Erstgespräch', durationMinutes: 30,
  bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
  minNoticeHours: 0, maxAdvanceDays: 365,
  isActive: true,
}

function buildApptRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'a-1',
    userId: 'u-1',
    slotTypeId: 'st-1',
    startAt: new Date('2026-09-10T09:00:00Z'),
    endAt: new Date('2026-09-10T09:30:00Z'),
    status: 'confirmed',
    customerName: 'Anna',
    customerEmail: 'anna@example.com',
    customerPhone: '+491',
    customerMessage: null,
    cancelTokenHash: 'cancel-hash',
    rescheduleTokenHash: 'placeholder',  // overwritten by tests
    googleEventId: 'gevent-1',
    googleCalendarId: 'primary',
    leadId: null,
    personId: null,
    ...overrides,
  }
}

async function setupServicesForSuccess() {
  const { SlotTypeService } = await import('@/lib/services/slot-type.service')
  vi.mocked(SlotTypeService.getById).mockResolvedValueOnce(SLOT_TYPE as never)

  const { AvailabilityService } = await import('@/lib/services/availability.service')
  vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([])
  vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([])

  const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
  vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValue({
    id: 'acc-1', primaryCalendarId: 'primary',
  } as never)
  vi.mocked(CalendarAccountService.listWatchedCalendars).mockResolvedValue([
    { id: 'w1', googleCalendarId: 'primary', readForBusy: true } as never,
  ])
  vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')

  const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
  vi.mocked(CalendarGoogleClient.freeBusyQuery).mockResolvedValue({ busy: [] })
  vi.mocked(CalendarGoogleClient.eventsPatch).mockResolvedValue(undefined)

  const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
  vi.mocked(AppointmentMailService.cancelPendingReminders).mockResolvedValue(0)
  vi.mocked(AppointmentMailService.queueReschedule).mockResolvedValue(undefined)
  vi.mocked(AppointmentMailService.queueReminders).mockResolvedValue(undefined)
}

describe('AppointmentService.reschedule', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.APPOINTMENT_TOKEN_SECRET = 'a'.repeat(64)
  })

  it('valid token + free new slot: updates row, cancels reminders, queues reschedule mails + new reminders, patches Google event', async () => {
    const helper = setupDbMock()

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token, hash } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'reschedule',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    // 1st select: appt by id
    helper.selectMock.mockResolvedValueOnce([buildApptRow({ rescheduleTokenHash: hash })])
    // 2nd select: user timezone
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    // 3rd select: existing appointments in window (only the row we're rescheduling — must be filtered out)
    helper.selectMock.mockResolvedValueOnce([
      { id: 'a-1', startAt: new Date('2026-09-10T09:00:00Z'), endAt: new Date('2026-09-10T09:30:00Z') },
    ])
    // 4th select: external_busy in window
    helper.selectMock.mockResolvedValueOnce([])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    await setupServicesForSuccess()

    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([NEW_START])

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const result = await AppointmentService.reschedule({ token, newStartAtUtc: NEW_START })

    expect(result.startAt.getTime()).toBe(NEW_START.getTime())
    expect(result.endAt.getTime()).toBe(NEW_END.getTime())

    expect(helper.db.update).toHaveBeenCalledTimes(1)

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    expect(AppointmentMailService.cancelPendingReminders).toHaveBeenCalledWith('a-1')
    expect(AppointmentMailService.queueReschedule).toHaveBeenCalledWith('a-1')
    expect(AppointmentMailService.queueReminders).toHaveBeenCalledWith('a-1')

    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    expect(CalendarGoogleClient.eventsPatch).toHaveBeenCalledWith({
      accessToken: 'AT',
      calendarId: 'primary',
      eventId: 'gevent-1',
      startUtc: NEW_START,
      endUtc: NEW_END,
      timeZone: 'Europe/Berlin',
      sendUpdates: 'all',
    })
  })

  it('new slot conflicts with another appointment: throws SlotNoLongerAvailableError, no DB update', async () => {
    const helper = setupDbMock()

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token, hash } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'reschedule',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    helper.selectMock.mockResolvedValueOnce([buildApptRow({ rescheduleTokenHash: hash })])
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])  // no other existing appts
    helper.selectMock.mockResolvedValueOnce([])  // external_busy in window
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    await setupServicesForSuccess()

    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([])  // no free slots → conflict

    const { AppointmentService, SlotNoLongerAvailableError } = await import('@/lib/services/appointment.service')
    await expect(AppointmentService.reschedule({ token, newStartAtUtc: NEW_START }))
      .rejects.toBeInstanceOf(SlotNoLongerAvailableError)

    expect(helper.db.update).not.toHaveBeenCalled()
  })

  it('expired token throws AppointmentTokenError(expired)', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'reschedule',
      expiresAt: new Date(Date.now() - 1000),
    })

    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    try {
      await AppointmentService.reschedule({ token, newStartAtUtc: NEW_START })
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AppointmentTokenError)
      expect((err as InstanceType<typeof AppointmentTokenError>).reason).toBe('expired')
    }
  })

  it('cancel-purpose token throws AppointmentTokenError(wrong_purpose)', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    try {
      await AppointmentService.reschedule({ token, newStartAtUtc: NEW_START })
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AppointmentTokenError)
      expect((err as InstanceType<typeof AppointmentTokenError>).reason).toBe('wrong_purpose')
    }
  })

  it('already-cancelled appointment throws AppointmentTokenError(invalid)', async () => {
    const helper = setupDbMock()

    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    const { token, hash } = generateAppointmentToken({
      appointmentId: 'a-1',
      purpose: 'reschedule',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    helper.selectMock.mockResolvedValueOnce([buildApptRow({
      rescheduleTokenHash: hash,
      status: 'cancelled',
    })])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    try {
      await AppointmentService.reschedule({ token, newStartAtUtc: NEW_START })
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(AppointmentTokenError)
      expect((err as InstanceType<typeof AppointmentTokenError>).reason).toBe('invalid')
    }
    expect(helper.db.update).not.toHaveBeenCalled()
  })
})
