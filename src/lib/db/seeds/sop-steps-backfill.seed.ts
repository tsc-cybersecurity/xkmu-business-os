// ============================================================
// SOP-Steps Backfill
// Quelle: process_tasks.steps (JSONB, Form: {nr, action, tool, hint})
// Ziel:   sop_steps (strukturiert)
// Verknuepfung: sop_documents.source_task_id ↔ process_tasks.task_key
//
// Idempotent: SOPs mit bereits vorhandenen sop_steps-Rows werden uebersprungen.
// ============================================================

import { db } from '@/lib/db'
import { sopDocuments, sopSteps, processTasks } from '@/lib/db/schema'
import { eq, isNotNull, isNull, and } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { mapJsonbStepsToSopSteps } from '@/lib/services/sop.service'

const MOD = 'SopStepsBackfill'

export async function seedSopStepsBackfill(opts?: { dryRun?: boolean }) {
  const dryRun = opts?.dryRun ?? false
  logger.info(`Backfill SOP-Steps gestartet${dryRun ? ' (dry-run)' : ''}`, { module: MOD })

  // 1) Alle SOPs mit sourceTaskId laden
  const sops = await db
    .select({
      id: sopDocuments.id,
      title: sopDocuments.title,
      sourceTaskId: sopDocuments.sourceTaskId,
    })
    .from(sopDocuments)
    .where(and(isNotNull(sopDocuments.sourceTaskId), isNull(sopDocuments.deletedAt)))

  logger.info(`${sops.length} SOPs mit sourceTaskId gefunden`, { module: MOD })

  let inserted = 0
  let skippedHasSteps = 0
  let skippedNoSourceSteps = 0
  let totalStepsCreated = 0

  for (const sop of sops) {
    // 2) Existierende sop_steps pruefen (Idempotenz)
    const existing = await db
      .select({ id: sopSteps.id })
      .from(sopSteps)
      .where(eq(sopSteps.sopId, sop.id))
      .limit(1)
    if (existing.length > 0) {
      skippedHasSteps++
      continue
    }

    // 3) Verknuepften process_task laden
    const [task] = await db
      .select({ steps: processTasks.steps })
      .from(processTasks)
      .where(eq(processTasks.taskKey, sop.sourceTaskId!))
      .limit(1)

    const rawSteps = Array.isArray(task?.steps) ? (task!.steps as unknown[]) : []
    if (rawSteps.length === 0) {
      skippedNoSourceSteps++
      continue
    }

    // 4) Mappen
    const mapped = mapJsonbStepsToSopSteps(sop.id, rawSteps as Parameters<typeof mapJsonbStepsToSopSteps>[1])
    if (mapped.length === 0) {
      skippedNoSourceSteps++
      continue
    }

    // 5) Insert (id wegwerfen — Drizzle generiert UUID)
    if (!dryRun) {
      await db.insert(sopSteps).values(
        mapped.map((m) => ({
          sopId: m.sopId,
          sequence: m.sequence,
          title: m.title,
          description: m.description,
          responsible: m.responsible,
          estimatedMinutes: m.estimatedMinutes,
          checklistItems: m.checklistItems,
          warnings: m.warnings,
          executor: m.executor,
        })),
      )
    }
    inserted++
    totalStepsCreated += mapped.length
  }

  logger.info(
    `Backfill abgeschlossen${dryRun ? ' (dry-run)' : ''}: ` +
      `${inserted} SOPs befuellt (${totalStepsCreated} Steps), ` +
      `${skippedHasSteps} hatten bereits Steps, ` +
      `${skippedNoSourceSteps} ohne Quelldaten`,
    { module: MOD },
  )

  return { inserted, skippedHasSteps, skippedNoSourceSteps, totalStepsCreated }
}

// CLI-Entry: npx tsx --env-file=.env src/lib/db/seeds/sop-steps-backfill.seed.ts [--dry-run]
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run')
  seedSopStepsBackfill({ dryRun })
    .then((r) => {
      console.log('Result:', r)
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
