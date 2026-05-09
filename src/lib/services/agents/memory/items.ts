/**
 * Memory Items — items.yaml Manipulation. Never-delete + supersede-Pattern.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.3
 */

import yaml from 'js-yaml'
import { z } from 'zod'

// JSON_SCHEMA verhindert automatisches Date-Parsing — Datums-Strings bleiben Strings
const yamlLoadOpts: yaml.LoadOptions = { schema: yaml.JSON_SCHEMA }

const STATUS_VALUES = ['active', 'superseded', 'archived'] as const

const ItemSchema = z.object({
  id: z.string().regex(/^f-\d{3,}$/, 'item id muss Format f-NNN haben'),
  fact: z.string().min(1),
  source: z.string().min(1),
  status: z.enum(STATUS_VALUES).default('active'),
  recordedAt: z.string().optional(),
  confidence: z.number().optional(),
  supersededBy: z.string().regex(/^f-\d{3,}$/).optional(),
  supersededAt: z.string().optional(),
})

export type MemoryItem = z.infer<typeof ItemSchema>

export interface AppendItemInput {
  fact: string
  source: string
  confidence?: number
}

export function parseItems(yamlText: string): MemoryItem[] {
  const trimmed = yamlText.trim()
  if (!trimmed) return []
  const data = yaml.load(trimmed, yamlLoadOpts)
  if (!Array.isArray(data)) {
    throw new Error('items.yaml: erwartet ein Array von Items')
  }
  return data.map((row, idx) => {
    const r = ItemSchema.safeParse(row)
    if (!r.success) {
      const issues = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new Error(`items.yaml[${idx}] ungueltig: ${issues}`)
    }
    return r.data
  })
}

export function stringifyItems(items: MemoryItem[]): string {
  return yaml.dump(items, { lineWidth: 200, noRefs: true })
}

function nextItemId(items: MemoryItem[]): string {
  const max = items.reduce((acc, it) => {
    const m = /^f-(\d+)$/.exec(it.id)
    if (!m) return acc
    return Math.max(acc, Number(m[1]))
  }, 0)
  return `f-${String(max + 1).padStart(3, '0')}`
}

export function appendItem(items: MemoryItem[], input: AppendItemInput): MemoryItem[] {
  const today = new Date().toISOString().slice(0, 10)
  return [
    ...items,
    {
      id: nextItemId(items),
      fact: input.fact,
      source: input.source,
      status: 'active',
      recordedAt: today,
      confidence: input.confidence,
    },
  ]
}

export function supersedeItem(
  items: MemoryItem[],
  itemId: string,
  replacement: AppendItemInput,
): MemoryItem[] {
  const idx = items.findIndex((i) => i.id === itemId)
  if (idx < 0) throw new Error(`Item ${itemId} nicht gefunden`)
  const today = new Date().toISOString().slice(0, 10)
  const newId = nextItemId(items)
  const updatedOld: MemoryItem = {
    ...items[idx],
    status: 'superseded',
    supersededBy: newId,
    supersededAt: today,
  }
  const newItem: MemoryItem = {
    id: newId,
    fact: replacement.fact,
    source: replacement.source,
    status: 'active',
    recordedAt: today,
    confidence: replacement.confidence,
  }
  return [...items.slice(0, idx), updatedOld, ...items.slice(idx + 1), newItem]
}
