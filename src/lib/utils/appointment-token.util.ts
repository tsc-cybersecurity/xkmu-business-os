import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export type TokenPurpose = 'cancel' | 'reschedule'

export interface TokenPayload {
  a: string  // appointmentId
  p: TokenPurpose
  e: number  // expiresEpoch (ms)
  n: string  // nonce
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' }

function getSecret(): Buffer {
  const secret = process.env.APPOINTMENT_TOKEN_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('APPOINTMENT_TOKEN_SECRET is not set or too short (need ≥32 chars)')
  }
  return Buffer.from(secret, 'utf8')
}

export function encodeBase64Url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

export function hashOf(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function generateAppointmentToken(args: {
  appointmentId: string
  purpose: TokenPurpose
  expiresAt: Date
}): { token: string; hash: string } {
  const payload: TokenPayload = {
    a: args.appointmentId,
    p: args.purpose,
    e: args.expiresAt.getTime(),
    n: randomBytes(8).toString('hex'),
  }
  const payloadStr = JSON.stringify(payload)
  const payloadEnc = encodeBase64Url(payloadStr)
  const sig = createHmac('sha256', getSecret()).update(payloadEnc).digest()
  const sigEnc = encodeBase64Url(sig)
  const token = `${payloadEnc}.${sigEnc}`
  return { token, hash: hashOf(token) }
}

export function verifyAppointmentToken(token: string): VerifyResult {
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformed' }
  const [payloadEnc, sigEnc] = parts
  let payload: TokenPayload
  try {
    payload = JSON.parse(decodeBase64Url(payloadEnc).toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (typeof payload?.a !== 'string' || typeof payload?.e !== 'number' || !Number.isFinite(payload.e) || typeof payload?.n !== 'string'
      || (payload.p !== 'cancel' && payload.p !== 'reschedule')) {
    return { ok: false, reason: 'malformed' }
  }
  const expectedSig = createHmac('sha256', getSecret()).update(payloadEnc).digest()
  let providedSig: Buffer
  try {
    providedSig = decodeBase64Url(sigEnc)
  } catch {
    return { ok: false, reason: 'bad_signature' }
  }
  if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
    return { ok: false, reason: 'bad_signature' }
  }
  if (payload.e <= Date.now()) return { ok: false, reason: 'expired' }
  return { ok: true, payload }
}
