/**
 * Memory Frontmatter — gray-matter Wrapper mit Zod-Validation.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.2
 */

import matter from 'gray-matter'
import { z } from 'zod'
import type { ParaFolder } from './paths'

const PARA_VALUES = ['projects', 'areas', 'resources', 'archives'] as const
const STATUS_VALUES = ['active', 'superseded', 'archived'] as const

const UUID_LIKE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export const FrontmatterSchema = z.object({
  id: z.string().regex(UUID_LIKE, { message: 'id muss UUID-Format haben' }),
  title: z.string().optional(),
  para: z.enum(PARA_VALUES),
  scope: z.string().min(1),
  tags: z.array(z.string()).default([]),
  created: z.string().optional(),
  updated: z.string().optional(),
  status: z.enum(STATUS_VALUES).default('active'),
  sourceRunId: z.string().regex(UUID_LIKE).optional(),
  sourceStepId: z.string().regex(UUID_LIKE).optional(),
})

export type Frontmatter = z.infer<typeof FrontmatterSchema>

export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const parsed = matter(raw)
  const result = FrontmatterSchema.safeParse(parsed.data)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Frontmatter ungueltig: ${issues}`)
  }
  return { frontmatter: result.data, body: parsed.content }
}

export function stringifyFrontmatter(fm: Frontmatter, body: string): string {
  return matter.stringify(body, fm as Record<string, unknown>)
}

export function buildFrontmatter(input: {
  id: string
  title?: string
  para: ParaFolder
  scope: string
  tags?: string[]
  sourceRunId?: string
  sourceStepId?: string
  status?: typeof STATUS_VALUES[number]
}): Frontmatter {
  const now = new Date().toISOString().slice(0, 10)
  return FrontmatterSchema.parse({
    id: input.id,
    title: input.title,
    para: input.para,
    scope: input.scope,
    tags: input.tags ?? [],
    created: now,
    updated: now,
    status: input.status ?? 'active',
    sourceRunId: input.sourceRunId,
    sourceStepId: input.sourceStepId,
  })
}
