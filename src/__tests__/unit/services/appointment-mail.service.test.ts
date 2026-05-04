import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

describe('AppointmentMailService.queueConfirmation', () => {
  beforeEach(() => vi.resetModules())

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
})
