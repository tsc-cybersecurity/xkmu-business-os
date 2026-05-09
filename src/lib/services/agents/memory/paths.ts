/**
 * Memory-Paths — Pfad-Konstanten und Helpers fuer das PARA-Markdown-Layout.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.1
 */

import path from 'node:path'

const PARA_FOLDERS = ['projects', 'areas', 'resources', 'archives'] as const
export type ParaFolder = typeof PARA_FOLDERS[number]

export function getMemoryRoot(): string {
  const env = process.env.AGENT_MEMORY_DIR
  if (env && env.trim().length > 0) return env
  return path.resolve(process.cwd(), 'data', 'agent-memory')
}

export function scopeToDir(scope: string): string {
  return path.posix.join(getMemoryRoot().replace(/\\/g, '/'), scope)
}

export function scopeToFilePath(scope: string, filename: 'summary.md' | 'items.yaml'): string {
  return path.posix.join(scopeToDir(scope), filename)
}

export function parseScope(scope: string): { para: ParaFolder; remainder: string } {
  const normalized = scope.replace(/\\/g, '/')
  const slash = normalized.indexOf('/')
  if (slash < 0) {
    if ((PARA_FOLDERS as readonly string[]).includes(normalized)) {
      return { para: normalized as ParaFolder, remainder: '' }
    }
    throw new Error(`Unbekannte PARA-Kategorie in scope='${scope}'`)
  }
  const para = normalized.slice(0, slash)
  if (!(PARA_FOLDERS as readonly string[]).includes(para)) {
    throw new Error(`Unbekannte PARA-Kategorie in scope='${scope}'`)
  }
  return { para: para as ParaFolder, remainder: normalized.slice(slash + 1) }
}

export function isPathInsideMemoryRoot(absolutePath: string): boolean {
  const root = path.resolve(getMemoryRoot())
  const target = path.resolve(absolutePath)
  const rel = path.relative(root, target)
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

export const PARA_FOLDER_LIST = PARA_FOLDERS
