import { db } from '@/lib/db'
import { cmsSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Globale Sidebar fuer die Detailansicht von Blog-Beitraegen. Inhalt als
// Markdown (gleicher Renderer wie der Beitrags-Content), damit Operatoren
// Promo-Slots ueber {promo:slug} einbinden koennen. Toggle + Inhalt liegen
// in cms_settings — kein separater Tabellen-Aufschlag noetig.
const KEY = 'blog.sidebar'

export interface BlogSidebarSettings {
  enabled: boolean
  markdown: string
}

const DEFAULTS: BlogSidebarSettings = { enabled: false, markdown: '' }

function normalize(value: unknown): BlogSidebarSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULTS }
  const v = value as Record<string, unknown>
  return {
    enabled: v.enabled === true,
    markdown: typeof v.markdown === 'string' ? v.markdown : '',
  }
}

export const BlogSidebarService = {
  async get(): Promise<BlogSidebarSettings> {
    try {
      const [row] = await db
        .select({ value: cmsSettings.value })
        .from(cmsSettings)
        .where(eq(cmsSettings.key, KEY))
        .limit(1)
      return normalize(row?.value)
    } catch {
      return { ...DEFAULTS }
    }
  },

  async update(input: Partial<BlogSidebarSettings>): Promise<BlogSidebarSettings> {
    const current = await this.get()
    const next: BlogSidebarSettings = {
      enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
      markdown: typeof input.markdown === 'string' ? input.markdown : current.markdown,
    }
    // cms_settings.key hat keinen unique-Constraint, daher manueller Upsert:
    // select-then-update-or-insert (Pattern wie VoiceAppSettingsService).
    const [existing] = await db
      .select({ id: cmsSettings.id })
      .from(cmsSettings)
      .where(eq(cmsSettings.key, KEY))
      .limit(1)
    if (existing) {
      await db
        .update(cmsSettings)
        .set({ value: next, updatedAt: new Date() })
        .where(eq(cmsSettings.key, KEY))
    } else {
      await db.insert(cmsSettings).values({ key: KEY, value: next })
    }
    return next
  },
}
