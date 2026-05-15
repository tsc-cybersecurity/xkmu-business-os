import { db } from '@/lib/db'
import { cmsSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Globale Voice-Agent-App-Settings (im Gegensatz zu den per-Agent-
// Settings auf voice.xkmu.de). Aktuell nur callerName — wird im
// Dispatch fuer {agent_name}-Substitution in Prompts genutzt.
const SETTINGS_KEY = 'voice.agent_settings'

export interface VoiceAppSettings {
  callerName: string
}

const DEFAULT_SETTINGS: VoiceAppSettings = {
  callerName: 'Lea',
}

function parseSettings(raw: unknown): VoiceAppSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS
  const obj = raw as Record<string, unknown>
  return {
    callerName:
      typeof obj.callerName === 'string' && obj.callerName.trim().length > 0
        ? obj.callerName.trim()
        : DEFAULT_SETTINGS.callerName,
  }
}

export const VoiceAppSettingsService = {
  async get(): Promise<VoiceAppSettings> {
    const [row] = await db
      .select()
      .from(cmsSettings)
      .where(eq(cmsSettings.key, SETTINGS_KEY))
      .limit(1)
    return parseSettings(row?.value)
  },

  async update(patch: Partial<VoiceAppSettings>): Promise<VoiceAppSettings> {
    const current = await VoiceAppSettingsService.get()
    const next: VoiceAppSettings = {
      ...current,
      ...patch,
      callerName: (patch.callerName ?? current.callerName).trim() || DEFAULT_SETTINGS.callerName,
    }
    const [existing] = await db
      .select()
      .from(cmsSettings)
      .where(eq(cmsSettings.key, SETTINGS_KEY))
      .limit(1)
    if (existing) {
      await db
        .update(cmsSettings)
        .set({ value: next, updatedAt: new Date() })
        .where(eq(cmsSettings.key, SETTINGS_KEY))
    } else {
      await db.insert(cmsSettings).values({ key: SETTINGS_KEY, value: next })
    }
    return next
  },

  // Substitution-Helper — ersetzt {agent_name} in Prompts vor Forward
  // zu voice.xkmu.de. Globaler Replace damit der Placeholder beliebig
  // oft vorkommen darf.
  substitute(text: string, settings: VoiceAppSettings): string {
    if (!text) return text
    return text.replace(/\{agent_name\}/g, settings.callerName)
  },
}
