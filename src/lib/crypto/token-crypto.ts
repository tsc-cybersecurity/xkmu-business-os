import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

export function generateKeyHex(): string {
  return randomBytes(KEY_LENGTH).toString('hex')
}

export function encryptToken(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== KEY_LENGTH) throw new Error('invalid_key_length')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`
}

export function decryptToken(ciphertext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== KEY_LENGTH) throw new Error('invalid_key_length')
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('invalid_ciphertext_format')
  const [ivHex, ctHex, tagHex] = parts
  // ctHex may be '' for empty plaintext — AES-GCM auth tag still protects it
  if (!ivHex || !tagHex) throw new Error('invalid_ciphertext_format')
  const iv = Buffer.from(ivHex, 'hex')
  const ct = Buffer.from(ctHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}
