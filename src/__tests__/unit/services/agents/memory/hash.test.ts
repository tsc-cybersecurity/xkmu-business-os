import { describe, it, expect } from 'vitest'
import { computeContentHash } from '@/lib/services/agents/memory/hash'

describe('Memory Hash', () => {
  it('liefert deterministischen SHA-256 hex-string laenge 64', () => {
    const h = computeContentHash('hello')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[0-9a-f]+$/)
  })
  it('gleicher Input -> gleicher Hash', () => {
    expect(computeContentHash('foo')).toBe(computeContentHash('foo'))
  })
  it('unterschiedlicher Input -> unterschiedliche Hashes', () => {
    expect(computeContentHash('foo')).not.toBe(computeContentHash('bar'))
  })
  it('normalisiert Line-Endings (CRLF == LF)', () => {
    expect(computeContentHash('a\r\nb')).toBe(computeContentHash('a\nb'))
  })
})
