/**
 * Next.js instrumentation hook.
 *
 * Runs once when the server starts (both dev and production). We use this to
 * boot an in-process cron ticker that calls CronService.tick() every minute.
 *
 * Why in-process instead of OS crond:
 *   - node:20-alpine has no crond binary by default (neither dcron nor
 *     busybox-suid are installed).
 *   - Running a background daemon before `exec su-exec nextjs node server.js`
 *     leaves it orphaned and fragile.
 *   - An in-process setInterval uses the same DB connection pool, the same
 *     logger, the same everything — much simpler to reason about.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run in the Node.js runtime — never during edge runtime or build.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Skip while Next.js is building (no server yet, DB not reachable).
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  // HMR guard: in dev mode `register()` may be called on every reload.
  // Store a single global handle so we don't start multiple intervals.
  const globalAny = globalThis as unknown as {
    __xkmuCronTickerStarted?: boolean
    __xkmuCronTickerHandle?: NodeJS.Timeout
  }

  if (globalAny.__xkmuCronTickerStarted) {
    return
  }
  globalAny.__xkmuCronTickerStarted = true

  // Dynamic import so this file stays lightweight and schema/db modules are
  // only loaded at runtime (not during build analysis).
  const { CronService } = await import('@/lib/services/cron.service')
  const { logger } = await import('@/lib/utils/logger')

  // Auto-Migration: pendende SQL-Migrationen ausfuehren
  try {
    const { runPendingMigrations } = await import('@/lib/db/migrator')
    const result = await runPendingMigrations()
    if (result.executed > 0) {
      logger.info(`${result.executed} Migration(en) beim Start ausgefuehrt`, { module: 'Startup' })
    }
  } catch (err) {
    logger.error('Auto-Migration Fehler (App startet trotzdem)', err, { module: 'Startup' })
  }

  // Boot-time check: APPOINTMENT_TOKEN_SECRET. Soft-warn instead of hard-fail
  // — apps that don't use the booking feature should still boot.
  const apptSecret = process.env.APPOINTMENT_TOKEN_SECRET
  if (!apptSecret || apptSecret.length < 32) {
    logger.warn(
      'APPOINTMENT_TOKEN_SECRET fehlt oder ist zu kurz (<32 Zeichen). ' +
        'Bestaetigungsmails fuer Termine koennen keine Storno-/Umbuchungs-Links enthalten — Buchungen werden trotzdem akzeptiert, ' +
        'aber Customer-Self-Service-Aktionen (Cancel/Reschedule) schlagen fehl, bis das Secret gesetzt ist.',
      { module: 'Startup' },
    )
  }

  logger.info('In-process cron ticker starting (60s interval)', { module: 'CronTicker' })

  // Stagger the first tick by 30s so we don't race with startup migrations.
  const FIRST_TICK_DELAY_MS = 30_000
  const TICK_INTERVAL_MS = 60_000

  const runTick = async () => {
    try {
      await CronService.tick()
    } catch (err) {
      logger.error('Cron ticker error', err, { module: 'CronTicker' })
    }
  }

  setTimeout(() => {
    void runTick()
    const handle = setInterval(() => void runTick(), TICK_INTERVAL_MS)
    globalAny.__xkmuCronTickerHandle = handle
    // Don't keep the event loop alive just for this interval — if the server
    // is shutting down, let it shut down.
    if (typeof handle.unref === 'function') handle.unref()
  }, FIRST_TICK_DELAY_MS)
}
