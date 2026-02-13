import { db } from '@/lib/db'
import { dinRequirements } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import type { DinRequirement } from '@/lib/db/schema'

export const TOPIC_NAMES: Record<number, string> = {
  1: 'Organisation & Sensibilisierung',
  2: 'Identitaets- & Berechtigungsmanagement',
  3: 'Datensicherung',
  4: 'Patch- & Aenderungsmanagement',
  5: 'Schutz vor Schadprogrammen',
  6: 'IT-Systeme & Netzwerke',
}

export const DinRequirementService = {
  async list(): Promise<DinRequirement[]> {
    return db
      .select()
      .from(dinRequirements)
      .orderBy(asc(dinRequirements.id))
  },

  async getById(id: number): Promise<DinRequirement | null> {
    const [req] = await db
      .select()
      .from(dinRequirements)
      .where(eq(dinRequirements.id, id))
      .limit(1)
    return req ?? null
  },

  async getByTopicArea(topicArea: number): Promise<DinRequirement[]> {
    return db
      .select()
      .from(dinRequirements)
      .where(eq(dinRequirements.topicArea, topicArea))
      .orderBy(asc(dinRequirements.id))
  },

  getTopicNames() {
    return TOPIC_NAMES
  },
}
