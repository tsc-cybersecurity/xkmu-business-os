import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

// ---------------------------------------------------------------------------
// AppointmentService.bookManual — staff-initiated backend booking
// ---------------------------------------------------------------------------
//
// Two layers of tests:
//   1. Thin delegation layer: bookManual() forwards to book() with the right
//      shape (source='manual', personIdOverride, suppressCustomerMail).
//   2. Mail-queueing behaviour inside book() when bookManual is the caller —
//      verified by exercising the full book() path with all dependencies
//      mocked, then checking which AppointmentMailService methods were called.
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
  },
}))
vi.mock('@/lib/services/lead-match.service', () => ({
  LeadMatchService: { findOrCreate: vi.fn() },
}))
vi.mock('@/lib/services/appointment-mail.service', () => ({
  AppointmentMailService: {
    queueConfirmation: vi.fn(),
    queueReminders: vi.fn(),
  },
}))

const FUTURE_DATE = new Date('2026-09-01T09:00:00Z')

const SLOT_TYPE = {
  id: 'st-1',
  userId: 'u-1',
  name: 'Erstgespräch',
  durationMinutes: 30,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  minNoticeHours: 0,
  maxAdvanceDays: 365,
  isActive: true,
}

/**
 * Wires up the standard happy-path mocks for an end-to-end book() call:
 * timezone lookup, empty availability window, free-slot calc returns the
 * requested start, no Google account, mail service is mocked and resolves.
 *
 * Caller must still queue: helper.insertMock.mockResolvedValueOnce([...]).
 */
async function setupBookHappyPath(): Promise<void> {
  const { SlotTypeService } = await import('@/lib/services/slot-type.service')
  vi.mocked(SlotTypeService.getById).mockResolvedValueOnce(SLOT_TYPE as never)

  const { AvailabilityService } = await import('@/lib/services/availability.service')
  vi.mocked(AvailabilityService.listRules).mockResolvedValueOnce([])
  vi.mocked(AvailabilityService.listOverrides).mockResolvedValueOnce([])

  const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
  vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([FUTURE_DATE])

  const { CalendarAccountService } = await import('@/lib/services/calendar-account.service')
  // No Google account → book() skips both FreeBusy and eventsInsert.
  vi.mocked(CalendarAccountService.getActiveAccount).mockResolvedValue(null as never)

  const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
  vi.mocked(AppointmentMailService.queueConfirmation).mockResolvedValue(undefined)
  vi.mocked(AppointmentMailService.queueReminders).mockResolvedValue(undefined)
}

describe('AppointmentService.bookManual — delegation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('delegates to book() with source="manual", personIdOverride, and suppressCustomerMail', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')

    const fakeResult = {
      id: 'appt-1',
      status: 'confirmed',
      startAt: FUTURE_DATE,
      endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000),
    }
    const bookSpy = vi.spyOn(AppointmentService, 'book').mockResolvedValue(fakeResult)

    const result = await AppointmentService.bookManual({
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customer: {
        name: 'Anna Mustermann',
        email: 'anna@example.com',
        phone: '+49 30 123456',
        message: 'Manual booking note',
      },
      personId: 'person-42',
      suppressCustomerMail: true,
    })

    expect(result).toEqual(fakeResult)
    expect(bookSpy).toHaveBeenCalledTimes(1)
    expect(bookSpy).toHaveBeenCalledWith({
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customerName: 'Anna Mustermann',
      customerEmail: 'anna@example.com',
      customerPhone: '+49 30 123456',
      customerMessage: 'Manual booking note',
      source: 'manual',
      personIdOverride: 'person-42',
      suppressCustomerMail: true,
      leadSource: 'manual_booking',
    })
  })

  it('defaults customerMessage to null and propagates undefined personId/suppress flags', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const bookSpy = vi.spyOn(AppointmentService, 'book').mockResolvedValue({
      id: 'a', status: 'confirmed', startAt: FUTURE_DATE, endAt: FUTURE_DATE,
    })

    await AppointmentService.bookManual({
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customer: {
        name: 'Bob',
        email: 'bob@example.com',
        phone: '+1 555',
      },
    })

    expect(bookSpy).toHaveBeenCalledWith(expect.objectContaining({
      source: 'manual',
      customerMessage: null,
      personIdOverride: undefined,
      suppressCustomerMail: undefined,
    }))
  })
})

