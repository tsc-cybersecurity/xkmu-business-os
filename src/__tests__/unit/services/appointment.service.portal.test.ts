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
    helper.selectMock.mockResolvedValueOnce([{ bookingPageActive: true }])
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

  it('throws staff_not_bookable when target user has booking_page_active=false', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'person-1', firstName: 'Erika', lastName: 'Mustermann',
      email: 'erika@example.com', phone: null, mobile: null, portalUserId: 'pu-1',
    }])
    helper.selectMock.mockResolvedValueOnce([{ bookingPageActive: false }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')

    await expect(
      AppointmentService.bookForPortal({
        portalUserId: 'pu-1',
        userId: 'u-disabled',
        slotTypeId: 'st-1',
        startAtUtc: FUTURE_DATE,
      }),
    ).rejects.toThrow('staff_not_bookable')
  })
})

// ---------------------------------------------------------------------------
// cancelByOwner / rescheduleByOwner — auth-based variants for portal users
// ---------------------------------------------------------------------------

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
    queueCancellation: vi.fn(),
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
    rescheduleTokenHash: 'reschedule-hash',
    googleEventId: 'gevent-1',
    googleCalendarId: 'primary',
    leadId: null,
    personId: 'person-1',
    ...overrides,
  }
}

describe('AppointmentService.cancelByOwner', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('happy path: owner matches → mutation called, returns alreadyCancelled:false', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([buildApptRow()])
    helper.selectMock.mockResolvedValueOnce([{ portalUserId: 'pu-1' }])
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

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const result = await AppointmentService.cancelByOwner({
      appointmentId: 'a-1',
      portalUserId: 'pu-1',
      reason: 'Conflict',
    })

    expect(result.alreadyCancelled).toBe(false)
    expect(helper.db.update).toHaveBeenCalledTimes(1)
    expect(AppointmentMailService.cancelPendingReminders).toHaveBeenCalledWith('a-1')
    expect(AppointmentMailService.queueCancellation).toHaveBeenCalledWith('a-1')
    expect(CalendarGoogleClient.eventsDelete).toHaveBeenCalled()
  })

  it('appt.personId is null → throws not_owned', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([buildApptRow({ personId: null })])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    await expect(
      AppointmentService.cancelByOwner({ appointmentId: 'a-1', portalUserId: 'pu-1' }),
    ).rejects.toThrow('not_owned')

    expect(helper.db.update).not.toHaveBeenCalled()
  })

  it('person belongs to a different portal user → throws not_owned', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([buildApptRow()])
    helper.selectMock.mockResolvedValueOnce([{ portalUserId: 'pu-OTHER' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    await expect(
      AppointmentService.cancelByOwner({ appointmentId: 'a-1', portalUserId: 'pu-1' }),
    ).rejects.toThrow('not_owned')

    expect(helper.db.update).not.toHaveBeenCalled()
  })

  it('already-cancelled → returns alreadyCancelled:true, no mutation', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([buildApptRow({ status: 'cancelled' })])
    helper.selectMock.mockResolvedValueOnce([{ portalUserId: 'pu-1' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const result = await AppointmentService.cancelByOwner({
      appointmentId: 'a-1',
      portalUserId: 'pu-1',
    })

    expect(result.alreadyCancelled).toBe(true)
    expect(helper.db.update).not.toHaveBeenCalled()
    expect(AppointmentMailService.cancelPendingReminders).not.toHaveBeenCalled()
    expect(AppointmentMailService.queueCancellation).not.toHaveBeenCalled()
    expect(CalendarGoogleClient.eventsDelete).not.toHaveBeenCalled()
  })
})

async function setupServicesForRescheduleSuccess() {
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

describe('AppointmentService.rescheduleByOwner', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('happy path: valid owner + free slot → returns new times, mutation called', async () => {
    const helper = setupDbMock()
    // 1. select appt
    helper.selectMock.mockResolvedValueOnce([buildApptRow()])
    // 2. select person.portalUserId
    helper.selectMock.mockResolvedValueOnce([{ portalUserId: 'pu-1' }])
    // 3. select user timezone (in _validateNewSlot)
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    // 4. select existing appts
    helper.selectMock.mockResolvedValueOnce([
      { id: 'a-1', startAt: new Date('2026-09-10T09:00:00Z'), endAt: new Date('2026-09-10T09:30:00Z') },
    ])
    // 5. select external_busy
    helper.selectMock.mockResolvedValueOnce([])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    await setupServicesForRescheduleSuccess()

    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([NEW_START])

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const result = await AppointmentService.rescheduleByOwner({
      appointmentId: 'a-1',
      portalUserId: 'pu-1',
      newStartAtUtc: NEW_START,
    })

    expect(result.startAt.getTime()).toBe(NEW_START.getTime())
    expect(result.endAt.getTime()).toBe(NEW_END.getTime())
    expect(helper.db.update).toHaveBeenCalledTimes(1)

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    expect(AppointmentMailService.cancelPendingReminders).toHaveBeenCalledWith('a-1')
    expect(AppointmentMailService.queueReschedule).toHaveBeenCalledWith('a-1')
    expect(AppointmentMailService.queueReminders).toHaveBeenCalledWith('a-1')
  })

  it('wrong owner → throws not_owned, no mutation', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([buildApptRow()])
    helper.selectMock.mockResolvedValueOnce([{ portalUserId: 'pu-OTHER' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    await expect(
      AppointmentService.rescheduleByOwner({
        appointmentId: 'a-1',
        portalUserId: 'pu-1',
        newStartAtUtc: NEW_START,
      }),
    ).rejects.toThrow('not_owned')

    expect(helper.db.update).not.toHaveBeenCalled()
  })

  it('cancelled appt → throws appointment_cancelled, no mutation', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([buildApptRow({ status: 'cancelled' })])
    helper.selectMock.mockResolvedValueOnce([{ portalUserId: 'pu-1' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    await expect(
      AppointmentService.rescheduleByOwner({
        appointmentId: 'a-1',
        portalUserId: 'pu-1',
        newStartAtUtc: NEW_START,
      }),
    ).rejects.toThrow('appointment_cancelled')

    expect(helper.db.update).not.toHaveBeenCalled()
  })

  it('slot conflict → throws SlotNoLongerAvailableError, no mutation', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([buildApptRow()])
    helper.selectMock.mockResolvedValueOnce([{ portalUserId: 'pu-1' }])
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])  // no other existing appts
    helper.selectMock.mockResolvedValueOnce([])  // external_busy
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    await setupServicesForRescheduleSuccess()

    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([])  // no free slots → conflict

    const { AppointmentService, SlotNoLongerAvailableError } = await import('@/lib/services/appointment.service')
    await expect(
      AppointmentService.rescheduleByOwner({
        appointmentId: 'a-1',
        portalUserId: 'pu-1',
        newStartAtUtc: NEW_START,
      }),
    ).rejects.toBeInstanceOf(SlotNoLongerAvailableError)

    expect(helper.db.update).not.toHaveBeenCalled()
  })
})
