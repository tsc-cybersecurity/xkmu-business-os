import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('evaluateCondition', () => {
  function load() {
    return import('@/lib/services/workflow/condition-parser').then(m => (m as any).evaluateCondition)
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

describe('boolean composition', () => {
  function load() {
    return import('@/lib/services/workflow/condition-parser').then(m => m.evaluateCondition)
  }
  function scope(triggerData: Record<string, unknown> = {}) {
    return { triggerData, actionResults: {} }
  }

  it('A && B both true', async () => {
    const fn = await load()
    expect(fn("data.a == 'x' && data.b == 'y'", scope({ a: 'x', b: 'y' }))).toBe(true)
  })

  it('A && B second false', async () => {
    const fn = await load()
    expect(fn("data.a == 'x' && data.b == 'y'", scope({ a: 'x', b: 'z' }))).toBe(false)
  })

  it('A || B first true', async () => {
    const fn = await load()
    expect(fn("data.a == 'x' || data.b == 'y'", scope({ a: 'x', b: 'z' }))).toBe(true)
  })

  it('A || B both false', async () => {
    const fn = await load()
    expect(fn("data.a == 'x' || data.b == 'y'", scope({ a: 'z', b: 'z' }))).toBe(false)
  })

  it('precedence: A && B || C parses as (A && B) || C', async () => {
    const fn = await load()
    // false && false || true == true
    expect(fn("data.a == 'x' && data.b == 'y' || data.c == 'z'", scope({ a: 'X', b: 'Y', c: 'z' }))).toBe(true)
  })

  it('precedence: A || B && C parses as A || (B && C)', async () => {
    const fn = await load()
    // false || (true && false) == false
    expect(fn("data.a == 'x' || data.b == 'y' && data.c == 'z'", scope({ a: 'X', b: 'y', c: 'X' }))).toBe(false)
  })

  it('parens override precedence: (A || B) && C', async () => {
    const fn = await load()
    expect(fn("(data.a == 'x' || data.b == 'y') && data.c == 'z'", scope({ a: 'x', b: 'X', c: 'z' }))).toBe(true)
    expect(fn("(data.a == 'x' || data.b == 'y') && data.c == 'z'", scope({ a: 'X', b: 'X', c: 'z' }))).toBe(false)
  })

  it('whitespace tolerant', async () => {
    const fn = await load()
    expect(fn("  data.a == 'x'   &&   data.b == 'y'  ", scope({ a: 'x', b: 'y' }))).toBe(true)
  })

  it('short-circuit && does not evaluate second on false', async () => {
    const fn = await load()
    expect(fn("data.x == 'no' && data.y >= 10", scope({ x: 'X', y: 'abc' }))).toBe(false)
  })

  it('short-circuit || does not evaluate second on true', async () => {
    const fn = await load()
    expect(fn("data.x == 'yes' || data.y >= 10", scope({ x: 'yes', y: 'abc' }))).toBe(true)
  })

  it('atom-only still works (backwards compat)', async () => {
    const fn = await load()
    expect(fn("data.a == 'x'", scope({ a: 'x' }))).toBe(true)
  })

  it('malformed expression defaults to true', async () => {
    const fn = await load()
    expect(fn("data.a && && data.b", scope({ a: 'x', b: 'y' }))).toBe(true)
    expect(fn("(data.a == 'x'", scope({ a: 'x' }))).toBe(true)
  })
})
