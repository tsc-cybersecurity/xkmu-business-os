/**
 * Memory File-Watcher — chokidar-basiert.
 * Erkennt externe Edits unter dem Memory-Root und triggert Re-Index via
 * MemoryService.write. Im Re-Index-Pfad sorgt der ContentHash-Check dafuer,
 * dass unveraenderte Files keinen Embedding-Call ausloesen.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.4
 */

import { logger } from '@/lib/utils/logger'
import { getMemoryRoot, isPathInsideMemoryRoot, parseScope } from './paths'
import { parseFrontmatter } from './frontmatter'
import { MemoryService } from '../memory.service'
import path from 'node:path'
import fs from 'node:fs/promises'

let activeWatcher: { close: () => Promise<void> } | null = null

export async function startMemoryWatcher(): Promise<void> {
  if (activeWatcher) return
  if (process.env.AGENT_MEMORY_WATCHER_DISABLED === '1') {
    logger.info('Memory-Watcher deaktiviert (AGENT_MEMORY_WATCHER_DISABLED=1)', { module: 'MemoryWatcher' })
    return
  }
  const root = getMemoryRoot()
  try {
    await fs.mkdir(root, { recursive: true })
  } catch {
    // ignore
  }
  const chokidar = await import('chokidar')
  const watcher = chokidar.watch(`${root}/**/summary.md`, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
    // chokidar v5: `ignored` muss Function oder RegExp sein (keine Glob-Arrays mehr).
    // Matched Pfade, die `_runs/`, `.git/` enthalten oder auf `.tmp` enden — inkl. Windows-Backslashes.
    ignored: (filePath: string) => /(\/|\\)_runs(\/|\\)|(\/|\\)\.git(\/|\\)|\.tmp$/.test(filePath),
  })

  const reindex = async (filePath: string) => {
    try {
      if (!isPathInsideMemoryRoot(filePath)) return
      const raw = await fs.readFile(filePath, 'utf8')
      const { frontmatter, body } = parseFrontmatter(raw)
      parseScope(frontmatter.scope) // validates
      await MemoryService.write(frontmatter.scope, body)
      logger.info(`Re-indexed: ${path.relative(root, filePath)}`, { module: 'MemoryWatcher' })
    } catch (e) {
      logger.warn(`Re-index Fehler fuer ${filePath}: ${(e as Error).message}`, { module: 'MemoryWatcher' })
    }
  }

  watcher.on('add', reindex)
  watcher.on('change', reindex)
  watcher.on('error', (err) => {
    logger.error('MemoryWatcher Error', err as Error, { module: 'MemoryWatcher' })
  })

  activeWatcher = { close: () => watcher.close() }
  logger.info(`MemoryWatcher gestartet auf ${root}`, { module: 'MemoryWatcher' })
}

export async function stopMemoryWatcher(): Promise<void> {
  if (!activeWatcher) return
  await activeWatcher.close()
  activeWatcher = null
}
