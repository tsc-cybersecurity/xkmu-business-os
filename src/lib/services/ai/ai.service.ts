import { AiProviderService } from '@/lib/services/ai-provider.service'
import { logger } from '@/lib/utils/logger'
import type { AiProvider } from '@/lib/db/schema'
import { OllamaProvider } from './ollama.provider'
import { OpenRouterProvider } from './openrouter.provider'
import { GeminiProvider } from './gemini.provider'
import { OpenAIProvider } from './openai.provider'
import { DeepseekProvider } from './deepseek.provider'
import { KimiProvider } from './kimi.provider'

export interface AIOptions {
  maxTokens?: number
  temperature?: number
  model?: string
  systemPrompt?: string
  providerId?: string
}

export interface AIResponse {
  text: string
  provider: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIProvider {
  name: string
  complete(prompt: string, options?: AIOptions): Promise<AIResponse>
  isAvailable(): Promise<boolean>
}

export interface CompanyResearchResult {
  summary: string
  industry?: string
  employeeCount?: string
  revenue?: string
  keyPeople?: Array<{
    name: string
    title: string
  }>
  recentNews?: string[]
  competitors?: string[]
  rawData?: Record<string, unknown>
}

// Kontext für Logging
export interface AIRequestContext {
  userId?: string | null
  feature?: string
  entityType?: string
  entityId?: string
}

// Factory-Funktion: Erstellt AIProvider aus DB-Konfiguration
function createProviderFromConfig(config: AiProvider): AIProvider {
  switch (config.providerType) {
    case 'ollama': {
      if (!config.baseUrl && !process.env.OLLAMA_BASE_URL) {
        throw new Error(
          'Ollama ist nicht konfiguriert. ' +
          'Bitte OLLAMA_BASE_URL setzen oder einen anderen KI-Provider (Gemini, OpenAI) verwenden.'
        )
      }
      return new OllamaProvider({
        baseUrl: config.baseUrl || undefined,
        model: config.model,
      })
    }
    case 'openrouter':
      return new OpenRouterProvider({
        apiKey: config.apiKey || undefined,
        model: config.model,
        baseUrl: config.baseUrl || undefined,
      })
    case 'gemini':
      return new GeminiProvider({
        apiKey: config.apiKey || undefined,
        model: config.model,
      })
    case 'openai':
      return new OpenAIProvider({
        apiKey: config.apiKey || undefined,
        model: config.model,
      })
    case 'deepseek':
      return new DeepseekProvider({
        apiKey: config.apiKey || undefined,
        model: config.model,
      })
    case 'kimi':
      return new KimiProvider({
        apiKey: config.apiKey || undefined,
        model: config.model,
      })
    case 'kie':
      // kie.ai is a video generation provider, not a text AI provider
      throw new Error('kie.ai ist ein Video-Generierungs-Provider, kein Text-KI-Provider')
    case 'firecrawl':
      // Firecrawl is not an AI provider, skip
      throw new Error('Firecrawl is not an AI provider')
    default:
      throw new Error(`Unknown provider type: ${config.providerType}`)
  }
}

class AIServiceClass {
  // Fallback: statische Provider (für Abwärtskompatibilität)
  private staticProviders: AIProvider[] = []

  registerProvider(provider: AIProvider): void {
    this.staticProviders.push(provider)
  }

  /**
   * Completion mit DB-basierten Providern und Logging
   */
  async completeWithContext(
    prompt: string,
    context: AIRequestContext,
    options?: AIOptions
  ): Promise<AIResponse> {
    const startTime = Date.now()

    // Provider aus DB laden
    const allProviders = await AiProviderService.getActiveProviders()

    if (allProviders.length === 0) {
      // Fallback auf statische Provider
      return this.complete(prompt, options)
    }

    // Wenn providerId angegeben, nur diesen nutzen
    const dbProviders = options?.providerId
      ? allProviders.filter((p) => p.id === options.providerId)
      : allProviders

    if (dbProviders.length === 0) {
      throw new Error('Angegebener Provider nicht gefunden oder inaktiv')
    }

    let lastError: Error | null = null

    for (const config of dbProviders) {
      try {
        const provider = createProviderFromConfig(config)

        if (!(await provider.isAvailable())) {
          continue
        }

        // Provider-spezifische Optionen überschreiben
        const mergedOptions: AIOptions = {
          maxTokens: config.maxTokens || options?.maxTokens || 30000,
          temperature: options?.temperature ?? parseFloat(config.temperature || '0.7'),
          model: options?.model || config.model,
          systemPrompt: options?.systemPrompt,
        }

        const response = await provider.complete(prompt, mergedOptions)
        const durationMs = Date.now() - startTime

        // Erfolg loggen (fire-and-forget, blockiert nicht den Response)
        AiProviderService.createLog({
          providerId: config.id,
          userId: context.userId || null,
          providerType: config.providerType,
          model: response.model,
          prompt,
          response: response.text,
          status: 'success',
          promptTokens: response.usage?.promptTokens || null,
          completionTokens: response.usage?.completionTokens || null,
          totalTokens: response.usage?.totalTokens || null,
          durationMs,
          feature: context.feature || null,
          entityType: context.entityType || null,
          entityId: context.entityId || null,
        }).catch((err) => {
          logger.error('Failed to log AI request', err, { module: 'AIService' })
        })

        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.error(`Provider ${config.name} (${config.providerType}) failed`, error, { module: 'AIService' })

        // Fehler loggen (fire-and-forget)
        AiProviderService.createLog({
          providerId: config.id,
          userId: context.userId || null,
          providerType: config.providerType,
          model: config.model,
          prompt,
          status: 'error',
          errorMessage: lastError.message,
          durationMs: Date.now() - startTime,
          feature: context.feature || null,
          entityType: context.entityType || null,
          entityId: context.entityId || null,
        }).catch((err) => {
          logger.error('Failed to log AI error', err, { module: 'AIService' })
        })

        continue
      }
    }

    throw lastError || new Error('No AI provider available')
  }

