import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey(keyHex: string): Buffer {
  if (keyHex.length !== 64) {
    throw new Error('Token encryption key must be 32 bytes hex (64 chars)')
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * AES-256-GCM. Format: <iv_hex>:<ciphertext_hex>:<authtag_hex>
 */
export function encryptToken(plaintext: string, keyHex: string): string {
  const key = getKey(keyHex)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`
}

export function decryptToken(stored: string, keyHex: string): string {
  const key = getKey(keyHex)
  const [ivHex, ctHex, tagHex] = stored.split(':')
  if (!ivHex || !ctHex || !tagHex) throw new Error('Invalid token ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const ct = Buffer.from(ctHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const out = Buffer.concat([decipher.update(ct), decipher.final()])
  return out.toString('utf8')
}
