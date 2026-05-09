import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { parseOrchestratorJson } from '@/lib/services/agents/orchestrator/json-parser'

const TestSchema = z.object({ action: z.string(), count: z.number() })

describe('Orchestrator JSON-Parser', () => {
  it('parst reines JSON', () => {
    const r = parseOrchestratorJson('{"action":"continue","count":3}', TestSchema)
    expect(r).toEqual({ action: 'continue', count: 3 })
  })

  it('parst JSON aus Markdown-Code-Block ```json', () => {
    const input = '```json\n{"action":"goal_complete","count":0}\n```'
    const r = parseOrchestratorJson(input, TestSchema)
    expect(r.action).toBe('goal_complete')
  })

  it('parst JSON aus Markdown-Code-Block ohne language-tag', () => {
    const input = '```\n{"action":"pause","count":1}\n```'
    const r = parseOrchestratorJson(input, TestSchema)
    expect(r.action).toBe('pause')
  })

  it('extrahiert JSON aus gemischtem Text', () => {
    const input = 'Hier ist mein Plan:\n{"action":"continue","count":2}\nLgr,\nLLM'
    const r = parseOrchestratorJson(input, TestSchema)
    expect(r.action).toBe('continue')
    expect(r.count).toBe(2)
  })

  it('wirft bei nicht-parsebarem Input', () => {
    expect(() => parseOrchestratorJson('keine JSON hier', TestSchema)).toThrow(/JSON/)
  })

  it('wirft bei Schema-Violation', () => {
    expect(() => parseOrchestratorJson('{"action":"x","count":"not-a-number"}', TestSchema)).toThrow()
  })

  it('parst tief-verschachtelte JSON mit Klammer-Matching', () => {
    const input = '{"action":"continue","count":5,"nested":{"deep":{"value":1}}}'
    const Schema = z.object({ action: z.string(), count: z.number(), nested: z.object({ deep: z.object({ value: z.number() }) }) })
    const r = parseOrchestratorJson(input, Schema)
    expect(r.nested.deep.value).toBe(1)
  })
})
