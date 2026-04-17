// ============================================
// AI Research Service - Lead, Company & Person Analysis
// ============================================

import { AIService, type AIRequestContext } from './ai.service'
import { WebsiteScraperService } from './website-scraper.service'
import { logger } from '@/lib/utils/logger'

// ============================================
// Types
// ============================================
export interface LeadResearchInput {
  companyName?: string
  personName?: string
  email?: string
  website?: string
  additionalContext?: string
  websiteContent?: string
}

export interface LeadResearchResult {
  company?: {
    name: string
    description?: string
    industry?: string
    employeeCount?: string
    headquarters?: string
    website?: string
    products?: string[]
  }
  person?: {
    name: string
    jobTitle?: string
    company?: string
    linkedinUrl?: string
    bio?: string
  }
  score: number
  scoreReasoning: string
  summary: string
  recommendedActions: string[]
  researchedAt: string
}

export interface CompanyResearchInput {
  name: string
  legalForm?: string
  industry?: string
  website?: string
  city?: string
  email?: string
  notes?: string
  websiteContent?: string // Scraped website text
}

export interface CompanyAddress {
  label: string // z.B. "Hauptsitz", "Niederlassung Berlin", "Produktionsstandort"
  street?: string
  houseNumber?: string
  postalCode?: string
  city?: string
  country?: string
  phone?: string
  email?: string
}

export interface CompanyResearchResult {
  description: string
  industry: string
  employeeCount: string
  foundedYear: string
  headquarters: string
  website: string
  products: string[]
  services: string[]
  targetMarket: string
  competitors: string[]
  strengths: string[]
  recentDevelopments: string[]
  socialMedia: {
    linkedin?: string
    xing?: string
    twitter?: string
    facebook?: string
    instagram?: string
  }
  financials: {
    estimatedRevenue?: string
    growthTrend?: string
    fundingStatus?: string
  }
  technologies: string[]
  certifications: string[]
  addresses: CompanyAddress[]
  companyProfile: string // Umfassendes Firmenprofil für das Notizfeld
  summary: string
  researchedAt: string
}

export interface PersonResearchInput {
  firstName: string
  lastName: string
  email?: string
  company?: string
  jobTitle?: string
  city?: string
  notes?: string
}

export interface PersonResearchResult {
  fullName: string
  jobTitle: string
  company: string
  department: string
  bio: string
  expertise: string[]
  education: string[]
  careerHistory: string[]
  languages: string[]
  socialMedia: {
    linkedin?: string
    xing?: string
    twitter?: string
  }
  communicationStyle: string
  decisionMakerLevel: string
  interests: string[]
  recommendedApproach: string
  summary: string
  researchedAt: string
}

// ============================================
// Helper: Parse JSON from AI response
// ============================================

/**
 * Versucht abgeschnittenes JSON zu reparieren,
 * indem offene Klammern/Anführungszeichen geschlossen werden.
 */
function repairTruncatedJson(json: string): string {
  let repaired = json.trim()

  // Offene Strings schließen
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length
  if (quoteCount % 2 !== 0) {
    repaired += '"'
  }

  // Zähle offene/geschlossene Klammern
  let openBraces = 0
  let openBrackets = 0
  let inString = false
  let escaped = false

  for (const char of repaired) {
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') openBraces++
    if (char === '}') openBraces--
    if (char === '[') openBrackets++
    if (char === ']') openBrackets--
  }

  // Schließe offene Klammern
  for (let i = 0; i < openBrackets; i++) repaired += ']'
  for (let i = 0; i < openBraces; i++) repaired += '}'

  return repaired
}

