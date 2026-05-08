import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function setupProviderMock(apiKey: string | null) {
  vi.doMock('@/lib/services/ai-provider.service', () => ({
    AiProviderService: {
      list: vi.fn().mockResolvedValue(
        apiKey === null
          ? []
          : [{ id: 'p1', providerType: 'serpapi', isActive: true, apiKey }],
      ),
    },
  }))
}

describe('SerpApiNewsAdapter', () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchSpy.mockReset()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns empty array when no SerpAPI provider is active', async () => {
    setupProviderMock(null)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    const result = await SerpApiNewsAdapter.search(['cyber'], {})
    expect(result).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('calls SerpAPI with hl=de, gl=de, engine=google_news, joined query', async () => {
    setupProviderMock('test-key')
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ news_results: [] }),
    } as unknown as Response)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    await SerpApiNewsAdapter.search(['NIS2', 'KMU'], { maxResults: 5 })

    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('engine=google_news')
    expect(url).toContain('hl=de')
    expect(url).toContain('gl=de')
    expect(url).toContain('q=NIS2+KMU')
    expect(url).toContain('api_key=test-key')
    expect(url).toContain('num=5')
  })

  it('maps SerpAPI news_results to NewsSearchResult[]', async () => {
    setupProviderMock('test-key')
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        news_results: [
          {
            title: 'NIS2 in Deutschland',
            link: 'https://heise.de/a',
            snippet: 'Snippet...',
            source: { name: 'heise.de' },
            thumbnail: 'https://heise.de/img.jpg',
            date: '2026-05-07T10:00:00Z',
          },
          {
            title: 'Ohne URL',
          },
        ],
      }),
    } as unknown as Response)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    const result = await SerpApiNewsAdapter.search(['NIS2'], {})
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      title: 'NIS2 in Deutschland',
      url: 'https://heise.de/a',
      snippet: 'Snippet...',
      source: 'heise.de',
      imageUrl: 'https://heise.de/img.jpg',
      publishedAt: new Date('2026-05-07T10:00:00Z'),
    })
  })

  it('throws on SerpAPI HTTP error', async () => {
    setupProviderMock('test-key')
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limit'),
    } as unknown as Response)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    await expect(SerpApiNewsAdapter.search(['x'], {})).rejects.toThrow(/SerpAPI/)
  })

  it('returns empty array when news_results missing', async () => {
    setupProviderMock('test-key')
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as unknown as Response)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    const result = await SerpApiNewsAdapter.search(['x'], {})
    expect(result).toEqual([])
  })
})
