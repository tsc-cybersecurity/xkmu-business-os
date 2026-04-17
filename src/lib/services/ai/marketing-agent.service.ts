// ============================================
// Marketing Agent Service (AI CMO)
// Multi-step pipeline: URL → Scrape → Research → SEO → Content
// ============================================

import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '../ai-prompt-template.service'
import { AiProviderService } from '../ai-provider.service'
import { WebsiteScraperService } from './website-scraper.service'
import { logger } from '@/lib/utils/logger'

// ============================================
// Types
// ============================================

export interface MarketingAgentInput {
  url: string
  language?: 'de' | 'en'
  platforms?: string[]
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational'
  additionalContext?: string
}

export interface MarketingResearch {
  companyName: string
  industry: string
  targetAudience: string
  uniqueSellingPoints: string[]
  competitors: string[]
  keyProducts: string[]
  brandTone: string
  summary: string
}

export interface SeoAnalysis {
  primaryKeywords: string[]
  secondaryKeywords: string[]
  contentGaps: string[]
  metaDescriptionSuggestion: string
  searchVisibilityScore: number
  recommendations: string[]
}

export interface SocialMediaDraft {
  platform: string
  title: string
  content: string
  hashtags: string[]
  callToAction: string
}

export interface MarketingAgentResult {
  research: MarketingResearch
  seoAnalysis: SeoAnalysis
  socialMediaDrafts: SocialMediaDraft[]
  executiveSummary: string
  scrapedUrl: string
  scrapedPagesCount: number
}

// ============================================
// JSON Extraction Helper
// ============================================

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) return codeBlockMatch[1].trim()
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
  if (jsonMatch) return jsonMatch[0]
  return null
}

function parseJsonSafe<T>(text: string, fallback: T): T {
  const jsonStr = extractJson(text)
  if (!jsonStr) return fallback

  try {
    return JSON.parse(jsonStr) as T
  } catch {
    // Try to repair truncated JSON
    let repaired = jsonStr
    const openBraces = (repaired.match(/{/g) || []).length
    const closeBraces = (repaired.match(/}/g) || []).length
    const openBrackets = (repaired.match(/\[/g) || []).length
    const closeBrackets = (repaired.match(/]/g) || []).length

    for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']'
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}'

    try {
      return JSON.parse(repaired) as T
    } catch {
      return fallback
    }
  }
}

// ============================================
// Agent Steps
// ============================================

async function stepScrape(
  url: string,
  tenantId: string
): Promise<{ combinedText: string; pagesCount: number; success: boolean }> {
  // Try to get Firecrawl API key
  let firecrawlKey: string | undefined
  try {
    const providers = await AiProviderService.getActiveProviders(tenantId)
    const firecrawlProvider = providers.find(p => p.providerType === 'firecrawl')
    if (firecrawlProvider?.apiKey) {
      firecrawlKey = firecrawlProvider.apiKey
    }
  } catch {
    // No Firecrawl configured
  }

  const result = await WebsiteScraperService.scrapeCompanyWebsite(url, firecrawlKey, tenantId)

  return {
    combinedText: result.combinedText,
    pagesCount: 1 + result.subPages.length,
    success: result.success,
  }
}

async function stepResearch(
  websiteContent: string,
  context: AIRequestContext,
  language: string
): Promise<MarketingResearch> {
  const template = await AiPromptTemplateService.getOrDefault('', 'marketing_agent_research')

  const userPrompt = AiPromptTemplateService.applyPlaceholders(
    template.userPrompt,
    { websiteContent, language }
  )

  const response = await AIService.completeWithContext(userPrompt, {
    ...context,
    feature: 'marketing_agent_research',
  }, {
    maxTokens: 3000,
    temperature: 0.3,
    systemPrompt: template.systemPrompt,
  })

  return parseJsonSafe<MarketingResearch>(response.text, {
    companyName: '',
    industry: '',
    targetAudience: '',
    uniqueSellingPoints: [],
    competitors: [],
    keyProducts: [],
    brandTone: '',
    summary: '',
  })
}

async function stepSeoAnalysis(
  websiteContent: string,
  research: MarketingResearch,
  context: AIRequestContext,
  language: string
): Promise<SeoAnalysis> {
  const template = await AiPromptTemplateService.getOrDefault('', 'marketing_agent_seo')

  const userPrompt = AiPromptTemplateService.applyPlaceholders(
    template.userPrompt,
    {
      websiteContent: websiteContent.substring(0, 10000),
      companyName: research.companyName,
      industry: research.industry,
      targetAudience: research.targetAudience,
      language,
    }
  )

  const response = await AIService.completeWithContext(userPrompt, {
    ...context,
    feature: 'marketing_agent_seo',
  }, {
    maxTokens: 2000,
    temperature: 0.3,
    systemPrompt: template.systemPrompt,
  })

  const parsed = parseJsonSafe<SeoAnalysis>(response.text, {
    primaryKeywords: [],
    secondaryKeywords: [],
    contentGaps: [],
    metaDescriptionSuggestion: '',
    searchVisibilityScore: 0,
    recommendations: [],
  })

  // Clamp score
  parsed.searchVisibilityScore = Math.max(0, Math.min(100, parsed.searchVisibilityScore))

  return parsed
}

