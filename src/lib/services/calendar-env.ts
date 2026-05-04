/**
 * Liefert die Calendar-Env-Vars oder wirft, wenn nicht vollständig gesetzt.
 * Soft-Disable an Aufruf-Sites: try/catch und Fallback auf "Feature deaktiviert"-Branch.
 */
export interface CalendarEnv {
  clientId: string
  clientSecret: string
  redirectUri: string
  tokenKey: Buffer
  appointmentTokenSecret: string
  appPublicUrl: string
}

export function getCalendarEnv(): CalendarEnv {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI
  const tokenKeyHex = process.env.CALENDAR_TOKEN_KEY
  const appointmentTokenSecret = process.env.APPOINTMENT_TOKEN_SECRET
  const appPublicUrl = process.env.APP_PUBLIC_URL

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GOOGLE_CALENDAR_CLIENT_ID/SECRET/REDIRECT_URI not configured')
  }
  if (!tokenKeyHex || tokenKeyHex.length !== 64) {
    throw new Error('CALENDAR_TOKEN_KEY must be 32 bytes hex (64 chars)')
  }
  if (!appointmentTokenSecret || appointmentTokenSecret.length < 32) {
    throw new Error('APPOINTMENT_TOKEN_SECRET must be at least 32 chars')
  }
  if (!appPublicUrl) {
    throw new Error('APP_PUBLIC_URL not configured')
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    tokenKey: Buffer.from(tokenKeyHex, 'hex'),
    appointmentTokenSecret,
    appPublicUrl,
  }
}

export function isCalendarFeatureEnabled(): boolean {
  try {
    getCalendarEnv()
    return true
  } catch {
    return false
  }
}
