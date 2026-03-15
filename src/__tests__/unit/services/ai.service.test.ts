import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_TENANT_ID, TEST_USER_ID } from '../../helpers/fixtures'

// ---- Provider mocks ----

const mockComplete = vi.fn().mockResolvedValue({
  text: 'test response',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
})
const mockIsAvailable = vi.fn().mockResolvedValue(true)

// Use real classes so `new Provider(...)` works
function makeMockProviderClass(providerName: string) {
  return class MockProvider {
    name = providerName
    complete = mockComplete
    isAvailable = mockIsAvailable
    constructor(_config?: unknown) { /* noop */ }
  }
}

vi.mock('@/lib/services/ai/gemini.provider', () => ({
  GeminiProvider: makeMockProviderClass('gemini'),
}))

vi.mock('@/lib/services/ai/openai.provider', () => ({
  OpenAIProvider: makeMockProviderClass('openai'),
}))

vi.mock('@/lib/services/ai/openrouter.provider', () => ({
  OpenRouterProvider: makeMockProviderClass('openrouter'),
}))

vi.mock('@/lib/services/ai/deepseek.provider', () => ({
  DeepseekProvider: makeMockProviderClass('deepseek'),
}))

vi.mock('@/lib/services/ai/kimi.provider', () => ({
  KimiProvider: makeMockProviderClass('kimi'),
}))

vi.mock('@/lib/services/ai/ollama.provider', () => ({
  OllamaProvider: makeMockProviderClass('ollama'),
}))

// ---- AiProviderService mock ----

const mockGetActiveProviders = vi.fn().mockResolvedValue([])
const mockCreateLog = vi.fn().mockResolvedValue(undefined)
const mockList = vi.fn().mockResolvedValue([])

vi.mock('@/lib/services/ai-provider.service', () => ({
  AiProviderService: {
    getActiveProviders: (...args: unknown[]) => mockGetActiveProviders(...args),
    createLog: (...args: unknown[]) => mockCreateLog(...args),
    list: (...args: unknown[]) => mockList(...args),
  },
}))

// ---- Helper to build a DB provider config ----

function providerConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'provider-1',
    tenantId: TEST_TENANT_ID,
    providerType: 'gemini',
    name: 'Test Gemini',
    apiKey: 'test-key',
    baseUrl: null,
    model: 'gemini-2.5-flash',
    maxTokens: 1000,
    temperature: '0.70',
    priority: 0,
    isActive: true,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const defaultContext = {
  tenantId: TEST_TENANT_ID,
  userId: TEST_USER_ID,
  feature: 'test',
}

