import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Memory Embedding', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.stubEnv('GOOGLE_AI_API_KEY', 'test-key')
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('embedText liefert 768d Vector', async () => {
    const mockVector = Array.from({ length: 768 }, (_, i) => i / 768)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: mockVector } }),
    }) as unknown as typeof fetch

    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    const r = await embedText('hello world')
    expect(r).toHaveLength(768)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(callArgs[0])).toContain('text-embedding-004')
  })

  it('embedText wirft bei nicht-OK-Response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 500, text: async () => 'Internal Error',
    }) as unknown as typeof fetch
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await expect(embedText('x')).rejects.toThrow(/Embedding-Request fehlgeschlagen/)
  })

  it('embedText wirft bei fehlender API-Key', async () => {
    vi.stubEnv('GOOGLE_AI_API_KEY', '')
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await expect(embedText('x')).rejects.toThrow(/GOOGLE_AI_API_KEY/)
  })

  it('embedText wirft bei Vector-Dimension != 768', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ embedding: { values: [1, 2, 3] } }),
    }) as unknown as typeof fetch
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await expect(embedText('x')).rejects.toThrow(/Dimension/)
  })

  it('embedText sendet API-Key im x-goog-api-key Header, nicht in URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: Array.from({ length: 768 }, () => 0) } }),
    }) as unknown as typeof fetch
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await embedText('hello')
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).not.toContain('key=')
    expect((init as RequestInit).headers).toMatchObject({ 'x-goog-api-key': 'test-key' })
  })
})
