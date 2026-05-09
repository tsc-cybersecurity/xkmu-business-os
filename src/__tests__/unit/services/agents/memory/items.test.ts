import { describe, it, expect } from 'vitest'
import {
  parseItems, stringifyItems, supersedeItem, appendItem,
} from '@/lib/services/agents/memory/items'

const SAMPLE = `- id: f-001
  fact: "Lisa Weber ist CMO"
  source: "agent_run_abc step research"
  status: active
  recordedAt: 2026-05-08
  confidence: 0.9
- id: f-002
  fact: "Tom Schmidt ist CEO"
  source: "user_input"
  status: superseded
  supersededBy: f-003
  supersededAt: 2026-05-09
- id: f-003
  fact: "Max Mueller ist CEO"
  source: "agent_run_def"
  status: active
  recordedAt: 2026-05-09
`

describe('Memory Items', () => {
  it('parseItems liest 3 Eintraege', () => {
    const items = parseItems(SAMPLE)
    expect(items).toHaveLength(3)
    expect(items[1].status).toBe('superseded')
    expect(items[1].supersededBy).toBe('f-003')
  })
  it('stringifyItems Round-Trip', () => {
    const items = parseItems(SAMPLE)
    const round = parseItems(stringifyItems(items))
    expect(round).toEqual(items)
  })
  it('appendItem fuegt mit auto-id hinzu', () => {
    const items = parseItems(SAMPLE)
    const next = appendItem(items, { fact: 'Neuer Fakt', source: 'agent_run_xyz' })
    expect(next).toHaveLength(4)
    expect(next[3].id).toMatch(/^f-\d{3}$/)
    expect(next[3].status).toBe('active')
  })
  it('supersedeItem markiert alt + erstellt neu', () => {
    const items = parseItems(SAMPLE)
    const next = supersedeItem(items, 'f-001', { fact: 'Lisa Weber wurde COO', source: 'manual' })
    const oldOne = next.find((i) => i.id === 'f-001')!
    expect(oldOne.status).toBe('superseded')
    const newOne = next.find((i) => i.id === oldOne.supersededBy)!
    expect(newOne.status).toBe('active')
    expect(newOne.fact).toBe('Lisa Weber wurde COO')
  })
  it('supersedeItem wirft bei unbekannter id', () => {
    const items = parseItems(SAMPLE)
    expect(() => supersedeItem(items, 'f-999', { fact: 'x', source: 'y' })).toThrow(/nicht gefunden/)
  })
  it('parseItems liefert leeres Array bei leerem Input', () => {
    expect(parseItems('')).toEqual([])
    expect(parseItems('\n')).toEqual([])
  })
})
