import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('evaluateCondition', () => {
  function load() {
    return import('@/lib/services/workflow/engine').then(m => (m as any).evaluateCondition)
  }

  function scope(triggerData: Record<string, unknown> = {}, actionResults: Record<string, unknown> = {}) {
    return { triggerData, actionResults }
  }

  it('empty/whitespace condition returns true', async () => {
    const fn = await load()
    expect(fn('', scope())).toBe(true)
    expect(fn('   ', scope())).toBe(true)
  })

  it('data.field truthy/falsy', async () => {
    const fn = await load()
    expect(fn('data.email', scope({ email: 'x@y.de' }))).toBe(true)
    expect(fn('data.email', scope({ email: '' }))).toBe(false)
    expect(fn('data.email', scope({}))).toBe(false)
    expect(fn('data.tags', scope({ tags: ['a'] }))).toBe(true)
    expect(fn('data.tags', scope({ tags: [] }))).toBe(false)
  })

  it('data.field == null / != null', async () => {
    const fn = await load()
    expect(fn('data.x == null', scope({ x: null }))).toBe(true)
    expect(fn('data.x == null', scope({ x: '' }))).toBe(true)
    expect(fn('data.x == null', scope({ x: 'value' }))).toBe(false)
    expect(fn('data.x != null', scope({ x: 'value' }))).toBe(true)
    expect(fn('data.x != null', scope({}))).toBe(false)
  })

  it("data.field == 'value' / != 'value'", async () => {
    const fn = await load()
    expect(fn("data.priority == 'hoch'", scope({ priority: 'hoch' }))).toBe(true)
    expect(fn("data.priority == 'hoch'", scope({ priority: 'mittel' }))).toBe(false)
    expect(fn("data.priority != 'hoch'", scope({ priority: 'mittel' }))).toBe(true)
  })

  it('numerical operators ==, !=, >, >=, <, <=', async () => {
    const fn = await load()
    expect(fn('data.score == 80', scope({ score: 80 }))).toBe(true)
    expect(fn('data.score != 80', scope({ score: 90 }))).toBe(true)
    expect(fn('data.score > 80', scope({ score: 90 }))).toBe(true)
    expect(fn('data.score >= 80', scope({ score: 80 }))).toBe(true)
    expect(fn('data.score < 80', scope({ score: 79 }))).toBe(true)
    expect(fn('data.score <= 80', scope({ score: 80 }))).toBe(true)
    expect(fn('data.score < 80', scope({ score: 80 }))).toBe(false)
  })

  it('numeric operator returns false on non-numeric value', async () => {
    const fn = await load()
    expect(fn('data.score >= 80', scope({ score: 'abc' }))).toBe(false)
  })

  it('steps.<id>.<field> truthy + nested paths', async () => {
    const fn = await load()
    const s = scope({}, { score_lead: { score: 42 }, webhook_x: { status: 200, body: { ok: true } } })
    expect(fn('steps.score_lead.score', s)).toBe(true)
    expect(fn('steps.webhook_x.body.ok', s)).toBe(true)
    expect(fn('steps.missing.field', s)).toBe(false)
  })

  it('steps.<id>.<field> with operators', async () => {
    const fn = await load()
    const s = scope({}, { webhook_x: { status: 200, body: { code: 'OK' } } })
    expect(fn('steps.webhook_x.status == 200', s)).toBe(true)
    expect(fn('steps.webhook_x.status >= 400', s)).toBe(false)
    expect(fn("steps.webhook_x.body.code == 'OK'", s)).toBe(true)
  })

  it('unknown format returns true (default execute)', async () => {
    const fn = await load()
    expect(fn('weird.format == foo', scope())).toBe(true)
    expect(fn('foo bar baz', scope())).toBe(true)
  })
})