function parseJsonFromResponse<T>(text: string): T {
  // Remove markdown code blocks
  let content = text.trim()
  if (content.startsWith('```json')) {
    content = content.slice(7)
  } else if (content.startsWith('```')) {
    content = content.slice(3)
  }
  if (content.endsWith('```')) {
    content = content.slice(0, -3)
  }
  content = content.trim()

  // Try direct parse
  try {
    return JSON.parse(content) as T
  } catch {
    // Try to find JSON object
    const jsonMatch = content.match(/\{[\s\S]*/)
    if (jsonMatch) {
      // Erst normales Parse versuchen
      try {
        return JSON.parse(jsonMatch[0]) as T
      } catch {
        // Dann repariertes JSON versuchen (abgeschnittene Antwort)
        try {
          const repaired = repairTruncatedJson(jsonMatch[0])
          logger.warn('Repariertes JSON verwendet (Antwort war abgeschnitten)', { module: 'LeadResearchService' })
          return JSON.parse(repaired) as T
        } catch {
          // Letzter Versuch: Alles bis zur letzten schließenden Klammer
          const lastBrace = content.lastIndexOf('}')
          if (lastBrace > 0) {
            const firstBrace = content.indexOf('{')
            if (firstBrace >= 0) {
              try {
                return JSON.parse(content.substring(firstBrace, lastBrace + 1)) as T
              } catch {
                // Aufgeben
              }
            }
          }
        }
      }
    }
    throw new Error(`Failed to parse JSON from AI response`)
  }
}

// ============================================
// Lead Research
// ============================================
const buildLeadResearchPrompt = (input: LeadResearchInput): string => {
  const parts: string[] = [
    'Du bist ein erfahrener B2B-Sales-Researcher. Analysiere die folgenden Lead-Informationen und erstelle einen strukturierten Bericht.',
    '',
    'WICHTIGSTE REGEL: Erfinde KEINE Informationen! Verwende NUR die hier bereitgestellten Daten.',
    'Wenn eine Information nicht aus den bereitgestellten Daten hervorgeht, schreibe "Nicht ermittelbar".',
    'Halluziniere NICHT - es ist besser "Nicht ermittelbar" zu schreiben als falsche Informationen.',
    '',
    'Lead-Informationen:',
  ]

  if (input.companyName) parts.push(`- Firmenname: ${input.companyName}`)
  if (input.personName) parts.push(`- Kontaktperson: ${input.personName}`)
  if (input.email) parts.push(`- E-Mail: ${input.email}`)
  if (input.website) parts.push(`- Website: ${input.website}`)

  if (input.additionalContext) {
    parts.push()
    parts.push(input.additionalContext)
  }

  // Add scraped website content if available
  if (input.websiteContent) {
    parts.push()
    parts.push('=== GESCRAPTE WEBSITE-INHALTE (ECHTE DATEN - als Primärquelle nutzen!) ===')
    parts.push(input.websiteContent)
    parts.push('=== ENDE DER WEBSITE-INHALTE ===')
  }

  parts.push()
  parts.push('Erstelle einen Bericht im folgenden JSON-Format (antworte NUR mit dem JSON, keine weiteren Erklärungen):')
  parts.push(`{
  "company": {
    "name": "Firmenname",
    "description": "Kurzbeschreibung basierend auf den bereitgestellten Daten (2-3 Sätze, oder 'Nicht ermittelbar')",
    "industry": "Branche (nur aus den Daten ableitbar, sonst 'Nicht ermittelbar')",
    "employeeCount": "Mitarbeiteranzahl (nur wenn aus den Daten bekannt, sonst 'Nicht ermittelbar')",
    "headquarters": "Hauptsitz/Standort (nur wenn bekannt, sonst 'Nicht ermittelbar')",
    "website": "Website-URL (nur wenn bekannt)",
    "products": ["Nur Produkte/Services die aus den Daten hervorgehen"]
  },
  "person": {
    "name": "Vollständiger Name",
    "jobTitle": "Position/Titel (nur wenn aus den Daten bekannt, sonst 'Nicht ermittelbar')",
    "company": "Firma",
    "bio": "Einschätzung basierend auf bekannten Daten (oder 'Nicht ermittelbar')"
  },
  "score": 50,
  "scoreReasoning": "Der Score basiert auf: [Begründung mit Verweis auf konkrete Datenlage]",
  "summary": "Zusammenfassung der bekannten Fakten (2-3 Sätze)",
  "recommendedActions": [
    "Konkrete Handlungsempfehlung 1",
    "Konkrete Handlungsempfehlung 2",
    "Konkrete Handlungsempfehlung 3"
  ]
}`)
  parts.push()
  parts.push('Wichtige Hinweise:')
  parts.push('- Score 0-100 (0 = ungeeignet, 100 = perfekter Lead)')
  parts.push('- KONSERVATIV bewerten: wenig Daten = niedriger Score')
  parts.push('- Bei fehlenden Informationen: Score maximal 40-50')
  parts.push('- Alle Texte auf Deutsch')
  parts.push('- KEINE erfundenen Produkte, Branchen oder Mitarbeiterzahlen!')
  parts.push('- Empfohlene Aktionen sollten helfen, fehlende Informationen zu beschaffen')

  return parts.join('\n')
}

// ============================================
// Company Research
// ============================================
const buildCompanyResearchPrompt = (input: CompanyResearchInput): string => {
  const parts: string[] = [
    'Du bist ein erfahrener Business-Analyst. Analysiere die bereitgestellten Informationen über das folgende Unternehmen und erstelle einen strukturierten Bericht.',
    '',
    'WICHTIGSTE REGEL: Erfinde KEINE Informationen! Verwende NUR die hier bereitgestellten Daten.',
    'Wenn du eine Information nicht aus den bereitgestellten Daten ableiten kannst, schreibe "Nicht ermittelbar".',
    'Es ist DEUTLICH besser "Nicht ermittelbar" zu schreiben als falsche Informationen zu erfinden.',
    '',
    'Unternehmensinformationen:',
    `- Name: ${input.name}`,
  ]

  if (input.legalForm) parts.push(`- Rechtsform: ${input.legalForm}`)
  if (input.industry) parts.push(`- Branche: ${input.industry}`)
  if (input.website) parts.push(`- Website: ${input.website}`)
  if (input.city) parts.push(`- Standort: ${input.city}`)
  if (input.email) parts.push(`- E-Mail: ${input.email}`)
  if (input.notes) parts.push(`- Notizen: ${input.notes}`)

  // Add scraped website content if available
  if (input.websiteContent) {
    parts.push()
    parts.push('=== GESCRAPTE WEBSITE-INHALTE (ECHTE DATEN - als Primärquelle nutzen!) ===')
    parts.push(input.websiteContent)
    parts.push('=== ENDE DER WEBSITE-INHALTE ===')
  }

  parts.push()
  parts.push('Extrahiere ALLE Adressen/Standorte die in den bereitgestellten Daten gefunden werden.')
  parts.push('Erstelle außerdem ein ausführliches Firmenprofil (companyProfile) basierend auf den TATSÄCHLICH verfügbaren Daten.')
  parts.push()
  parts.push('Erstelle einen Bericht im folgenden JSON-Format (antworte NUR mit dem JSON):')
  parts.push(`{
  "description": "Beschreibung basierend auf den bereitgestellten Daten (3-5 Sätze)",
  "industry": "Branche (nur aus den Daten ableitbar, sonst 'Nicht ermittelbar')",
  "employeeCount": "Mitarbeiteranzahl (nur wenn aus den Daten bekannt, sonst 'Nicht ermittelbar')",
  "foundedYear": "Gründungsjahr (nur wenn in den Daten gefunden, sonst 'Nicht ermittelbar')",
  "headquarters": "Hauptsitz (nur wenn bekannt, sonst 'Nicht ermittelbar')",
  "website": "Website-URL",
  "products": ["Nur Produkte die aus den Daten hervorgehen"],
  "services": ["Nur Services die aus den Daten hervorgehen"],
  "targetMarket": "Zielmarkt (nur wenn aus den Daten ableitbar, sonst 'Nicht ermittelbar')",
  "competitors": ["Nur wenn in den Daten erwähnt, sonst leeres Array"],
  "strengths": ["Nur aus den Daten ableitbare Stärken"],
  "recentDevelopments": ["Nur wenn in den Daten gefunden"],
  "socialMedia": {
    "linkedin": "Nur echte URLs aus den Daten, sonst null",
    "xing": "null",
    "twitter": "null",
    "facebook": "null",
    "instagram": "null"
  },
  "financials": {
    "estimatedRevenue": "Nur wenn in den Daten gefunden, sonst 'Nicht ermittelbar'",
    "growthTrend": "Nicht ermittelbar",
    "fundingStatus": "Nicht ermittelbar"
  },
  "technologies": ["Nur Technologien die aus den Daten hervorgehen"],
  "certifications": ["Nur Zertifizierungen die aus den Daten hervorgehen"],
  "addresses": [
    {
      "label": "Hauptsitz",
      "street": "Nur echte Daten",
      "houseNumber": "1",
      "postalCode": "12345",
      "city": "Stadt",
      "country": "DE",
      "phone": "Nur echte Telefonnummern",
      "email": "Nur echte E-Mails"
    }
  ],
  "companyProfile": "Firmenprofil basierend NUR auf den tatsächlich bereitgestellten Daten (5-10 Sätze). Dieses Profil wird als Notiz im CRM gespeichert.",
  "summary": "Executive Summary in 2-3 Sätzen"
}`)
  parts.push()
  parts.push('Wichtig:')
  parts.push('- Alle Texte auf Deutsch')
  parts.push('- KEINE erfundenen Informationen! Verwende "Nicht ermittelbar" oder leere Arrays []')
  parts.push('- Extrahiere nur Adressen die TATSÄCHLICH in den Daten stehen')
  parts.push('- Das companyProfile soll NUR verifizierte Informationen enthalten')
  parts.push('- Adressen MÜSSEN die einzelnen Felder (street, houseNumber, postalCode, city, country) enthalten')

  return parts.join('\n')
}

// ============================================
// Person Research
// ============================================
const buildPersonResearchPrompt = (input: PersonResearchInput): string => {
  const parts: string[] = [
    'Du bist ein erfahrener Recherche-Spezialist für Geschäftskontakte. Analysiere die bereitgestellten Informationen über die folgende Person.',
    '',
    'WICHTIGSTE REGEL: Erfinde KEINE Informationen! Verwende NUR die hier bereitgestellten Daten.',
    'Wenn du eine Information nicht aus den bereitgestellten Daten ableiten kannst, schreibe "Nicht ermittelbar".',
    'Erfinde KEINE Karrieregeschichte, Ausbildung, Sprachen oder Social-Media-Profile!',
    '',
    'Personeninformationen:',
    `- Name: ${input.firstName} ${input.lastName}`,
  ]

  if (input.email) parts.push(`- E-Mail: ${input.email}`)
  if (input.company) parts.push(`- Unternehmen: ${input.company}`)
  if (input.jobTitle) parts.push(`- Position: ${input.jobTitle}`)
  if (input.city) parts.push(`- Stadt: ${input.city}`)
  if (input.notes) parts.push(`- Notizen: ${input.notes}`)

  parts.push()
  parts.push('Erstelle einen Bericht im folgenden JSON-Format (antworte NUR mit dem JSON):')
  parts.push(`{
  "fullName": "Vollständiger Name",
  "jobTitle": "Position (nur wenn bekannt, sonst 'Nicht ermittelbar')",
  "company": "Unternehmen (nur wenn bekannt, sonst 'Nicht ermittelbar')",
  "department": "Abteilung (nur wenn aus Daten ableitbar, sonst 'Nicht ermittelbar')",
  "bio": "Kurze Zusammenfassung der BEKANNTEN Informationen (2-3 Sätze)",
  "expertise": ["Nur aus den Daten ableitbare Fachgebiete"],
  "education": ["Nur wenn in den Daten erwähnt, sonst leeres Array"],
  "careerHistory": ["Nur wenn in den Daten erwähnt, sonst leeres Array"],
  "languages": ["Nur wenn bekannt, sonst leeres Array"],
  "socialMedia": {
    "linkedin": "Nur echte URLs, sonst null",
    "xing": "null",
    "twitter": "null"
  },
  "communicationStyle": "Einschätzung basierend auf bekannter Position/Rolle, oder 'Nicht ermittelbar'",
  "decisionMakerLevel": "Entscheidungsebene basierend auf Position, oder 'Nicht ermittelbar'",
  "interests": ["Nur wenn aus Daten erkennbar, sonst leeres Array"],
  "recommendedApproach": "Ansprache-Empfehlung basierend auf den bekannten Fakten",
  "summary": "Zusammenfassung der BEKANNTEN Fakten in 2-3 Sätzen"
}`)
  parts.push()
  parts.push('Wichtig:')
  parts.push('- Alle Texte auf Deutsch')
  parts.push('- KEINE erfundenen Profile, Karriereverläufe oder Social-Media-Links!')
  parts.push('- Verwende leere Arrays [] oder "Nicht ermittelbar" statt erfundener Daten')

  return parts.join('\n')
}

// ============================================
// Exported Service
// ============================================
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'

// Helper: AI-Aufruf mit optionalem Kontext (jetzt mit systemPrompt-Support)
async function aiComplete(
  prompt: string,
  options: { maxTokens: number; temperature: number; systemPrompt?: string },
  context?: AIRequestContext
) {
  if (context) {
    return AIService.completeWithContext(prompt, context, options)
  }
  return AIService.complete(prompt, options)
}

// LLMs (esp. Gemini) don't always honor declared schema types: a field
// declared as "string" may arrive as number, and "array" as comma-separated
// string. Coerce defensively so downstream consumers can trust the types.
function toStr(v: unknown, fallback = 'Nicht ermittelbar'): string {
  if (v === null || v === undefined || v === '') return fallback
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return fallback
}

function toStrArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(x => x !== null && x !== undefined).map(x => String(x))
  if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function normalizeCompanyResearchResult(
  raw: Partial<CompanyResearchResult> & Record<string, unknown>,
  fallbackWebsite?: string
): Omit<CompanyResearchResult, 'researchedAt'> {
  const sm = (raw.socialMedia ?? {}) as Record<string, unknown>
  const fin = (raw.financials ?? {}) as Record<string, unknown>
  const addresses = Array.isArray(raw.addresses) ? raw.addresses : []

  return {
    description: toStr(raw.description),
    industry: toStr(raw.industry),
    employeeCount: toStr(raw.employeeCount),
    foundedYear: toStr(raw.foundedYear),
    headquarters: toStr(raw.headquarters),
    website: toStr(raw.website, fallbackWebsite ?? ''),
    products: toStrArray(raw.products),
    services: toStrArray(raw.services),
    targetMarket: toStr(raw.targetMarket),
    competitors: toStrArray(raw.competitors),
    strengths: toStrArray(raw.strengths),
    recentDevelopments: toStrArray(raw.recentDevelopments),
    socialMedia: {
      linkedin: toStr(sm.linkedin, '') || undefined,
      xing: toStr(sm.xing, '') || undefined,
      twitter: toStr(sm.twitter, '') || undefined,
      facebook: toStr(sm.facebook, '') || undefined,
      instagram: toStr(sm.instagram, '') || undefined,
    },
    financials: {
      estimatedRevenue: toStr(fin.estimatedRevenue, '') || undefined,
      growthTrend: toStr(fin.growthTrend, '') || undefined,
      fundingStatus: toStr(fin.fundingStatus, '') || undefined,
    },
    technologies: toStrArray(raw.technologies),
    certifications: toStrArray(raw.certifications),
    addresses: (addresses as unknown[]).map((a) => {
      const addr = (a ?? {}) as Record<string, unknown>
      return {
        label: toStr(addr.label, 'Standort'),
        street: toStr(addr.street, '') || undefined,
        houseNumber: toStr(addr.houseNumber, '') || undefined,
        postalCode: toStr(addr.postalCode, '') || undefined,
        city: toStr(addr.city, '') || undefined,
        country: toStr(addr.country, '') || undefined,
        phone: toStr(addr.phone, '') || undefined,
        email: toStr(addr.email, '') || undefined,
      }
    }),
    companyProfile: toStr(raw.companyProfile, ''),
    summary: toStr(raw.summary, ''),
  }
}

export const LeadResearchService = {
  async research(input: LeadResearchInput, context?: AIRequestContext): Promise<LeadResearchResult> {
    if (!input.companyName && !input.personName && !input.email) {
      throw new Error('Mindestens Firmenname, Personenname oder E-Mail erforderlich')
    }

    const ctx = context ? { ...context, feature: 'lead_research' } : undefined

    // Template aus DB laden (mit Fallback auf Defaults)
    let prompt: string
    let systemPrompt: string | undefined

    const template = await AiPromptTemplateService.getOrDefault('lead_research')
    systemPrompt = template.systemPrompt || undefined

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      companyName: input.companyName,
      personName: input.personName,
      email: input.email,
      website: input.website,
      additionalContext: input.additionalContext,
      websiteContent: input.websiteContent,
    })

    prompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await aiComplete(prompt, { maxTokens: 4096, temperature: 0.3, systemPrompt }, ctx)

    let result: Omit<LeadResearchResult, 'researchedAt'>
    try {
      result = parseJsonFromResponse(response.text)
      // Validate that summary is not raw JSON (can happen with truncated responses)
      if (result.summary && result.summary.trim().startsWith('{')) {
        result.summary = 'KI-Recherche wurde durchgeführt. Zusammenfassung konnte nicht vollständig erstellt werden.'
      }
    } catch (parseError) {
      logger.error('Lead research parse error', parseError, { module: 'LeadResearchService' })
      // Ensure fallback summary doesn't contain raw JSON
      let fallbackSummary = response.text.substring(0, 500)
      if (fallbackSummary.trim().startsWith('{') || fallbackSummary.trim().startsWith('```')) {
        fallbackSummary = 'KI-Recherche konnte nicht vollständig durchgeführt werden. Bitte erneut versuchen.'
      }
      result = {
        score: 50,
        scoreReasoning: 'Score konnte nicht automatisch ermittelt werden',
        summary: fallbackSummary,
        recommendedActions: ['Manuelle Recherche durchführen', 'Direkte Kontaktaufnahme versuchen'],
      }
    }

    return { ...result, researchedAt: new Date().toISOString() }
  },

  async researchCompany(input: CompanyResearchInput, context?: AIRequestContext): Promise<{
    research: CompanyResearchResult
    scrapedPages: Array<{ url: string; title: string; content: string; scrapedAt: string }>
  }> {
    // Step 0: Load Firecrawl API key from DB
    let firecrawlApiKey: string | undefined
    try {
      const { db } = await import('@/lib/db')
      const { aiProviders } = await import('@/lib/db/schema')
      const { eq, and } = await import('drizzle-orm')

      const [provider] = await db
        .select({ apiKey: aiProviders.apiKey })
        .from(aiProviders)
        .where(
          and(eq(aiProviders.providerType, 'firecrawl'),
            eq(aiProviders.isActive, true)
          )
        )
        .limit(1)

      if (provider?.apiKey) {
        firecrawlApiKey = provider.apiKey
        logger.info('Firecrawl API key loaded from DB', { module: 'LeadResearchService' })
      }
    } catch (err) {
      logger.warn('Could not load Firecrawl API key', { module: 'LeadResearchService' })
    }

    // Step 1: Scrape website if URL available and no website content provided yet
    let enrichedInput = { ...input }
    const scrapedPages: Array<{ url: string; title: string; content: string; scrapedAt: string }> = []
    if (input.website && !input.websiteContent) {
      logger.info(`Scraping website: ${input.website}`, { module: 'LeadResearchService' })
      try {
        const scrapeResult = await WebsiteScraperService.scrapeCompanyWebsite(input.website, firecrawlApiKey)
        if (scrapeResult.success && scrapeResult.combinedText) {
          enrichedInput.websiteContent = scrapeResult.combinedText
          logger.info(`Website scraped successfully (${scrapeResult.combinedText.length} chars)`, { module: 'LeadResearchService' })

          // Collect scraped pages for persistence
          const now = new Date().toISOString()
          if (scrapeResult.mainPage?.success) {
            scrapedPages.push({
              url: scrapeResult.mainPage.url,
              title: scrapeResult.mainPage.title,
              content: scrapeResult.mainPage.text.substring(0, 5000),
              scrapedAt: now,
            })
          }
          for (const sub of scrapeResult.subPages || []) {
            if (sub.success) {
              scrapedPages.push({
                url: sub.url,
                title: sub.title,
                content: sub.text.substring(0, 5000),
                scrapedAt: now,
              })
            }
          }
        }
      } catch (scrapeError) {
        logger.error('Website scraping failed', scrapeError, { module: 'LeadResearchService' })
      }
    }

    const ctx = context ? { ...context, feature: 'company_research' } : undefined

    // Step 2: Template aus DB laden (mit Fallback)
    let prompt: string
    let systemPrompt: string | undefined

    const template = await AiPromptTemplateService.getOrDefault('company_research')
    systemPrompt = template.systemPrompt || undefined

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      name: enrichedInput.name,
      legalForm: enrichedInput.legalForm,
      industry: enrichedInput.industry,
      website: enrichedInput.website,
      city: enrichedInput.city,
      email: enrichedInput.email,
      notes: enrichedInput.notes,
      websiteContent: enrichedInput.websiteContent,
    })

    prompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await aiComplete(prompt, { maxTokens: 8192, temperature: 0.3, systemPrompt }, ctx)

    let result: Omit<CompanyResearchResult, 'researchedAt'>
    try {
      const raw = parseJsonFromResponse(response.text) as Record<string, unknown>
      result = normalizeCompanyResearchResult(raw, input.website)
      // Guard: text fields that accidentally contain raw JSON (truncated responses)
      if (result.summary.trim().startsWith('{')) result.summary = 'KI-Recherche wurde durchgeführt.'
      if (result.companyProfile.trim().startsWith('{')) result.companyProfile = result.description || 'KI-Recherche wurde durchgeführt.'
      if (result.description.trim().startsWith('{')) result.description = 'Beschreibung konnte nicht vollständig erstellt werden.'
      if (!result.companyProfile) result.companyProfile = result.summary
    } catch (parseError) {
      logger.error('Company research parse error', parseError, { module: 'LeadResearchService' })
      result = normalizeCompanyResearchResult({
        description: response.text.substring(0, 500),
        website: input.website || '',
        companyProfile: 'KI-Recherche konnte nicht vollständig durchgeführt werden.',
        summary: 'KI-Recherche konnte nicht vollständig durchgeführt werden.',
      }, input.website)
    }

    return {
      research: { ...result, researchedAt: new Date().toISOString() },
      scrapedPages,
    }
  },

  async researchPerson(input: PersonResearchInput, context?: AIRequestContext): Promise<PersonResearchResult> {
    const ctx = context ? { ...context, feature: 'person_research' } : undefined

    // Template aus DB laden (mit Fallback)
    let prompt: string
    let systemPrompt: string | undefined

    const template = await AiPromptTemplateService.getOrDefault('person_research')
    systemPrompt = template.systemPrompt || undefined

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      company: input.company,
      jobTitle: input.jobTitle,
      city: input.city,
      notes: input.notes,
    })

    prompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    const response = await aiComplete(prompt, { maxTokens: 4096, temperature: 0.3, systemPrompt }, ctx)

    let result: Omit<PersonResearchResult, 'researchedAt'>
    try {
      result = parseJsonFromResponse(response.text)
    } catch (parseError) {
      logger.error('Person research parse error', parseError, { module: 'LeadResearchService' })
      result = {
        fullName: `${input.firstName} ${input.lastName}`,
        jobTitle: input.jobTitle || 'Nicht ermittelbar',
        company: input.company || 'Nicht ermittelbar',
        department: 'Nicht ermittelbar',
        bio: response.text.substring(0, 500),
        expertise: [],
        education: [],
        careerHistory: [],
        languages: [],
        socialMedia: {},
        communicationStyle: 'Nicht ermittelbar',
        decisionMakerLevel: 'Nicht ermittelbar',
        interests: [],
        recommendedApproach: 'Nicht ermittelbar',
        summary: 'KI-Recherche konnte nicht vollständig durchgeführt werden.',
      }
    }

    return { ...result, researchedAt: new Date().toISOString() }
  },

  async quickScore(input: LeadResearchInput, context?: AIRequestContext): Promise<{ score: number; reasoning: string }> {
    const ctx = context ? { ...context, feature: 'lead_score' } : undefined

    // Template aus DB laden (mit Fallback)
    let prompt: string
    let systemPrompt: string | undefined

    const template = await AiPromptTemplateService.getOrDefault('quick_score')
    systemPrompt = template.systemPrompt || undefined

    {
      const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
        companyName: input.companyName,
        personName: input.personName,
        email: input.email,
        website: input.website,
      })

      prompt = template.outputFormat
        ? `${userPrompt}\n\n${template.outputFormat}`
        : userPrompt
    }

    const response = await aiComplete(prompt, { maxTokens: 256, temperature: 0.2, systemPrompt }, ctx)

    try {
      return parseJsonFromResponse(response.text)
    } catch {
      return { score: 50, reasoning: 'Score konnte nicht automatisch ermittelt werden' }
    }
  },
}
