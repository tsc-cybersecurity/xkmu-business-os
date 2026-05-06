import { CalendarConfigService } from '@/lib/services/calendar-config.service'

/**
 * Returns the shared encryption key (hex) used for all stored OAuth tokens.
 * Currently re-uses the calendar config key — single source of truth per org.
 */
export async function getSocialTokenKey(): Promise<string> {
  const cfg = await CalendarConfigService.getConfig()
  return cfg.tokenEncryptionKeyHex
}
