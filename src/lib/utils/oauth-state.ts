import { createHmac, timingSafeEqual } from 'node:crypto'

const STATE_MAX_AGE_MS = 5 * 60_000

export interface StatePayload {
  uid: string
  n: string
  t: number
}

/**
 * Signs an OAuth state payload with HMAC-SHA256.
 * Returns `<base64url(payload)>.<hex-sig>`.
 */
export function signState(payload: object, secret: string): string {
  const raw = JSON.stringify(payload)
  const sig = createHmac('sha256', secret).update(raw).digest('hex')
  return `${Buffer.from(raw).toString('base64url')}.${sig}`
}

/**
 * Verifies an OAuth state string (format: `<base64url(json)>.<hex-sig>`).
 * Returns the parsed payload, or null if the signature is invalid or the state has expired.
 */
export function verifyState(state: string, secret: string): StatePayload | null {
  const dot = state.lastIndexOf('.')
  if (dot < 0) return null
  const rawB64 = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const rawJson = Buffer.from(rawB64, 'base64url').toString('utf8')
  const expected = createHmac('sha256', secret).update(rawJson).digest('hex')
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(rawJson) as StatePayload
    if (Date.now() - parsed.t > STATE_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}
