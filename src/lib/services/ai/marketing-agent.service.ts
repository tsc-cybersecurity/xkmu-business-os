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
  const template = await AiPromptTemplateService.getOrDefault(context.tenantId, 'marketing_agent_research')

  const userPrompt = AiPromptTemplateService.applyPlaceholders(
    template.userPrompt || DEFAULT_RESEARCH_USER_PROMPT,
    { websiteContent, language }
  )

  const response = await AIService.completeWithContext(userPrompt, {
    ...context,
    feature: 'marketing_agent_research',
  }, {
    maxTokens: 3000,
    temperature: 0.3,
    systemPrompt: template.systemPrompt || DEFAULT_RESEARCH_SYSTEM_PROMPT,
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
  const template = await AiPromptTemplateService.getOrDefault(context.tenantId, 'marketing_agent_seo')

  const userPrompt = AiPromptTemplateService.applyPlaceholders(
    template.userPrompt || DEFAULT_SEO_USER_PROMPT,
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
    systemPrompt: template.systemPrompt || DEFAULT_SEO_SYSTEM_PROMPT,
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
  const template = await AiPromptTemplateService.getOrDefault(context.tenantId, 'marketing_agent_content')

  const userPrompt = AiPromptTemplateService.applyPlaceholders(
    template.userPrompt || DEFAULT_CONTENT_USER_PROMPT,
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
    systemPrompt: template.systemPrompt || DEFAULT_CONTENT_SYSTEM_PROMPT,
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
    const scrapeResult = await stepScrape(input.url, context.tenantId)
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

// ============================================
// Default Prompts (Fallback wenn kein Template in DB)
// ============================================

const DEFAULT_RESEARCH_SYSTEM_PROMPT = `Du bist ein erfahrener Marketing-Analyst. Analysiere Website-Inhalte und extrahiere strukturierte Marketing-Informationen. Antworte ausschliesslich in JSON.`

const DEFAULT_RESEARCH_USER_PROMPT = `Analysiere die folgenden Website-Inhalte und erstelle einen Marketing-Research-Bericht.

Website-Inhalte:
{{websiteContent}}

Sprache der Ausgabe: {{language}}

Antworte als JSON:
{
  "companyName": "Name des Unternehmens",
  "industry": "Branche",
  "targetAudience": "Primaere Zielgruppe",
  "uniqueSellingPoints": ["USP 1", "USP 2", "USP 3"],
  "competitors": ["Wettbewerber 1", "Wettbewerber 2"],
  "keyProducts": ["Produkt/Service 1", "Produkt/Service 2"],
  "brandTone": "Beschreibung des Marken-Tons (z.B. professionell, innovativ, nahbar)",
  "summary": "Kurze Zusammenfassung (2-3 Saetze) der Marketing-Positionierung"
}`

const DEFAULT_SEO_SYSTEM_PROMPT = `Du bist ein SEO-Experte und analysierst Websites auf Suchmaschinenoptimierung, AI-Search-Visibility (GEO) und Content-Luecken. Antworte ausschliesslich in JSON.`

const DEFAULT_SEO_USER_PROMPT = `Analysiere die folgenden Website-Inhalte fuer SEO und AI-Search-Visibility:

Firma: {{companyName}}
Branche: {{industry}}
Zielgruppe: {{targetAudience}}

Website-Inhalte (Auszug):
{{websiteContent}}

Sprache: {{language}}

Antworte als JSON:
{
  "primaryKeywords": ["keyword1", "keyword2", "keyword3"],
  "secondaryKeywords": ["keyword4", "keyword5"],
  "contentGaps": ["Fehlender Content-Bereich 1", "Fehlender Content-Bereich 2"],
  "metaDescriptionSuggestion": "Optimierte Meta-Description (max 160 Zeichen)",
  "searchVisibilityScore": 65,
  "recommendations": ["Empfehlung 1", "Empfehlung 2", "Empfehlung 3"]
}`

const DEFAULT_CONTENT_SYSTEM_PROMPT = `Du bist ein erfahrener Social-Media-Content-Creator. Erstelle plattformspezifische Posts die zur Marke passen, SEO-Keywords einbinden und engagement-optimiert sind. Antworte ausschliesslich in JSON.`

const DEFAULT_CONTENT_USER_PROMPT = `Erstelle Social-Media-Posts fuer folgendes Unternehmen:

Firma: {{companyName}}
Branche: {{industry}}
Zielgruppe: {{targetAudience}}
USPs: {{uniqueSellingPoints}}
Produkte/Services: {{keyProducts}}
Marken-Ton: {{brandTone}}
SEO-Keywords: {{primaryKeywords}}

Plattformen: {{platforms}}
Ton: {{tone}}
Sprache: {{language}}

Erstelle fuer JEDE Plattform einen Post. Beachte plattformspezifische Laengen und Formate:
- LinkedIn: 1300 Zeichen, professionell, Absaetze
- Twitter/X: 280 Zeichen, praegnant
- Instagram: 2200 Zeichen, visuell beschreibend, viele Hashtags
- Facebook: 500 Zeichen, community-orientiert
- XING: 1000 Zeichen, DACH-Business-Fokus

Antworte als JSON-Array:
[
  {
    "platform": "linkedin",
    "title": "Post-Titel",
    "content": "Der vollstaendige Post-Text",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "callToAction": "Konkreter Call-to-Action"
  }
]`
