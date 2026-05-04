import { describe, it, expect, beforeEach, vi } from 'vitest'

const ORIG_ENV = process.env

beforeEach(() => {
  vi.resetModules()
  process.env = { ...ORIG_ENV, APPOINTMENT_TOKEN_SECRET: 'a'.repeat(64) }
})

describe('appointment-token.util', () => {
  it('round-trips a valid token (generate → verify)', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const expiresAt = new Date(Date.now() + 60_000)
    const { token, hash } = mod.generateAppointmentToken({
      appointmentId: 'apt-1',
      purpose: 'cancel',
      expiresAt,
    })
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(hash).toHaveLength(64)
    const verified = mod.verifyAppointmentToken(token)
    expect(verified.ok).toBe(true)
    if (verified.ok) {
      expect(verified.payload.a).toBe('apt-1')
      expect(verified.payload.p).toBe('cancel')
    }
  })

  it('rejects modified payload (signature mismatch)', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const { token } = mod.generateAppointmentToken({
      appointmentId: 'apt-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() + 60_000),
    })
    const [, sig] = token.split('.')
    const tampered = mod.encodeBase64Url(JSON.stringify({ a: 'apt-2', p: 'cancel', e: Date.now() + 60_000, n: 'x' })) + '.' + sig
    const result = mod.verifyAppointmentToken(tampered)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('bad_signature')
  })

  it('rejects expired tokens', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const { token } = mod.generateAppointmentToken({
      appointmentId: 'apt-1',
      purpose: 'cancel',
      expiresAt: new Date(Date.now() - 1000),
    })
    const result = mod.verifyAppointmentToken(token)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('expired')
  })

  it('hashOf is deterministic and uses sha256', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const a = mod.hashOf('hello')
    const b = mod.hashOf('hello')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('different purposes yield different signatures for same appointment', async () => {
    const mod = await import('@/lib/utils/appointment-token.util')
    const exp = new Date(Date.now() + 60_000)
    const a = mod.generateAppointmentToken({ appointmentId: 'apt-1', purpose: 'cancel', expiresAt: exp })
    const b = mod.generateAppointmentToken({ appointmentId: 'apt-1', purpose: 'reschedule', expiresAt: exp })
    expect(a.token).not.toBe(b.token)
  })
})
