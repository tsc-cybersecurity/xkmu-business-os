import { describe, it, expect } from 'vitest'
import { encryptToken, decryptToken, generateKeyHex } from '@/lib/crypto/token-crypto'

describe('token-crypto', () => {
  it('round-trips ASCII plaintext', () => {
    const key = generateKeyHex()
    const ct = encryptToken('hello', key)
    expect(ct).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
    expect(decryptToken(ct, key)).toBe('hello')
  })

  it('round-trips unicode plaintext', () => {
    const key = generateKeyHex()
    expect(decryptToken(encryptToken('Schöner Token €€', key), key)).toBe('Schöner Token €€')
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const key = generateKeyHex()
    expect(encryptToken('x', key)).not.toBe(encryptToken('x', key))
  })

  it('throws on tampered ciphertext (auth-tag)', () => {
    const key = generateKeyHex()
    const ct = encryptToken('secret', key)
    const [iv, body, tag] = ct.split(':')
    const tampered = `${iv}:${body.replace(/^./, '0')}:${tag}`
    expect(() => decryptToken(tampered, key)).toThrow()
  })

  it('throws on wrong key', () => {
    const k1 = generateKeyHex(), k2 = generateKeyHex()
    expect(() => decryptToken(encryptToken('x', k1), k2)).toThrow()
  })
})