async function stepContentGeneration(
  research: MarketingResearch,
  seoAnalysis: SeoAnalysis,
  context: AIRequestContext,
  platforms: string[],
  tone: string,
  language: string
): Promise<SocialMediaDraft[]> {
  const template = await AiPromptTemplateService.getOrDefault('', 'marketing_agent_content')

  const userPrompt = AiPromptTemplateService.applyPlaceholders(
    template.userPrompt,
    {
      companyName: research.companyName,
      industry: research.industry,
      targetAudience: research.targetAudience,
      uniqueSellingPoints: research.uniqueSellingPoints.join(', '),
      keyProducts: research.keyProducts.join(', '),
      brandTone: research.brandTone,
      primaryKeywords: seoAnalysis.primaryKeywords.join(', '),
      platforms: platforms.join(', '),
      tone,
      language,
    }
  )

  const response = await AIService.completeWithContext(userPrompt, {
    ...context,
    feature: 'marketing_agent_content',
  }, {
    maxTokens: 4000,
    temperature: 0.8,
    systemPrompt: template.systemPrompt,
  })

  const parsed = parseJsonSafe<unknown>(response.text, [])
  const rawItems = Array.isArray(parsed) ? parsed : ((parsed as Record<string, unknown>).posts as unknown[] || [])

  return rawItems.map((item: unknown) => {
    const obj = item as Record<string, unknown>
    return {
      platform: String(obj.platform || 'linkedin'),
      title: String(obj.title || ''),
      content: String(obj.content || ''),
      hashtags: Array.isArray(obj.hashtags) ? obj.hashtags.map(String) : [],
      callToAction: String(obj.callToAction || ''),
    }
  })
}

// ============================================
// Main Orchestrator
// ============================================

export const MarketingAgentService = {
  async analyze(
    input: MarketingAgentInput,
    context: AIRequestContext
  ): Promise<MarketingAgentResult> {
    const language = input.language || 'de'
    const platforms = input.platforms?.length ? input.platforms : ['linkedin', 'twitter', 'instagram']
    const tone = input.tone || 'professional'

    logger.info(`Marketing Agent: Starting analysis for ${input.url}`, { module: 'MarketingAgent' })

    // Step 1: Scrape
    const scrapeResult = await stepScrape(input.url, '')
    if (!scrapeResult.success || !scrapeResult.combinedText) {
      throw new Error('Website konnte nicht gescraped werden. Bitte pruefen Sie die URL.')
    }

    let websiteContent = scrapeResult.combinedText
    if (input.additionalContext) {
      websiteContent += `\n\n=== ZUSAETZLICHER KONTEXT ===\n${input.additionalContext}`
    }

    logger.info(`Marketing Agent: Scraped ${scrapeResult.pagesCount} pages`, { module: 'MarketingAgent' })

    // Step 2: Research Analysis
    const research = await stepResearch(websiteContent, context, language)
    logger.info(`Marketing Agent: Research complete for "${research.companyName}"`, { module: 'MarketingAgent' })

    // Step 3: SEO Analysis
    const seoAnalysis = await stepSeoAnalysis(websiteContent, research, context, language)
    logger.info(`Marketing Agent: SEO analysis complete (Score: ${seoAnalysis.searchVisibilityScore})`, { module: 'MarketingAgent' })

    // Step 4: Content Generation
    const socialMediaDrafts = await stepContentGeneration(
      research, seoAnalysis, context, platforms, tone, language
    )
    logger.info(`Marketing Agent: Generated ${socialMediaDrafts.length} social media drafts`, { module: 'MarketingAgent' })

    // Build executive summary
    const executiveSummary = language === 'de'
      ? `Marketing-Analyse fuer "${research.companyName}" (${research.industry}). ${research.uniqueSellingPoints.length} USPs identifiziert, ${seoAnalysis.primaryKeywords.length} primaere Keywords, SEO-Score: ${seoAnalysis.searchVisibilityScore}/100. ${socialMediaDrafts.length} Social-Media-Entwürfe generiert.`
      : `Marketing analysis for "${research.companyName}" (${research.industry}). ${research.uniqueSellingPoints.length} USPs identified, ${seoAnalysis.primaryKeywords.length} primary keywords, SEO score: ${seoAnalysis.searchVisibilityScore}/100. ${socialMediaDrafts.length} social media drafts generated.`

    return {
      research,
      seoAnalysis,
      socialMediaDrafts,
      executiveSummary,
      scrapedUrl: input.url,
      scrapedPagesCount: scrapeResult.pagesCount,
    }
  },
}
