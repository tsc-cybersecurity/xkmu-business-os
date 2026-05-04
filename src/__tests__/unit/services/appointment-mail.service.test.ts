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
