import { describe, it, expect } from 'vitest'
import { parseFrontmatter, stringifyFrontmatter } from '@/lib/services/agents/memory/frontmatter'

const SAMPLE = `---
id: 11111111-1111-1111-1111-111111111111
title: "Test"
para: projects
scope: projects/test
tags: [foo, bar]
status: active
---
# Test
Body hier.`

describe('Memory Frontmatter', () => {
  it('parst gueltige Frontmatter und Body', () => {
    const r = parseFrontmatter(SAMPLE)
    expect(r.frontmatter.id).toBe('11111111-1111-1111-1111-111111111111')
    expect(r.frontmatter.title).toBe('Test')
    expect(r.frontmatter.para).toBe('projects')
    expect(r.frontmatter.tags).toEqual(['foo', 'bar'])
    expect(r.frontmatter.status).toBe('active')
    expect(r.body.trim()).toBe('# Test\nBody hier.')
  })
  it('wirft bei fehlender id', () => {
    const broken = SAMPLE.replace(/^id: .*\n/m, '')
    expect(() => parseFrontmatter(broken)).toThrow(/id/)
  })
  it('wirft bei unbekanntem PARA', () => {
    const broken = SAMPLE.replace('para: projects', 'para: invalid')
    expect(() => parseFrontmatter(broken)).toThrow(/para/)
  })
  it('wirft bei unbekanntem status', () => {
    const broken = SAMPLE.replace('status: active', 'status: weird')
    expect(() => parseFrontmatter(broken)).toThrow(/status/)
  })
  it('stringifyFrontmatter Round-Trip', () => {
    const r = parseFrontmatter(SAMPLE)
    const out = stringifyFrontmatter(r.frontmatter, r.body)
    const round = parseFrontmatter(out)
    expect(round.frontmatter).toEqual(r.frontmatter)
  })
  it('default tags wenn Feld fehlt', () => {
    const noTags = SAMPLE.replace('tags: [foo, bar]\n', '')
    const r = parseFrontmatter(noTags)
    expect(r.frontmatter.tags).toEqual([])
  })
})
