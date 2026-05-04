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
  },
}))
vi.mock('@/lib/services/lead-match.service', () => ({
  LeadMatchService: { findOrCreate: vi.fn() },
}))

const FUTURE_DATE = new Date('2026-09-01T09:00:00Z')

describe('AppointmentService.book', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('happy path: books, creates Google event, returns confirmed appointment', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])  // user timezone
    helper.selectMock.mockResolvedValueOnce([])  // existing appointments in window
    helper.selectMock.mockResolvedValueOnce([])  // external_busy in window
    helper.insertMock.mockResolvedValueOnce([{
      id: 'appt-1', status: 'pending',
      startAt: FUTURE_DATE, endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000),
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({
      id: 'st-1', userId: 'u-1', name: 'Erstgespräch', durationMinutes: 30,
      bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
      minNoticeHours: 0, maxAdvanceDays: 365,
      isActive: true,
    } as never)

    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([])
    vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([])

    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([FUTURE_DATE])

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
    vi.mocked(CalendarGoogleClient.eventsInsert).mockResolvedValue({ id: 'gevent-1', htmlLink: '' })

    const { LeadMatchService } = await import('@/lib/services/lead-match.service')
    vi.mocked(LeadMatchService.findOrCreate).mockResolvedValue({ leadId: 'l-1', personId: 'p-1' })

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const out = await AppointmentService.book({
      userId: 'u-1', slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customerName: 'Anna', customerEmail: 'anna@example.com', customerPhone: '+491',
      customerMessage: null, source: 'public',
    })

    expect(out.id).toBe('appt-1')
    expect(out.status).toBe('confirmed')
    expect(LeadMatchService.findOrCreate).toHaveBeenCalled()
    expect(CalendarGoogleClient.eventsInsert).toHaveBeenCalled()
  })

  it('throws SlotNoLongerAvailable when local recheck fails', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])
    helper.selectMock.mockResolvedValueOnce([])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({
      id: 'st-1', userId: 'u-1', durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
      minNoticeHours: 0, maxAdvanceDays: 365, isActive: true, name: 'X',
    } as never)
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([])
    vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([])
    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([])  // no slots — startAt not in result

    const { AppointmentService, SlotNoLongerAvailableError } = await import('@/lib/services/appointment.service')
    await expect(AppointmentService.book({
      userId: 'u-1', slotTypeId: 'st-1', startAtUtc: FUTURE_DATE,
      customerName: 'X', customerEmail: 'x@y', customerPhone: '0',
      customerMessage: null, source: 'public',
    })).rejects.toBeInstanceOf(SlotNoLongerAvailableError)
  })

  it('throws SlotNoLongerAvailable when Google FreeBusy reports overlap', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])
    helper.selectMock.mockResolvedValueOnce([])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({
      id: 'st-1', userId: 'u-1', durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
      minNoticeHours: 0, maxAdvanceDays: 365, isActive: true, name: 'X',
    } as never)
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([])
    vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([])
    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([FUTURE_DATE])
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValue({ id: 'acc-1', primaryCalendarId: 'primary' } as never)
    vi.mocked(CalendarAccountService.listWatchedCalendars).mockResolvedValue([
      { id: 'w1', googleCalendarId: 'primary', readForBusy: true } as never,
    ])
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.freeBusyQuery).mockResolvedValue({
      busy: [{ calendarId: 'primary', start: FUTURE_DATE, end: new Date(FUTURE_DATE.getTime() + 60 * 60_000) }],
    })

    const { AppointmentService, SlotNoLongerAvailableError } = await import('@/lib/services/appointment.service')
    await expect(AppointmentService.book({
      userId: 'u-1', slotTypeId: 'st-1', startAtUtc: FUTURE_DATE,
      customerName: 'X', customerEmail: 'x@y', customerPhone: '0',
      customerMessage: null, source: 'public',
    })).rejects.toBeInstanceOf(SlotNoLongerAvailableError)
  })

  it('proceeds (fail-open) when Google FreeBusy errors', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])
    helper.selectMock.mockResolvedValueOnce([])
    helper.insertMock.mockResolvedValueOnce([{ id: 'a-1', startAt: FUTURE_DATE, endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000) }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({
      id: 'st-1', userId: 'u-1', durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
      minNoticeHours: 0, maxAdvanceDays: 365, isActive: true, name: 'X',
    } as never)
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([])
    vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([])
    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([FUTURE_DATE])
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValue({ id: 'acc-1', primaryCalendarId: 'primary' } as never)
    vi.mocked(CalendarAccountService.listWatchedCalendars).mockResolvedValue([
      { id: 'w1', googleCalendarId: 'primary', readForBusy: true } as never,
    ])
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.freeBusyQuery).mockRejectedValue(new Error('Google down'))
    vi.mocked(CalendarGoogleClient.eventsInsert).mockResolvedValue({ id: 'g-1', htmlLink: '' })
    const { LeadMatchService } = await import('@/lib/services/lead-match.service')
    vi.mocked(LeadMatchService.findOrCreate).mockResolvedValue({ leadId: 'l', personId: 'p' })

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const out = await AppointmentService.book({
      userId: 'u-1', slotTypeId: 'st-1', startAtUtc: FUTURE_DATE,
      customerName: 'X', customerEmail: 'x@y.de', customerPhone: '0',
      customerMessage: null, source: 'public',
    })
    expect(out.id).toBe('a-1')
  })

  it('marks confirmed with sync_error when Google events.insert fails', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])
    helper.selectMock.mockResolvedValueOnce([])
    helper.insertMock.mockResolvedValueOnce([{ id: 'a-1', startAt: FUTURE_DATE, endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000) }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { SlotTypeService } = await import('@/lib/services/slot-type.service')
    vi.mocked(SlotTypeService.getById).mockResolvedValueOnce({
      id: 'st-1', userId: 'u-1', durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
      minNoticeHours: 0, maxAdvanceDays: 365, isActive: true, name: 'X',
    } as never)
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([])
    vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([])
    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([FUTURE_DATE])
    const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
    vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValue({ id: 'acc-1', primaryCalendarId: 'primary' } as never)
    vi.mocked(CalendarAccountService.listWatchedCalendars).mockResolvedValue([])  // no watched → no FreeBusy
    vi.mocked(CalendarAccountService.getValidAccessToken).mockResolvedValue('AT')
    const { CalendarGoogleClient } = await import('@/lib/services/calendar-google.client')
    vi.mocked(CalendarGoogleClient.eventsInsert).mockRejectedValue(new Error('Google 400'))
    const { LeadMatchService } = await import('@/lib/services/lead-match.service')
    vi.mocked(LeadMatchService.findOrCreate).mockResolvedValue({ leadId: 'l', personId: 'p' })

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const out = await AppointmentService.book({
      userId: 'u-1', slotTypeId: 'st-1', startAtUtc: FUTURE_DATE,
      customerName: 'X', customerEmail: 'x@y.de', customerPhone: '0',
      customerMessage: null, source: 'public',
    })
    expect(out.id).toBe('a-1')
    expect(out.status).toBe('confirmed')
  })
})
