import { db } from '@/lib/db'
import { userUiPrefs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const UserUiPrefsService = {
  async get(userId: string): Promise<Record<string, unknown>> {
    const [row] = await db
      .select()
      .from(userUiPrefs)
      .where(eq(userUiPrefs.userId, userId))
      .limit(1)
    return (row?.prefs as Record<string, unknown>) ?? {}
  },

  // Patch — fuegt eine einzelne Pref unter dem gegebenen Key ein/ueberschreibt
  // sie. Restliche Keys bleiben unangetastet, damit zwei UI-Komponenten
  // parallel ihre eigenen Settings persistieren koennen.
  async setKey(userId: string, key: string, value: unknown): Promise<Record<string, unknown>> {
    const current = await UserUiPrefsService.get(userId)
    const next = { ...current, [key]: value }
    await db
      .insert(userUiPrefs)
      .values({ userId, prefs: next })
      .onConflictDoUpdate({
        target: userUiPrefs.userId,
        set: { prefs: next, updatedAt: new Date() },
      })
    return next
  },
}
