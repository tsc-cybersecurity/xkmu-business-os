/**
 * Grundschutz++ Catalog Service
 * Importiert und verwaltet den BSI OSCAL-Katalog von GitHub.
 */

import { db } from '@/lib/db'
import { grundschutzGroups, grundschutzControls, grundschutzCatalogMeta } from '@/lib/db/schema'
import { eq, asc, count, ilike, and } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const CATALOG_URL = 'https://raw.githubusercontent.com/BSI-Bund/Stand-der-Technik-Bibliothek/main/Anwenderkataloge/Grundschutz%2B%2B/Grundschutz%2B%2B-catalog.json'

interface OscalControl {
  id: string
  class?: string
  title: string
  params?: Array<{ id: string; label?: string; values?: string[] }>
  props?: Array<{ name: string; value: string }>
  parts?: Array<{ name: string; prose?: string }>
}

interface OscalGroup {
  id: string
  title: string
  groups?: OscalGroup[]
  controls?: OscalControl[]
}

function extractProp(ctrl: OscalControl, name: string): string | undefined {
  return ctrl.props?.find(p => p.name === name)?.value
}

function extractStatement(ctrl: OscalControl): string {
  const part = ctrl.parts?.find(p => p.name === 'statement')
  let text = part?.prose || ''
  // Parameter-Platzhalter ersetzen
  if (ctrl.params) {
    for (const param of ctrl.params) {
      const val = param.values?.[0] || param.label || param.id
      text = text.replace(`{{ insert: param, ${param.id} }}`, val)
    }
  }
  return text
}