describe('AppointmentService.bookManual — mail queueing behaviour', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('happy path: source=manual, queueConfirmation called without skipCustomer, queueReminders called', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])  // user timezone
    helper.selectMock.mockResolvedValueOnce([])  // existing appts
    // No external_busy select because no account.
    const insertedRows: Array<Record<string, unknown>> = []
    const originalInsert = helper.db.insert
    helper.db.insert = vi.fn().mockImplementation((...args: unknown[]) => {
      const chain = (originalInsert as unknown as (...a: unknown[]) => Record<string, unknown>)(...args)
      const originalValues = chain.values as (...a: unknown[]) => unknown
      chain.values = vi.fn().mockImplementation((payload: unknown) => {
        insertedRows.push(payload as Record<string, unknown>)
        return (originalValues as (...a: unknown[]) => unknown)(payload)
      })
      return chain
    }) as unknown as typeof helper.db.insert
    helper.insertMock.mockResolvedValueOnce([{
      id: 'appt-manual-1',
      status: 'pending',
      startAt: FUTURE_DATE,
      endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000),
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    await setupBookHappyPath()

    const { LeadMatchService } = await import('@/lib/services/lead-match.service')
    vi.mocked(LeadMatchService.findOrCreate).mockResolvedValue({ leadId: 'l-1', personId: 'p-1' })

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const out = await AppointmentService.bookManual({
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customer: {
        name: 'Anna',
        email: 'anna@example.com',
        phone: '+491',
      },
    })

    expect(out.id).toBe('appt-manual-1')
    expect(out.status).toBe('confirmed')

    // Verify the appointments INSERT got source='manual'
    const apptInsert = insertedRows.find(r => 'source' in r) as Record<string, unknown> | undefined
    expect(apptInsert).toBeDefined()
    expect(apptInsert!.source).toBe('manual')

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    expect(AppointmentMailService.queueConfirmation).toHaveBeenCalledTimes(1)
    expect(AppointmentMailService.queueConfirmation).toHaveBeenCalledWith('appt-manual-1', { skipCustomer: undefined })
    expect(AppointmentMailService.queueReminders).toHaveBeenCalledTimes(1)
    expect(AppointmentMailService.queueReminders).toHaveBeenCalledWith('appt-manual-1')
  })

  it('suppressCustomerMail=true: queueConfirmation called with skipCustomer:true, queueReminders NOT called', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])
    helper.insertMock.mockResolvedValueOnce([{
      id: 'appt-manual-2',
      status: 'pending',
      startAt: FUTURE_DATE,
      endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000),
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    await setupBookHappyPath()

    const { LeadMatchService } = await import('@/lib/services/lead-match.service')
    vi.mocked(LeadMatchService.findOrCreate).mockResolvedValue({ leadId: 'l-1', personId: 'p-1' })

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const out = await AppointmentService.bookManual({
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customer: {
        name: 'Anna',
        email: 'anna@example.com',
        phone: '+491',
      },
      suppressCustomerMail: true,
    })

    expect(out.id).toBe('appt-manual-2')

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    expect(AppointmentMailService.queueConfirmation).toHaveBeenCalledTimes(1)
    expect(AppointmentMailService.queueConfirmation).toHaveBeenCalledWith('appt-manual-2', { skipCustomer: true })
    expect(AppointmentMailService.queueReminders).not.toHaveBeenCalled()
  })

  it('with personId: appointments.personId matches passed value, LeadMatchService.findOrCreate NOT called', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])
    const insertedRows: Array<Record<string, unknown>> = []
    const originalInsert = helper.db.insert
    helper.db.insert = vi.fn().mockImplementation((...args: unknown[]) => {
      const chain = (originalInsert as unknown as (...a: unknown[]) => Record<string, unknown>)(...args)
      const originalValues = chain.values as (...a: unknown[]) => unknown
      chain.values = vi.fn().mockImplementation((payload: unknown) => {
        insertedRows.push(payload as Record<string, unknown>)
        return (originalValues as (...a: unknown[]) => unknown)(payload)
      })
      return chain
    }) as unknown as typeof helper.db.insert
    helper.insertMock.mockResolvedValueOnce([{
      id: 'appt-manual-3',
      status: 'pending',
      startAt: FUTURE_DATE,
      endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000),
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    await setupBookHappyPath()

    const { LeadMatchService } = await import('@/lib/services/lead-match.service')

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    await AppointmentService.bookManual({
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customer: {
        name: 'Anna',
        email: 'anna@example.com',
        phone: '+491',
      },
      personId: 'person-explicit',
    })

    const apptInsert = insertedRows.find(r => 'source' in r) as Record<string, unknown> | undefined
    expect(apptInsert).toBeDefined()
    expect(apptInsert!.personId).toBe('person-explicit')
    expect(apptInsert!.leadId).toBeNull()
    expect(apptInsert!.source).toBe('manual')

    expect(LeadMatchService.findOrCreate).not.toHaveBeenCalled()
  })

  it('without personId: falls back to LeadMatchService, personId populated from match result', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ timezone: 'Europe/Berlin' }])
    helper.selectMock.mockResolvedValueOnce([])
    const insertedRows: Array<Record<string, unknown>> = []
    const originalInsert = helper.db.insert
    helper.db.insert = vi.fn().mockImplementation((...args: unknown[]) => {
      const chain = (originalInsert as unknown as (...a: unknown[]) => Record<string, unknown>)(...args)
      const originalValues = chain.values as (...a: unknown[]) => unknown
      chain.values = vi.fn().mockImplementation((payload: unknown) => {
        insertedRows.push(payload as Record<string, unknown>)
        return (originalValues as (...a: unknown[]) => unknown)(payload)
      })
      return chain
    }) as unknown as typeof helper.db.insert
    helper.insertMock.mockResolvedValueOnce([{
      id: 'appt-manual-4',
      status: 'pending',
      startAt: FUTURE_DATE,
      endAt: new Date(FUTURE_DATE.getTime() + 30 * 60_000),
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    await setupBookHappyPath()

    const { LeadMatchService } = await import('@/lib/services/lead-match.service')
    vi.mocked(LeadMatchService.findOrCreate).mockResolvedValue({
      leadId: 'lead-from-match',
      personId: 'person-from-match',
    })

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    await AppointmentService.bookManual({
      userId: 'u-1',
      slotTypeId: 'st-1',
      startAtUtc: FUTURE_DATE,
      customer: {
        name: 'Anna',
        email: 'anna@example.com',
        phone: '+491',
      },
    })

    expect(LeadMatchService.findOrCreate).toHaveBeenCalledTimes(1)
    expect(LeadMatchService.findOrCreate).toHaveBeenCalledWith({
      email: 'anna@example.com',
      name: 'Anna',
      phone: '+491',
      source: 'manual_booking',
    })

    const apptInsert = insertedRows.find(r => 'source' in r) as Record<string, unknown> | undefined
    expect(apptInsert).toBeDefined()
    expect(apptInsert!.personId).toBe('person-from-match')
    expect(apptInsert!.leadId).toBe('lead-from-match')
  })
})
