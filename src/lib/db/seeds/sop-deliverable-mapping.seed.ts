// ============================================================
// SOP <-> Deliverable Mapping Apply
// Quelle: temp/sop-deliverable-mapping-ai-raw.json (Gemini-Output)
// Ziel:   sop_documents.produces_deliverable_id setzen
//
// Apply-Regeln:
//   - nur rank=1 + confidence=high
//   - SOP muss aktuell unverknuepft sein (idempotent)
//   - --dry-run unterstuetzt
// ============================================================

import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from '@/lib/db'
import { sopDocuments, deliverables } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const MOD = 'SopDeliverableApply'

type AiMatch = { deliverable_id: string; confidence: 'high' | 'medium' | 'low'; reason: string }
type AiEntry = { sop_id: string; matches: AiMatch[] }

export async function seedSopDeliverableMapping(opts?: { dryRun?: boolean; jsonPath?: string }) {
  const dryRun = opts?.dryRun ?? false
  const jsonPath = opts?.jsonPath ?? join(process.cwd(), 'temp', 'sop-deliverable-mapping-ai-raw.json')

  logger.info(`Apply SOP-Deliverable-Mappings${dryRun ? ' (dry-run)' : ''}`, { module: MOD })

  const raw = readFileSync(jsonPath, 'utf-8')
  const entries: AiEntry[] = JSON.parse(raw)
  logger.info(`${entries.length} AI-Mapping-Eintraege geladen aus ${jsonPath}`, { module: MOD })

  // Sanity-Check: Deliverable-IDs validieren
  const allDelIds = new Set((await db.select({ id: deliverables.id }).from(deliverables)).map((d) => d.id))

  let applied = 0
  let skippedNoHigh = 0
  let skippedAlreadyLinked = 0
  let skippedSopMissing = 0
  let skippedDeliverableMissing = 0

  for (const e of entries) {
    const top = e.matches?.[0]
    if (!top || top.confidence !== 'high') {
      skippedNoHigh++
      continue
    }
    if (!allDelIds.has(top.deliverable_id)) {
      skippedDeliverableMissing++
      logger.warn(`Deliverable nicht gefunden: ${top.deliverable_id} (SOP ${e.sop_id})`, { module: MOD })
      continue
    }

    // SOP laden + check ob unverknuepft
    const [sop] = await db
      .select({ id: sopDocuments.id, title: sopDocuments.title, current: sopDocuments.producesDeliverableId })
      .from(sopDocuments)
      .where(and(eq(sopDocuments.id, e.sop_id), isNull(sopDocuments.deletedAt)))
      .limit(1)

    if (!sop) {
      skippedSopMissing++
      continue
    }
    if (sop.current) {
      skippedAlreadyLinked++
      continue
    }

    if (dryRun) {
      logger.info(`[dry-run] ${sop.title} -> ${top.deliverable_id} (${top.reason})`, { module: MOD })
    } else {
      await db
        .update(sopDocuments)
        .set({ producesDeliverableId: top.deliverable_id, updatedAt: new Date() })
        .where(eq(sopDocuments.id, sop.id))
    }
    applied++
  }

  const result = { applied, skippedNoHigh, skippedAlreadyLinked, skippedSopMissing, skippedDeliverableMissing }
  logger.info(
    `Apply abgeschlossen${dryRun ? ' (dry-run)' : ''}: ${applied} verknuepft, ` +
      `${skippedNoHigh} nicht-high, ${skippedAlreadyLinked} bereits verknuepft, ` +
      `${skippedSopMissing} SOPs fehlen, ${skippedDeliverableMissing} Deliverables fehlen`,
    { module: MOD },
  )
  return result
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run')
  seedSopDeliverableMapping({ dryRun })
    .then((r) => {
      console.log('Result:', r)
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