export const GrundschutzCatalogService = {
  /**
   * Katalog von GitHub laden und in DB importieren.
   * Loescht vorherige Daten und importiert komplett neu.
   */
  async importFromGitHub(): Promise<{ groups: number; controls: number; version: string }> {
    logger.info('Importing Grundschutz++ catalog from GitHub...', { module: 'GrundschutzCatalog' })

    const response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`GitHub fetch failed: ${response.status}`)

    const data = await response.json()
    const catalog = data.catalog
    if (!catalog) throw new Error('Invalid OSCAL catalog format')

    const meta = catalog.metadata || {}
    const oscalGroups: OscalGroup[] = catalog.groups || []

    // Alle Gruppen und Controls sammeln
    const groupRows: Array<{ id: string; title: string; parentId: string | null; sortOrder: number }> = []
    const controlRows: Array<{
      id: string; groupId: string; title: string; statement: string | null
      secLevel: string | null; effortLevel: string | null; tags: string[]
      oscalClass: string | null; params: unknown; sortOrder: number
    }> = []

    let groupOrder = 0
    let controlOrder = 0

    function processGroup(group: OscalGroup, parentId: string | null) {
      groupRows.push({ id: group.id, title: group.title, parentId, sortOrder: groupOrder++ })

      // Controls direkt in der Gruppe (inkl. Sub-Controls/Enhancements)
      function processControl(ctrl: OscalControl, gid: string) {
        const tagsRaw = extractProp(ctrl, 'tags')
        controlRows.push({
          id: ctrl.id,
          groupId: gid,
          title: ctrl.title,
          statement: extractStatement(ctrl) || null,
          secLevel: extractProp(ctrl, 'sec_level') || null,
          effortLevel: extractProp(ctrl, 'effort_level') || null,
          tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [],
          oscalClass: ctrl.class || null,
          params: ctrl.params || [],
          sortOrder: controlOrder++,
        })
        // Sub-Controls (Enhancements) rekursiv
        for (const sub of (ctrl as any).controls || []) {
          processControl(sub, gid)
        }
      }
      for (const ctrl of group.controls || []) {
        processControl(ctrl, group.id)
      }

      // Untergruppen
      for (const sub of group.groups || []) {
        processGroup(sub, group.id)
      }
    }

    for (const g of oscalGroups) {
      processGroup(g, null)
    }

    // Alles in einer Transaktion ersetzen
    await db.transaction(async (tx) => {
      // Alte Daten loeschen
      await tx.delete(grundschutzControls)
      await tx.delete(grundschutzGroups)

      // Gruppen einfuegen
      if (groupRows.length > 0) {
        await tx.insert(grundschutzGroups).values(groupRows)
      }

      // Controls in Batches einfuegen (max 100 pro INSERT)
      for (let i = 0; i < controlRows.length; i += 100) {
        const batch = controlRows.slice(i, i + 100)
        await tx.insert(grundschutzControls).values(batch)
      }

      // Meta aktualisieren
      await tx.delete(grundschutzCatalogMeta)
      await tx.insert(grundschutzCatalogMeta).values({
        id: 'current',
        catalogUuid: catalog.uuid || null,
        title: meta.title || 'Grundschutz++',
        version: meta.version || null,
        lastModified: meta['last-modified'] || null,
        oscalVersion: meta['oscal-version'] || null,
        totalGroups: groupRows.length,
        totalControls: controlRows.length,
        importedAt: new Date(),
        sourceUrl: CATALOG_URL,
      })
    })

    logger.info(`Grundschutz++ imported: ${groupRows.length} groups, ${controlRows.length} controls`, { module: 'GrundschutzCatalog' })

    return {
      groups: groupRows.length,
      controls: controlRows.length,
      version: meta.version || meta['last-modified'] || 'unknown',
    }
  },

  /** Katalog-Metadaten abrufen */
  async getMeta() {
    const [meta] = await db.select().from(grundschutzCatalogMeta).where(eq(grundschutzCatalogMeta.id, 'current')).limit(1)
    return meta || null
  },

  /** Alle Top-Level-Gruppen mit Control-Count */
  async listGroups() {
    const groups = await db.select().from(grundschutzGroups).orderBy(asc(grundschutzGroups.sortOrder))

    // Control-Counts pro Gruppe (inkl. Untergruppen)
    const counts = await db
      .select({ groupId: grundschutzControls.groupId, count: count() })
      .from(grundschutzControls)
      .groupBy(grundschutzControls.groupId)

    const countMap = new Map(counts.map(c => [c.groupId, Number(c.count)]))

    // Top-Level-Gruppen mit aggregierten Counts
    const topGroups = groups.filter(g => !g.parentId)
    const subGroups = groups.filter(g => g.parentId)

    return topGroups.map(g => {
      const subs = subGroups.filter(s => s.parentId === g.id)
      const directCount = countMap.get(g.id) || 0
      const subCount = subs.reduce((sum, s) => sum + (countMap.get(s.id) || 0), 0)
      return {
        ...g,
        controlCount: directCount + subCount,
        subgroups: subs.map(s => ({ ...s, controlCount: countMap.get(s.id) || 0 })),
      }
    })
  },

  /** Controls einer Gruppe (inkl. Untergruppen) mit Filter */
  async listControls(groupId: string, filters?: { secLevel?: string; search?: string }) {
    // Alle Untergruppen-IDs finden
    const subGroups = await db.select({ id: grundschutzGroups.id }).from(grundschutzGroups)
      .where(eq(grundschutzGroups.parentId, groupId))
    const groupIds = [groupId, ...subGroups.map(s => s.id)]

    let query = db.select().from(grundschutzControls)
      .where(
        and(
          // groupId IN (...)
          groupIds.length === 1
            ? eq(grundschutzControls.groupId, groupId)
            : undefined, // Drizzle hat kein einfaches IN — Workaround unten
          filters?.secLevel ? eq(grundschutzControls.secLevel, filters.secLevel) : undefined,
          filters?.search ? ilike(grundschutzControls.title, `%${filters.search}%`) : undefined,
        )
      )
      .orderBy(asc(grundschutzControls.sortOrder))

    // Manuelles Filtern nach groupIds wenn mehr als eine
    const all = await query
    if (groupIds.length > 1) {
      const idSet = new Set(groupIds)
      return all.filter(c => idSet.has(c.groupId))
    }
    return all
  },

  /** Einzelnen Control abrufen */
  async getControl(controlId: string) {
    const [ctrl] = await db.select().from(grundschutzControls)
      .where(eq(grundschutzControls.id, controlId)).limit(1)
    return ctrl || null
  },

  /** Prüfe ob Update verfügbar (vergleiche GitHub-Version mit DB) */
  async checkForUpdate(): Promise<{ updateAvailable: boolean; currentVersion: string | null; remoteVersion: string | null }> {
    const meta = await this.getMeta()
    try {
      const response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(10_000) })
      if (!response.ok) return { updateAvailable: false, currentVersion: meta?.lastModified || null, remoteVersion: null }
      const data = await response.json()
      const remoteMod = data.catalog?.metadata?.['last-modified'] || null
      return {
        updateAvailable: !meta || meta.lastModified !== remoteMod,
        currentVersion: meta?.lastModified || null,
        remoteVersion: remoteMod,
      }
    } catch {
      return { updateAvailable: false, currentVersion: meta?.lastModified || null, remoteVersion: null }
    }
  },
}