  /**
   * Legacy: Statische Provider (ohne DB, ohne Logging)
   */
  async complete(prompt: string, options?: AIOptions): Promise<AIResponse> {
    for (const provider of this.staticProviders) {
      try {
        if (await provider.isAvailable()) {
          return await provider.complete(prompt, options)
        }
      } catch (error) {
        logger.error(`Provider ${provider.name} failed`, error, { module: 'AIService' })
        continue
      }
    }

    throw new Error('No AI provider available')
  }

  async research(companyName: string, context?: AIRequestContext): Promise<CompanyResearchResult> {
    const prompt = `Research the company "${companyName}" and provide a structured summary including:
    - Brief company description
    - Industry/sector
    - Approximate employee count
    - Estimated revenue (if available)
    - Key executives or decision makers
    - Recent news or developments
    - Main competitors

    Format the response as JSON with the following structure:
    {
      "summary": "Brief description",
      "industry": "Industry name",
      "employeeCount": "Approximate count",
      "revenue": "Estimated revenue",
      "keyPeople": [{"name": "Name", "title": "Title"}],
      "recentNews": ["News item 1", "News item 2"],
      "competitors": ["Competitor 1", "Competitor 2"]
    }`

    const response = context
      ? await this.completeWithContext(prompt, { ...context, feature: 'research' }, {
          maxTokens: 1000,
          temperature: 0.3,
        })
      : await this.complete(prompt, {
          maxTokens: 1000,
          temperature: 0.3,
        })

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as CompanyResearchResult
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON in research response, returning raw text', { module: 'AIService', feature: 'research' })
      logger.debug('Parse error detail', { module: 'AIService', error: String(parseError) })
    }

    return {
      summary: response.text,
      rawData: { response: response.text },
    }
  }

  async summarize(text: string, maxLength = 200, context?: AIRequestContext): Promise<string> {
    const prompt = `Summarize the following text in ${maxLength} words or less. Be concise and capture the key points:\n\n${text}`

    const response = context
      ? await this.completeWithContext(prompt, { ...context, feature: 'summarize' }, {
          maxTokens: maxLength * 2,
          temperature: 0.3,
        })
      : await this.complete(prompt, {
          maxTokens: maxLength * 2,
          temperature: 0.3,
        })

    return response.text
  }

  async extractEntities(text: string, context?: AIRequestContext): Promise<{
    companies: string[]
    people: string[]
    emails: string[]
    phones: string[]
  }> {
    const prompt = `Extract the following entities from the text below and return as JSON:
    - Companies mentioned
    - People names
    - Email addresses
    - Phone numbers

    Text: ${text}

    Return JSON format:
    {
      "companies": [],
      "people": [],
      "emails": [],
      "phones": []
    }`

    const response = context
      ? await this.completeWithContext(prompt, { ...context, feature: 'extract_entities' }, {
          maxTokens: 2000,
          temperature: 0.1,
        })
      : await this.complete(prompt, {
          maxTokens: 2000,
          temperature: 0.1,
        })

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON in extractEntities response, returning empty result', { module: 'AIService', feature: 'extractEntities' })
      logger.debug('Parse error detail', { module: 'AIService', error: String(parseError) })
    }

    return {
      companies: [],
      people: [],
      emails: [],
      phones: [],
    }
  }

  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = []
    for (const provider of this.staticProviders) {
      if (await provider.isAvailable()) {
        available.push(provider.name)
      }
    }
    return available
  }

  /**
   * Prüft welche DB-Provider verfügbar sind
   */
  async getAvailableDbProviders(): Promise<Array<{
    id: string
    name: string
    providerType: string
    model: string
    available: boolean
  }>> {
    // Text-AI-Provider (getActiveProviders filtert firecrawl/kie raus)
    const dbProviders = await AiProviderService.getActiveProviders()
    const result = []

    for (const config of dbProviders) {
      try {
        const provider = createProviderFromConfig(config)
        const available = await provider.isAvailable()
        result.push({
          id: config.id,
          name: config.name,
          providerType: config.providerType,
          model: config.model,
          available,
        })
      } catch (providerError) {
        logger.warn(`Provider ${config.name} (${config.providerType}) availability check failed, marking unavailable`, { module: 'AIService', providerId: config.id })
        logger.debug('Provider check error detail', { module: 'AIService', error: String(providerError) })
        result.push({
          id: config.id,
          name: config.name,
          providerType: config.providerType,
          model: config.model,
          available: false,
        })
      }
    }

    // Spezial-Provider (firecrawl, kie, serpapi) separat prüfen - haben API-Key = verfügbar
    const allProviders = await AiProviderService.list()
    const specialProviders = allProviders.filter(
      (p) => ['firecrawl', 'kie', 'serpapi'].includes(p.providerType) && p.isActive
    )
    for (const config of specialProviders) {
      result.push({
        id: config.id,
        name: config.name,
        providerType: config.providerType,
        model: config.model,
        available: !!config.apiKey,
      })
    }

    return result
  }
}

export const AIService = new AIServiceClass()
