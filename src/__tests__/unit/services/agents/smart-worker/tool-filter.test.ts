import { describe, it, expect } from 'vitest'
import { matchesWhitelist, filterToolsByWhitelist } from '@/lib/services/agents/smart-worker/tool-filter'
import type { ToolDescriptor } from '@/lib/services/agents/tool-registry'

const mkTool = (raw: string): ToolDescriptor => ({
  ref: { namespace: raw.split(':')[0] as 'memory' | 'workflow' | 'prompt' | 'service' | 'agent', name: raw.split(':').slice(1).join(':'), raw },
  description: raw,
  inputSchema: { type: 'object' },
})

describe('matchesWhitelist', () => {
  it('exakter Match', () => {
    expect(matchesWhitelist('memory:search', ['memory:search'])).toBe(true)
  })

  it('Namespace-Wildcard memory:*', () => {
    expect(matchesWhitelist('memory:read', ['memory:*'])).toBe(true)
    expect(matchesWhitelist('workflow:foo', ['memory:*'])).toBe(false)
  })

  it('Praefix-Wildcard prompt:lead_*', () => {
    expect(matchesWhitelist('prompt:lead_research', ['prompt:lead_*'])).toBe(true)
    expect(matchesWhitelist('prompt:other', ['prompt:lead_*'])).toBe(false)
  })

  it('global-Wildcard *', () => {
    expect(matchesWhitelist('agent:writer', ['*'])).toBe(true)
  })

  it('Punkt im Pattern wird als Literal behandelt', () => {
    expect(matchesWhitelist('workflow:lead.created', ['workflow:lead.created'])).toBe(true)
    expect(matchesWhitelist('workflow:leadXcreated', ['workflow:lead.created'])).toBe(false)
  })

  it('mehrere Patterns — eines reicht', () => {
    expect(matchesWhitelist('memory:read', ['workflow:*', 'memory:read'])).toBe(true)
  })

  it('leere Whitelist => false', () => {
    expect(matchesWhitelist('memory:read', [])).toBe(false)
  })

  it('verhindert Recursive-agent-Aufrufe (agent:* explizit nicht in Whitelist)', () => {
    expect(matchesWhitelist('agent:writer', ['memory:*', 'prompt:*'])).toBe(false)
  })
})

describe('filterToolsByWhitelist', () => {
  it('filtert Tools nach Patterns', () => {
    const all = [mkTool('memory:search'), mkTool('memory:read'), mkTool('workflow:lead.created'), mkTool('agent:writer')]
    const filtered = filterToolsByWhitelist(all, ['memory:*', 'workflow:lead.*'])
    expect(filtered.map((t) => t.ref.raw).sort()).toEqual(['memory:read', 'memory:search', 'workflow:lead.created'])
  })

  it('leere Patterns => leeres Ergebnis', () => {
    const all = [mkTool('memory:search')]
    expect(filterToolsByWhitelist(all, [])).toEqual([])
  })
})
