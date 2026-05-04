import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

describe('AppointmentMailService.queueConfirmation', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.APPOINTMENT_TOKEN_SECRET = 'a'.repeat(64)
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.xkmu.de'
  })

  it('queues both customer and staff mails with template slugs', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1', userId: 'u-1', slotTypeId: 'st-1',
      startAt: new Date('2026-05-04T09:00:00Z'),
      endAt: new Date('2026-05-04T09:30:00Z'),
      customerName: 'Anna', customerEmail: 'anna@example.com',
      customerPhone: '+491', customerMessage: 'Bitte zurückrufen',
      leadId: 'l-1', personId: 'p-1',
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
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await AppointmentMailService.queueConfirmation('a-1')
    expect(helper.db.insert).toHaveBeenCalledTimes(2)
  })

  it('skips staff mail when user has no email', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1', userId: 'u-1', slotTypeId: 'st-1',
      startAt: new Date(), endAt: new Date(),
      customerName: 'X', customerEmail: 'x@y', customerPhone: '0', customerMessage: null,
      leadId: null, personId: null,
    }])
    helper.selectMock.mockResolvedValueOnce([{ id: 'st-1', name: 'X', durationMinutes: 30, location: 'phone', locationDetails: null }])
    helper.selectMock.mockResolvedValueOnce([{ email: null, firstName: 'A', lastName: 'B', timezone: 'Europe/Berlin' }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    helper.insertMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await AppointmentMailService.queueConfirmation('a-1')
    expect(helper.db.insert).toHaveBeenCalledTimes(1)
  })

  it('throws when appointment not found', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await expect(AppointmentMailService.queueConfirmation('missing')).rejects.toThrow(/not found/)
  })

  it('persists token hashes and passes cancel/reschedule URLs in placeholders', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1', userId: 'u-1', slotTypeId: 'st-1',
      startAt: new Date('2026-05-04T09:00:00Z'),
      endAt: new Date('2026-05-04T09:30:00Z'),
      customerName: 'Anna', customerEmail: 'anna@example.com',
      customerPhone: '+491', customerMessage: 'Bitte zurückrufen',
      leadId: 'l-1', personId: 'p-1',
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

    // Capture .values() args from db.insert(...).values(payload)
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

    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await AppointmentMailService.queueConfirmation('a-1')

    expect(helper.db.update).toHaveBeenCalledTimes(1)
    expect(insertedPayloads.length).toBeGreaterThanOrEqual(1)

    const customerPayload = insertedPayloads.find((p): p is { payload: { templateSlug: string; placeholders: Record<string, string> } } => {
      const obj = p as { payload?: { templateSlug?: string } }
      return obj?.payload?.templateSlug === 'appointment.customer.confirmation'
    })
    expect(customerPayload).toBeDefined()
    const placeholders = customerPayload!.payload.placeholders
    expect(placeholders['links.cancel_url']).toMatch(/^https:\/\/www\.xkmu\.de\/buchen\/cancel\?token=/)
    expect(placeholders['links.reschedule_url']).toMatch(/^https:\/\/www\.xkmu\.de\/buchen\/reschedule\?token=/)
  })
})

describe('AppointmentMailService.queueReminders', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.APPOINTMENT_TOKEN_SECRET = 'a'.repeat(64)
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.xkmu.de'
  })

  it('queues 2 reminders (24h + 1h) for far-future appointment', async () => {
    const helper = setupDbMock()
    const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // now + 48h
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000)
    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1', userId: 'u-1', slotTypeId: 'st-1',
      startAt, endAt,
      customerName: 'Anna', customerEmail: 'anna@example.com',
      customerPhone: '+491', customerMessage: null,
      leadId: 'l-1', personId: 'p-1',
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

    // Capture .values() args from db.insert(...).values(payload)
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

    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await AppointmentMailService.queueReminders('a-1')

    expect(helper.db.insert).toHaveBeenCalledTimes(2)

    type ReminderPayload = {
      type: string
      payload: { templateSlug: string }
      scheduledFor: Date
    }
    const reminders = insertedPayloads as ReminderPayload[]
    expect(reminders.every((p) => p.type === 'appointment_reminder')).toBe(true)
    const slugs = reminders.map((p) => p.payload.templateSlug).sort()
    expect(slugs).toEqual([
      'appointment.customer.reminder_1h',
      'appointment.customer.reminder_24h',
    ])
  })

  it('skips both reminders for near-future appointment (start in 30 minutes)', async () => {
    const helper = setupDbMock()
    const startAt = new Date(Date.now() + 30 * 60 * 1000) // now + 30 min
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000)
    helper.selectMock.mockResolvedValueOnce([{
      id: 'a-1', userId: 'u-1', slotTypeId: 'st-1',
      startAt, endAt,
      customerName: 'Anna', customerEmail: 'anna@example.com',
      customerPhone: '+491', customerMessage: null,
      leadId: null, personId: null,
    }])
    helper.selectMock.mockResolvedValueOnce([{
      id: 'st-1', name: 'X', durationMinutes: 30,
      location: 'phone', locationDetails: null,
    }])
    helper.selectMock.mockResolvedValueOnce([{
      email: 'tino@xkmu.de', firstName: 'Tino', lastName: 'S', timezone: 'Europe/Berlin',
    }])
    helper.updateMock.mockResolvedValueOnce(undefined)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    await AppointmentMailService.queueReminders('a-1')

    expect(helper.db.insert).toHaveBeenCalledTimes(0)
  })
})

describe('AppointmentMailService.cancelPendingReminders', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.APPOINTMENT_TOKEN_SECRET = 'a'.repeat(64)
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.xkmu.de'
  })

  it('returns count of cancelled tasks', async () => {
    const helper = setupDbMock()
    helper.updateMock.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentMailService } = await import('@/lib/services/appointment-mail.service')
    const count = await AppointmentMailService.cancelPendingReminders('a-1')

    expect(count).toBe(2)
    expect(helper.db.update).toHaveBeenCalledTimes(1)
  })
})
