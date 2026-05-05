import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

type CapturedPayload = {
  payload: {
    templateSlug: string
    attachments?: Array<{ filename: string; content: string; contentType: string }>
  }
  priority: number
}

function captureInserts(helper: ReturnType<typeof setupDbMock>): unknown[] {
  const insertedPayloads: unknown[] = []
  const originalInsert = helper.db.insert
  helper.db.insert = vi.fn().mockImplementation((...insertArgs: unknown[]) => {
    const chain = (originalInsert as unknown as (...a: unknown[]) => Record<string, unknown>)(...insertArgs)
    const originalValues = chain.values as (...a: unknown[]) => unknown
    chain.values = vi.fn().mockImplementation((payload: unknown) => {
      insertedPayloads.push(payload)
      return (originalValues as (...a: unknown[]) => unknown)(payload)
    })
    return chain
  }) as unknown as typeof helper.db.insert
  return insertedPayloads
}

describe('AppointmentMailService — .ics attachments', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.APPOINTMENT_TOKEN_SECRET = 'a'.repeat(64)
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.xkmu.de'
  })

  it('queueConfirmation attaches .ics on customer row, NOT on staff row', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1', userId: 'u-1', slotTypeId: 'st-1',
      startAt: new Date('2026-05-04T09:00:00Z'),
      endAt: new Date('2026-05-04T09:30:00Z'),
      customerName: 'Anna', customerEmail: 'anna@example.com',
      customerPhone: '+491', customerMessage: 'Bitte zurückrufen',
      leadId: 'l-1', personId: 'p-1',
      icsSequence: 0, status: 'confirmed',
    }])
    helper.selectMock.mockResolvedValueOnce([{
      id: 'st-1', name: 'Erstgespräch', durationMinutes: 30,
      location: 'phone', locationDetails: null,
    }])
    helper.selectMock.mockResolvedValueOnce([{
      email: 'tino@xkmu.de', firstName: 'Tino', lastName: 'S', timezone: 'Europe/Berlin',
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    helper.insertMock.mockResolvedValueOnce(undefined)
    helper.insertMock.mockResolvedValueOnce(undefined)

    const insertedPayloads = captureInserts(helper)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await AppointmentMailService.queueConfirmation('a-1')

    const payloads = insertedPayloads as CapturedPayload[]
    const customerRow = payloads.find(p => p.payload.templateSlug === 'appointment.customer.confirmation')
    const staffRow = payloads.find(p => p.payload.templateSlug === 'appointment.staff.notification')

    expect(customerRow).toBeDefined()
    expect(staffRow).toBeDefined()

    // Customer row: has attachments
    expect(customerRow!.payload.attachments).toBeDefined()
    expect(customerRow!.payload.attachments).toHaveLength(1)
    const att = customerRow!.payload.attachments![0]
    expect(att.filename).toBe('termin.ics')
    expect(att.content.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(att.content).toContain('UID:a-1@xkmu.de')
    expect(att.content).toContain('METHOD:REQUEST')
    expect(att.content).toContain('SEQUENCE:0')

    // Staff row: NO attachments
    expect(staffRow!.payload.attachments).toBeUndefined()
  })

  it('queueReschedule attaches .ics with bumped SEQUENCE', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-2', userId: 'u-1', slotTypeId: 'st-1',
      startAt: new Date('2026-05-05T10:00:00Z'),
      endAt: new Date('2026-05-05T10:30:00Z'),
      customerName: 'Bob', customerEmail: 'bob@example.com',
      customerPhone: '+492', customerMessage: null,
      leadId: null, personId: null,
      icsSequence: 3, status: 'confirmed',
    }])
    helper.selectMock.mockResolvedValueOnce([{
      id: 'st-1', name: 'Erstgespräch', durationMinutes: 30,
      location: 'phone', locationDetails: null,
    }])
    helper.selectMock.mockResolvedValueOnce([{
      email: 'tino@xkmu.de', firstName: 'Tino', lastName: 'S', timezone: 'Europe/Berlin',
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    helper.insertMock.mockResolvedValueOnce(undefined)
    helper.insertMock.mockResolvedValueOnce(undefined)

    const insertedPayloads = captureInserts(helper)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await AppointmentMailService.queueReschedule('a-2')

    const payloads = insertedPayloads as CapturedPayload[]
    const customerRow = payloads.find(p => p.payload.templateSlug === 'appointment.customer.rescheduled')
    expect(customerRow).toBeDefined()
    expect(customerRow!.payload.attachments).toHaveLength(1)
    const content = customerRow!.payload.attachments![0].content
    expect(content).toContain('SEQUENCE:3')
    expect(content).toContain('METHOD:REQUEST')
  })

  it('queueCancellation attaches .ics with METHOD:CANCEL', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-3', userId: 'u-1', slotTypeId: 'st-1',
      startAt: new Date('2026-05-06T11:00:00Z'),
      endAt: new Date('2026-05-06T11:30:00Z'),
      customerName: 'Cara', customerEmail: 'cara@example.com',
      customerPhone: '+493', customerMessage: null,
      leadId: null, personId: null,
      icsSequence: 1, status: 'cancelled',
    }])
    helper.selectMock.mockResolvedValueOnce([{
      id: 'st-1', name: 'Erstgespräch', durationMinutes: 30,
      location: 'phone', locationDetails: null,
    }])
    helper.selectMock.mockResolvedValueOnce([{
      email: 'tino@xkmu.de', firstName: 'Tino', lastName: 'S', timezone: 'Europe/Berlin',
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    helper.insertMock.mockResolvedValueOnce(undefined)
    helper.insertMock.mockResolvedValueOnce(undefined)

    const insertedPayloads = captureInserts(helper)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await AppointmentMailService.queueCancellation('a-3')

    const payloads = insertedPayloads as CapturedPayload[]
    const customerRow = payloads.find(p => p.payload.templateSlug === 'appointment.customer.cancelled')
    expect(customerRow).toBeDefined()
    expect(customerRow!.payload.attachments).toHaveLength(1)
    const content = customerRow!.payload.attachments![0].content
    expect(content).toContain('METHOD:CANCEL')
    expect(content).toContain('STATUS:CANCELLED')
  })
})
