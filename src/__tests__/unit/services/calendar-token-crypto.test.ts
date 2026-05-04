import { describe, it, expect, beforeEach } from 'vitest'

describe('calendar-token-crypto', () => {
  beforeEach(() => {
    process.env.CALENDAR_TOKEN_KEY = '0'.repeat(64)  // 32 bytes hex
  })

  it('round-trips a token plaintext through encrypt/decrypt', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/services/calendar-token-crypto')
    const plain = 'ya29.a0AfH6SMBabcdef.refresh-stuff'
    const cipher = encryptToken(plain)
    expect(cipher).not.toContain(plain)
    expect(cipher.split(':').length).toBe(3)
    const back = decryptToken(cipher)
    expect(back).toBe(plain)
  })

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    const a = encryptToken('same')
    const b = encryptToken('same')
    expect(a).not.toBe(b)
  })

  it('rejects tampered ciphertext', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/services/calendar-token-crypto')
    const cipher = encryptToken('hello')
    const [iv, ct, tag] = cipher.split(':')
    const tampered = `${iv}:${ct.replace(/.$/, ct.endsWith('a') ? 'b' : 'a')}:${tag}`
    expect(() => decryptToken(tampered)).toThrow()
  })

  it('throws if CALENDAR_TOKEN_KEY is missing or wrong length', async () => {
    process.env.CALENDAR_TOKEN_KEY = 'short'
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    expect(() => encryptToken('x')).toThrow()
  })
})
