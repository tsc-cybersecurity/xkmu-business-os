import { db } from '@/lib/db'
import { googleCalendarConfig, type GoogleCalendarConfig } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'

export interface CalendarConfig {
  id: string
  clientId: string | null
  clientSecret: string | null
  redirectUri: string | null
  appPublicUrl: string | null
  tokenEncryptionKeyHex: string
  appointmentTokenSecret: string
}

export const CalendarConfigService = {
  /**
   * Returns the singleton config row, lazy-creating it on first call.
   * Migration 0040 seeds an initial row, but production-recovery may need this.
   */
  async getConfig(): Promise<CalendarConfig> {
    const rows = await db.select().from(googleCalendarConfig).limit(1)
    if (rows[0]) return toConfig(rows[0])

    // Lazy-create with auto-generated crypto material
    const [created] = await db.insert(googleCalendarConfig).values({
      tokenEncryptionKeyHex: randomBytes(32).toString('hex'),
      appointmentTokenSecret: randomBytes(48).toString('hex'),
    }).returning()
    return toConfig(created)
  },

  /**
   * Update admin-provided OAuth credentials. Crypto keys cannot be rotated
   * here (would invalidate all stored tokens).
   */
  async updateCredentials(input: {
    clientId: string | null
    clientSecret: string | null
    redirectUri: string | null
    appPublicUrl: string | null
  }): Promise<CalendarConfig> {
    const cfg = await this.getConfig()
    const [updated] = await db.update(googleCalendarConfig).set({
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      redirectUri: input.redirectUri,
      appPublicUrl: input.appPublicUrl,
      updatedAt: new Date(),
    }).where(eq(googleCalendarConfig.id, cfg.id)).returning()
    return toConfig(updated)
  },

  isConfigured(cfg: CalendarConfig): boolean {
    return !!(cfg.clientId && cfg.clientSecret && cfg.redirectUri && cfg.appPublicUrl)
  },
}

function toConfig(row: GoogleCalendarConfig): CalendarConfig {
  return {
    id: row.id,
    clientId: row.clientId,
    clientSecret: row.clientSecret,
    redirectUri: row.redirectUri,
    appPublicUrl: row.appPublicUrl,
    tokenEncryptionKeyHex: row.tokenEncryptionKeyHex,
    appointmentTokenSecret: row.appointmentTokenSecret,
  }
}
