import { db } from '@/lib/db'
import { wibaRequirements } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import type { WibaRequirement } from '@/lib/db/schema'

export const WIBA_CATEGORY_NAMES: Record<number, string> = {
  1: 'Arbeit ausserhalb der Institution',
  2: 'Arbeit innerhalb der Institution / Haustechnik',
  3: 'Backup',
  4: 'Buerosoftware',
  5: 'Client',
  6: 'Drucker und Multifunktionsgeraete',
  7: 'IT-Administration',
  8: 'Mobile Endgeraete',
  9: 'Netze',
  10: 'Organisation und Personal',
  11: 'Outsourcing und Cloud',
  12: 'Rollen / Berechtigungen / Authentisierung',
  13: 'Serverraum und Datentraegerarchiv',
  14: 'Serversysteme',
  15: 'Sicherheitsmechanismen',
  16: 'Telefonie und Fax',
  17: 'Umgang mit Informationen',
  18: 'Vorbereitung fuer Sicherheitsvorfaelle',
  19: 'Webserver und Webanwendungen',
}

export const WibaRequirementService = {
  async list(): Promise<WibaRequirement[]> {
    return db
      .select()
      .from(wibaRequirements)
      .orderBy(asc(wibaRequirements.id))
  },

  async getById(id: number): Promise<WibaRequirement | null> {
    const [req] = await db
      .select()
      .from(wibaRequirements)
      .where(eq(wibaRequirements.id, id))
      .limit(1)
    return req ?? null
  },

  async getByCategory(category: number): Promise<WibaRequirement[]> {
    return db
      .select()
      .from(wibaRequirements)
      .where(eq(wibaRequirements.category, category))
      .orderBy(asc(wibaRequirements.id))
  },

  getCategoryNames() {
    return WIBA_CATEGORY_NAMES
  },
}
