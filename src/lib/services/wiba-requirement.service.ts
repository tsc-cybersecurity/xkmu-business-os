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

// BSI recommended processing order (Empfohlene Bearbeitungsreihenfolge)
// See: BSI WiBA - Weg_in_die_Basis_Absicherung_Empfohlene_Bearbeitungsreihenfolge.pdf
export const WIBA_CATEGORY_ORDER: { category: number; priority: number }[] = [
  // Prioritaet 1 - Grundlage fuer weitere Checklisten, groesste Cyberrisiken
  { category: 3, priority: 1 },   // Backup
  { category: 7, priority: 1 },   // IT-Administration
  { category: 10, priority: 1 },  // Organisation und Personal
  { category: 12, priority: 1 },  // Rollen / Berechtigungen / Authentisierung
  { category: 18, priority: 1 },  // Vorbereitung fuer Sicherheitsvorfaelle
  // Prioritaet 2 - Schutz der sensitivsten IT-Systeme
  { category: 4, priority: 2 },   // Buerosoftware
  { category: 5, priority: 2 },   // Client
  { category: 9, priority: 2 },   // Netze
  { category: 14, priority: 2 },  // Serversysteme
  { category: 13, priority: 2 },  // Serverraum und Datentraegerarchiv
  { category: 15, priority: 2 },  // Sicherheitsmechanismen
  { category: 19, priority: 2 },  // Webserver und Webanwendungen
  // Prioritaet 3 - Absicherung intern/extern bearbeiteter Informationen
  { category: 1, priority: 3 },   // Arbeit ausserhalb der Institution
  { category: 2, priority: 3 },   // Arbeit innerhalb der Institution / Haustechnik
  { category: 8, priority: 3 },   // Mobile Endgeraete
  { category: 11, priority: 3 },  // Outsourcing und Cloud
  { category: 17, priority: 3 },  // Umgang mit Informationen
  // Prioritaet 4 - Geringste Prioritaet
  { category: 6, priority: 4 },   // Drucker und Multifunktionsgeraete
  { category: 16, priority: 4 },  // Telefonie und Fax
]

// Ordered category IDs following BSI priority
export const WIBA_CATEGORY_ORDER_IDS = WIBA_CATEGORY_ORDER.map(c => c.category)

export const WIBA_CATEGORY_PRIORITIES: Record<number, number> = Object.fromEntries(
  WIBA_CATEGORY_ORDER.map(c => [c.category, c.priority])
)

export const WibaRequirementService = {
  async list(): Promise<WibaRequirement[]> {
    const all = await db
      .select()
      .from(wibaRequirements)
      .orderBy(asc(wibaRequirements.id))

    // Sort by BSI priority order: group by category in priority order, keep question order within category
    const categoryIndex = new Map(WIBA_CATEGORY_ORDER_IDS.map((id, idx) => [id, idx]))
    return all.sort((a, b) => {
      const aIdx = categoryIndex.get(a.category) ?? 99
      const bIdx = categoryIndex.get(b.category) ?? 99
      if (aIdx !== bIdx) return aIdx - bIdx
      return a.id - b.id
    })
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

  getCategoryOrder() {
    return WIBA_CATEGORY_ORDER_IDS
  },

  getCategoryPriorities() {
    return WIBA_CATEGORY_PRIORITIES
  },
}
