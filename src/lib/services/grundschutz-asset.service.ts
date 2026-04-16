/**
 * Grundschutz++ Asset Service
 * Verwaltung von Informationswerten (Assets): CRUD, Relationen, Control-Mappings, Schutzbedarf.
 */

import { db } from '@/lib/db'
import {
  grundschutzAssets, grundschutzAssetRelationsTable, grundschutzAssetControls,
  companies, users,
} from '@/lib/db/schema'
import type { GrundschutzAsset, GrundschutzAssetRelation, GrundschutzAssetControl } from '@/lib/db/schema'
import { eq, and, asc, desc, count, ilike, or, sql } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'

export interface CreateAssetInput {
  companyId: string
  name: string
  description?: string
  categoryType: string
  categoryName: string
  categoryUuid?: string
  vertraulichkeit?: string
  integritaet?: string
  verfuegbarkeit?: string
  schutzbedarfBegruendung?: string
  ownerId?: string
  status?: string
  location?: string
  tags?: string[]
  notes?: string
}

export type UpdateAssetInput = Partial<CreateAssetInput>

export interface CreateAssetRelationInput {
  sourceAssetId: string
  targetAssetId: string
  relationType: string
  notes?: string
}

export interface AssetControlMappingInput {
  controlId: string
  applicability?: string
  justification?: string
  implementationStatus?: string
  implementationNotes?: string
}

export interface AssetListFilters {
  categoryType?: string
  status?: string
  search?: string
}

