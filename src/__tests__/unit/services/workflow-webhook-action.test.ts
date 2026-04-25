import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAction } from '@/lib/services/workflow'

describe('webhook_call action', () => {
  beforeEach(() => {
    vi.useRealTimers()
    global.fetch = vi.fn() as any
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function getWebhook() {
    const def = getAction('webhook_call')
    if (!def) throw new Error('webhook_call action not registered')
    return def
  }

  function ctx(triggerData: Record<string, unknown> = {}, stepResults: Record<string, unknown> = {}) {
    return { triggerData, stepResults }
  }

  it('returns success on HTTP 200 with parsed JSON body', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true, status: 200, text: async () => '{"ok":true,"id":"xyz"}',
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', method: 'POST', body: { hello: 'world' } })
    expect(res.success).toBe(true)
    expect(res.data?.status).toBe(200)
    expect((res.data?.body as any).ok).toBe(true)
  })

  it('returns success with raw text body when response is not JSON', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true, status: 200, text: async () => 'plain text response',
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test' })
    expect(res.success).toBe(true)
    expect(res.data?.body).toBe('plain text response')
  })

  it('returns failure on HTTP 4xx without retry', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false, status: 400, text: async () => '{"error":"bad request"}',
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', retries: 5 })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/HTTP 400/)
    expect((global.fetch as any).mock.calls.length).toBe(1)
  })

  it('retries on HTTP 5xx then fails', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false, status: 503, text: async () => 'service unavailable',
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', retries: 2 })
    expect(res.success).toBe(false)
    expect((global.fetch as any).mock.calls.length).toBe(3)
  }, 15_000)

  it('retries on network error then fails', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('ECONNRESET'))
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', retries: 1 })
    expect(res.success).toBe(false)
    expect((global.fetch as any).mock.calls.length).toBe(2)
  }, 15_000)

  it('resolves Mustache templates in url, body, and headers', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
    const wh = getWebhook()
    await wh.execute(
      ctx({ companyId: 'c1', name: 'Acme' }, { score_lead: { score: 42 } }),
      {
        url: 'http://example.test/{{data.companyId}}',
        method: 'POST',
        headers: { 'X-Name': '{{data.name}}' },
        body: { score: '{{steps.score_lead.score}}' },
      },
    )
    const call = (global.fetch as any).mock.calls[0]
    expect(call[0]).toBe('http://example.test/c1')
    expect(call[1].headers['X-Name']).toBe('Acme')
    expect(JSON.parse(call[1].body).score).toBe('42')
  })

  it('sets Authorization Bearer header when authBearer provided', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' })
    const wh = getWebhook()
    await wh.execute(ctx({ apiKey: 'secret-token' }), {
      url: 'http://example.test',
      authBearer: '{{data.apiKey}}',
    })
    const call = (global.fetch as any).mock.calls[0]
    expect(call[1].headers.Authorization).toBe('Bearer secret-token')
  })

  it('does not send body for GET or DELETE', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: true, status: 200, text: async () => '{}' })
    const wh = getWebhook()
    await wh.execute(ctx(), { url: 'http://example.test', method: 'GET', body: { x: 1 } })
    expect((global.fetch as any).mock.calls[0][1].body).toBeUndefined()
    await wh.execute(ctx(), { url: 'http://example.test', method: 'DELETE', body: { x: 1 } })
    expect((global.fetch as any).mock.calls[1][1].body).toBeUndefined()
  })

  it('returns failure when URL is empty after templating', async () => {
    const wh = getWebhook()
    const res = await wh.execute(ctx({}), { url: '{{data.missing}}' })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/URL leer/i)
    expect((global.fetch as any).mock.calls.length).toBe(0)
  })

  it('aborts on timeout', async () => {
    ;(global.fetch as any).mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    const wh = getWebhook()
    const res = await wh.execute(ctx(), { url: 'http://example.test', timeoutMs: 50, retries: 0 })
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/abort/i)
  }, 5_000)
})
