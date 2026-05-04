import { describe, it, expect } from 'vitest'

const KEY = '0'.repeat(64)

describe('calendar-token-crypto', () => {
  it('round-trips a token plaintext through encrypt/decrypt', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/services/calendar-token-crypto')
    const plain = 'ya29.a0AfH6SMBabcdef.refresh-stuff'
    const cipher = encryptToken(plain, KEY)
    expect(cipher).not.toContain(plain)
    expect(cipher.split(':').length).toBe(3)
    const back = decryptToken(cipher, KEY)
    expect(back).toBe(plain)
  })

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    const a = encryptToken('same', KEY)
    const b = encryptToken('same', KEY)
    expect(a).not.toBe(b)
  })

  it('rejects tampered ciphertext', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/services/calendar-token-crypto')
    const cipher = encryptToken('hello', KEY)
    const [iv, ct, tag] = cipher.split(':')
    const tampered = `${iv}:${ct.replace(/.$/, ct.endsWith('a') ? 'b' : 'a')}:${tag}`
    expect(() => decryptToken(tampered, KEY)).toThrow()
  })

  it('throws when key is wrong length', async () => {
    const { encryptToken } = await import('@/lib/services/calendar-token-crypto')
    expect(() => encryptToken('x', 'short')).toThrow()
  })
})