export const GrundschutzAssetService = {
  /** Assets eines Unternehmens auflisten mit optionalen Filtern */
  async list(_tenantId: string, companyId: string, filters?: AssetListFilters) {
    const conditions = [
      eq(grundschutzAssets.companyId, companyId),
    ]

    if (filters?.categoryType) {
      conditions.push(eq(grundschutzAssets.categoryType, filters.categoryType))
    }
    if (filters?.status) {
      conditions.push(eq(grundschutzAssets.status, filters.status))
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(grundschutzAssets.name, `%${filters.search}%`),
          ilike(grundschutzAssets.description, `%${filters.search}%`),
        )!,
      )
    }

    const assets = await db.select({
      asset: grundschutzAssets,
      ownerFirstName: users.firstName,
      ownerLastName: users.lastName,
      ownerEmail: users.email,
    })
      .from(grundschutzAssets)
      .leftJoin(users, eq(grundschutzAssets.ownerId, users.id))
      .where(and(...conditions))
      .orderBy(asc(grundschutzAssets.categoryType), asc(grundschutzAssets.name))

    // Control-Counts pro Asset
    const controlCounts = await db.select({
      assetId: grundschutzAssetControls.assetId,
      count: count(),
    }).from(grundschutzAssetControls)
      .groupBy(grundschutzAssetControls.assetId)

    const countMap = new Map(controlCounts.map(c => [c.assetId, Number(c.count)]))

    return assets.map(a => ({
      ...a.asset,
      ownerName: a.ownerFirstName ? `${a.ownerFirstName} ${a.ownerLastName || ''}`.trim() : a.ownerEmail,
      controlCount: countMap.get(a.asset.id) || 0,
    }))
  },

  /** Einzelnes Asset mit Details, Relationen und Control-Mappings */
  async getById(_tenantId: string, assetId: string) {
    const [row] = await db.select({
      asset: grundschutzAssets,
      companyName: companies.name,
      ownerFirstName: users.firstName,
      ownerLastName: users.lastName,
      ownerEmail: users.email,
    })
      .from(grundschutzAssets)
      .leftJoin(companies, eq(grundschutzAssets.companyId, companies.id))
      .leftJoin(users, eq(grundschutzAssets.ownerId, users.id))
      .where(eq(grundschutzAssets.id, assetId))
      .limit(1)

    if (!row) return null

    // Relationen laden (bidirektional)
    const relations = await db.select()
      .from(grundschutzAssetRelationsTable)
      .where(
        or(
          eq(grundschutzAssetRelationsTable.sourceAssetId, assetId),
          eq(grundschutzAssetRelationsTable.targetAssetId, assetId),
        ),
      )

    // Zugehoerige Asset-IDs sammeln
    const relatedIds = new Set<string>()
    for (const r of relations) {
      if (r.sourceAssetId !== assetId) relatedIds.add(r.sourceAssetId)
      if (r.targetAssetId !== assetId) relatedIds.add(r.targetAssetId)
    }

    // Namen der verknuepften Assets laden
    const relatedAssets = relatedIds.size > 0
      ? await db.select({
          id: grundschutzAssets.id,
          name: grundschutzAssets.name,
          categoryType: grundschutzAssets.categoryType,
          categoryName: grundschutzAssets.categoryName,
        })
          .from(grundschutzAssets)
          .where(
            or(...Array.from(relatedIds).map(id => eq(grundschutzAssets.id, id)))!,
          )
      : []

    const assetMap = new Map(relatedAssets.map(a => [a.id, a]))

    const normalizedRelations = relations.map(r => {
      const isOutgoing = r.sourceAssetId === assetId
      const otherAssetId = isOutgoing ? r.targetAssetId : r.sourceAssetId
      const other = assetMap.get(otherAssetId)
      return {
        id: r.id,
        direction: isOutgoing ? 'outgoing' as const : 'incoming' as const,
        relationType: r.relationType,
        otherAssetId,
        otherAssetName: other?.name || null,
        otherAssetCategory: other?.categoryType || null,
        otherAssetCategoryName: other?.categoryName || null,
        notes: r.notes,
      }
    })

    // Control-Mappings laden
    const controlMappings = await db.select()
      .from(grundschutzAssetControls)
      .where(eq(grundschutzAssetControls.assetId, assetId))
      .orderBy(asc(grundschutzAssetControls.controlId))

    return {
      ...row.asset,
      companyName: row.companyName,
      ownerName: row.ownerFirstName ? `${row.ownerFirstName} ${row.ownerLastName || ''}`.trim() : row.ownerEmail,
      relations: normalizedRelations,
      controlMappings,
    }
  },

  /** Asset erstellen */
  async create(_tenantId: string, data: CreateAssetInput): Promise<GrundschutzAsset> {
    const [asset] = await db.insert(grundschutzAssets).values({
      tenantId: TENANT_ID,
      companyId: data.companyId,
      name: data.name,
      description: data.description || null,
      categoryType: data.categoryType,
      categoryName: data.categoryName,
      categoryUuid: data.categoryUuid || null,
      vertraulichkeit: data.vertraulichkeit || 'normal',
      integritaet: data.integritaet || 'normal',
      verfuegbarkeit: data.verfuegbarkeit || 'normal',
      schutzbedarfBegruendung: data.schutzbedarfBegruendung || null,
      ownerId: data.ownerId || null,
      status: data.status || 'active',
      location: data.location || null,
      tags: data.tags || [],
      notes: data.notes || null,
    }).returning()

    return asset
  },

  /** Asset aktualisieren */
  async update(_tenantId: string, assetId: string, data: UpdateAssetInput): Promise<GrundschutzAsset | null> {
    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (data.categoryType !== undefined) updates.categoryType = data.categoryType
    if (data.categoryName !== undefined) updates.categoryName = data.categoryName
    if (data.categoryUuid !== undefined) updates.categoryUuid = data.categoryUuid
    if (data.vertraulichkeit !== undefined) updates.vertraulichkeit = data.vertraulichkeit
    if (data.integritaet !== undefined) updates.integritaet = data.integritaet
    if (data.verfuegbarkeit !== undefined) updates.verfuegbarkeit = data.verfuegbarkeit
    if (data.schutzbedarfBegruendung !== undefined) updates.schutzbedarfBegruendung = data.schutzbedarfBegruendung
    if (data.ownerId !== undefined) updates.ownerId = data.ownerId
    if (data.status !== undefined) updates.status = data.status
    if (data.location !== undefined) updates.location = data.location
    if (data.tags !== undefined) updates.tags = data.tags
    if (data.notes !== undefined) updates.notes = data.notes

    const [asset] = await db.update(grundschutzAssets).set(updates)
      .where(eq(grundschutzAssets.id, assetId))
      .returning()

    return asset || null
  },

  /** Asset loeschen */
  async delete(_tenantId: string, assetId: string): Promise<boolean> {
    const result = await db.delete(grundschutzAssets)
      .where(eq(grundschutzAssets.id, assetId))
      .returning({ id: grundschutzAssets.id })
    return result.length > 0
  },

  /** Relation zwischen Assets erstellen */
  async createRelation(_tenantId: string, data: CreateAssetRelationInput): Promise<GrundschutzAssetRelation> {
    const [relation] = await db.insert(grundschutzAssetRelationsTable).values({
      tenantId: TENANT_ID,
      sourceAssetId: data.sourceAssetId,
      targetAssetId: data.targetAssetId,
      relationType: data.relationType,
      notes: data.notes || null,
    }).returning()

    return relation
  },

  /** Relation loeschen */
  async deleteRelation(_tenantId: string, relationId: string): Promise<boolean> {
    const result = await db.delete(grundschutzAssetRelationsTable)
      .where(eq(grundschutzAssetRelationsTable.id, relationId))
      .returning({ id: grundschutzAssetRelationsTable.id })
    return result.length > 0
  },

  /** Control-Mapping erstellen oder aktualisieren (Upsert) */
  async upsertControlMapping(_tenantId: string, assetId: string, data: AssetControlMappingInput): Promise<GrundschutzAssetControl> {
    // Pruefen ob Mapping existiert
    const [existing] = await db.select().from(grundschutzAssetControls)
      .where(and(
        eq(grundschutzAssetControls.assetId, assetId),
        eq(grundschutzAssetControls.controlId, data.controlId),
      )).limit(1)

    if (existing) {
      const [updated] = await db.update(grundschutzAssetControls).set({
        applicability: data.applicability !== undefined ? data.applicability : existing.applicability,
        justification: data.justification !== undefined ? data.justification : existing.justification,
        implementationStatus: data.implementationStatus !== undefined ? data.implementationStatus : existing.implementationStatus,
        implementationNotes: data.implementationNotes !== undefined ? data.implementationNotes : existing.implementationNotes,
        updatedAt: new Date(),
      }).where(eq(grundschutzAssetControls.id, existing.id)).returning()
      return updated
    }

    const [mapping] = await db.insert(grundschutzAssetControls).values({
      tenantId: TENANT_ID,
      assetId,
      controlId: data.controlId,
      applicability: data.applicability || 'applicable',
      justification: data.justification || null,
      implementationStatus: data.implementationStatus || 'offen',
      implementationNotes: data.implementationNotes || null,
    }).returning()

    return mapping
  },

  /** Schutzbedarf-Uebersicht: Aggregate pro Kategorie */
  async getSchutzbedarfOverview(_tenantId: string, companyId: string) {
    const assets = await db.select({
      categoryType: grundschutzAssets.categoryType,
      vertraulichkeit: grundschutzAssets.vertraulichkeit,
      integritaet: grundschutzAssets.integritaet,
      verfuegbarkeit: grundschutzAssets.verfuegbarkeit,
    })
      .from(grundschutzAssets)
      .where(eq(grundschutzAssets.companyId, companyId))

    const totalAssets = assets.length
    const hochValues = new Set(['hoch', 'sehr_hoch'])

    const categoryMap = new Map<string, { total: number; hochCount: number }>()

    for (const a of assets) {
      if (!categoryMap.has(a.categoryType)) {
        categoryMap.set(a.categoryType, { total: 0, hochCount: 0 })
      }
      const cat = categoryMap.get(a.categoryType)!
      cat.total++

      const isHoch = hochValues.has(a.vertraulichkeit || '') ||
        hochValues.has(a.integritaet || '') ||
        hochValues.has(a.verfuegbarkeit || '')
      if (isHoch) cat.hochCount++
    }

    const byCategory = Array.from(categoryMap.entries()).map(([categoryType, data]) => ({
      categoryType,
      total: data.total,
      hochCount: data.hochCount,
    }))

    return { totalAssets, byCategory }
  },
}