describe('AIService', () => {
  beforeEach(() => {
    vi.resetModules()
    mockComplete.mockReset().mockResolvedValue({
      text: 'test response',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    })
    mockIsAvailable.mockReset().mockResolvedValue(true)
    mockGetActiveProviders.mockReset().mockResolvedValue([])
    mockCreateLog.mockReset().mockResolvedValue(undefined)
    mockList.mockReset().mockResolvedValue([])
  })

  async function getService() {
    const mod = await import('@/lib/services/ai/ai.service')
    return mod.AIService
  }

  // ---- createProviderFromConfig (tested via completeWithContext) ----

  describe('createProviderFromConfig', () => {
    it('creates gemini provider', async () => {
      const config = providerConfig({ providerType: 'gemini' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('test response')
    })

    it('creates openai provider', async () => {
      const config = providerConfig({ providerType: 'openai', model: 'gpt-4o' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('test response')
    })

    it('creates openrouter provider', async () => {
      const config = providerConfig({ providerType: 'openrouter', model: 'openai/gpt-4o' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('test response')
    })

    it('creates deepseek provider', async () => {
      const config = providerConfig({ providerType: 'deepseek', model: 'deepseek-chat' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('test response')
    })

    it('creates kimi provider', async () => {
      const config = providerConfig({ providerType: 'kimi', model: 'kimi-1' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('test response')
    })

    it('creates ollama provider when baseUrl is set', async () => {
      const config = providerConfig({ providerType: 'ollama', baseUrl: 'http://localhost:11434', model: 'gemma3' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('test response')
    })

    it('throws for unknown provider type', async () => {
      const config = providerConfig({ providerType: 'nonexistent' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      await expect(service.completeWithContext('hello', defaultContext))
        .rejects.toThrow('Unknown provider type: nonexistent')
    })

    it('throws for kie (video-only provider)', async () => {
      const config = providerConfig({ providerType: 'kie' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      await expect(service.completeWithContext('hello', defaultContext))
        .rejects.toThrow('kie.ai ist ein Video-Generierungs-Provider')
    })

    it('throws for firecrawl (not AI)', async () => {
      const config = providerConfig({ providerType: 'firecrawl' })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      await expect(service.completeWithContext('hello', defaultContext))
        .rejects.toThrow('Firecrawl is not an AI provider')
    })

    it('ollama throws when no baseUrl and no OLLAMA_BASE_URL env', async () => {
      const originalEnv = process.env.OLLAMA_BASE_URL
      delete process.env.OLLAMA_BASE_URL

      const config = providerConfig({ providerType: 'ollama', baseUrl: null })
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      await expect(service.completeWithContext('hello', defaultContext))
        .rejects.toThrow('Ollama ist nicht konfiguriert')

      // Restore env
      if (originalEnv !== undefined) {
        process.env.OLLAMA_BASE_URL = originalEnv
      }
    })
  })

  // ---- completeWithContext ----

  describe('completeWithContext', () => {
    it('uses first available DB provider', async () => {
      const config = providerConfig()
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('test response')
      expect(mockGetActiveProviders).toHaveBeenCalledWith(TEST_TENANT_ID)
    })

    it('falls back to next provider on failure', async () => {
      const config1 = providerConfig({ id: 'p1', name: 'Failing Provider' })
      const config2 = providerConfig({ id: 'p2', name: 'Working Provider' })
      mockGetActiveProviders.mockResolvedValue([config1, config2])

      // First call fails, second succeeds
      mockComplete
        .mockRejectedValueOnce(new Error('API down'))
        .mockResolvedValueOnce({
          text: 'fallback response',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        })

      const service = await getService()
      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('fallback response')
    })

    it('logs success via AiProviderService.createLog', async () => {
      const config = providerConfig()
      mockGetActiveProviders.mockResolvedValue([config])

      const service = await getService()
      await service.completeWithContext('hello', defaultContext)

      expect(mockCreateLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          providerId: 'provider-1',
          status: 'success',
          prompt: 'hello',
          response: 'test response',
        })
      )
    })

    it('logs error on failure', async () => {
      const config = providerConfig()
      mockGetActiveProviders.mockResolvedValue([config])
      mockComplete.mockRejectedValue(new Error('API error'))

      const service = await getService()
      await expect(service.completeWithContext('hello', defaultContext)).rejects.toThrow()

      expect(mockCreateLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          status: 'error',
          errorMessage: 'API error',
        })
      )
    })

    it('falls back to static providers when no DB providers', async () => {
      mockGetActiveProviders.mockResolvedValue([])

      const service = await getService()
      // Register a static provider
      service.registerProvider({
        name: 'static-test',
        complete: vi.fn().mockResolvedValue({
          text: 'static response',
          provider: 'static-test',
          model: 'test',
        }),
        isAvailable: vi.fn().mockResolvedValue(true),
      })

      const result = await service.completeWithContext('hello', defaultContext)

      expect(result.text).toBe('static response')
    })

    it('throws when no providers available', async () => {
      mockGetActiveProviders.mockResolvedValue([])

      const service = await getService()

      await expect(service.completeWithContext('hello', defaultContext))
        .rejects.toThrow('No AI provider available')
    })
  })

  // ---- research ----

  describe('research', () => {
    it('parses JSON response correctly', async () => {
      const jsonResponse = JSON.stringify({
        summary: 'A great company',
        industry: 'Technology',
        employeeCount: '500',
        revenue: '$50M',
        keyPeople: [{ name: 'John CEO', title: 'CEO' }],
        recentNews: ['Launched new product'],
        competitors: ['CompetitorA'],
      })

      const config = providerConfig()
      mockGetActiveProviders.mockResolvedValue([config])
      mockComplete.mockResolvedValue({
        text: `Here is the research:\n${jsonResponse}`,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        usage: { promptTokens: 10, completionTokens: 50, totalTokens: 60 },
      })

      const service = await getService()
      const result = await service.research('Test Corp', defaultContext)

      expect(result.summary).toBe('A great company')
      expect(result.industry).toBe('Technology')
      expect(result.keyPeople).toHaveLength(1)
      expect(result.competitors).toContain('CompetitorA')
    })

    it('returns raw text as summary when JSON parse fails', async () => {
      const config = providerConfig()
      mockGetActiveProviders.mockResolvedValue([config])
      mockComplete.mockResolvedValue({
        text: 'Just plain text about the company, no JSON here.',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      })

      const service = await getService()
      const result = await service.research('Test Corp', defaultContext)

      expect(result.summary).toBe('Just plain text about the company, no JSON here.')
      expect(result.rawData).toEqual({ response: 'Just plain text about the company, no JSON here.' })
    })
  })

  // ---- extractEntities ----

  describe('extractEntities', () => {
    it('parses entity JSON correctly', async () => {
      const entityJson = JSON.stringify({
        companies: ['Acme Corp'],
        people: ['John Doe'],
        emails: ['john@acme.com'],
        phones: ['+49 123 456789'],
      })

      const config = providerConfig()
      mockGetActiveProviders.mockResolvedValue([config])
      mockComplete.mockResolvedValue({
        text: entityJson,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      })

      const service = await getService()
      const result = await service.extractEntities('Contact John Doe at Acme Corp', defaultContext)

      expect(result.companies).toEqual(['Acme Corp'])
      expect(result.people).toEqual(['John Doe'])
      expect(result.emails).toEqual(['john@acme.com'])
      expect(result.phones).toEqual(['+49 123 456789'])
    })

    it('returns empty arrays on parse failure', async () => {
      const config = providerConfig()
      mockGetActiveProviders.mockResolvedValue([config])
      mockComplete.mockResolvedValue({
        text: 'Sorry, I could not extract any entities.',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      })

      const service = await getService()
      const result = await service.extractEntities('Some random text', defaultContext)

      expect(result).toEqual({
        companies: [],
        people: [],
        emails: [],
        phones: [],
      })
    })
  })
})
