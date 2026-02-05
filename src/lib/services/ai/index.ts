import { AIService } from './ai.service'
import { GeminiProvider } from './gemini.provider'
import { OpenAIProvider } from './openai.provider'
import { OllamaProvider } from './ollama.provider'

// Register static fallback providers (für Legacy-Kompatibilität)
// Diese werden nur verwendet, wenn keine DB-Provider konfiguriert sind
//
// Priority order for Vercel/Cloud deployment:
// 1. Gemini (Google AI) - cost-effective, recommended
// 2. OpenAI - reliable fallback
// 3. Ollama - only available in local/self-hosted environments
//
// Ollama wird nur registriert wenn OLLAMA_BASE_URL gesetzt ist
// (für lokale Entwicklung oder selbst-gehostete Umgebungen)

AIService.registerProvider(new GeminiProvider())
AIService.registerProvider(new OpenAIProvider())

// Ollama nur registrieren wenn explizit konfiguriert (nicht verfügbar auf Vercel)
if (process.env.OLLAMA_BASE_URL) {
  AIService.registerProvider(new OllamaProvider())
}

export { AIService }
export type { AIOptions, AIResponse, AIProvider, AIRequestContext } from './ai.service'
export { GeminiProvider } from './gemini.provider'
export { OpenAIProvider } from './openai.provider'
export { OllamaProvider } from './ollama.provider'
export { OpenRouterProvider } from './openrouter.provider'
export { LeadResearchService } from './lead-research.service'
export { WebsiteScraperService } from './website-scraper.service'
export { IdeaAIService } from './idea-ai.service'
export { OutreachService } from './outreach.service'
export { DocumentAnalysisService } from './document-analysis.service'
export type {
  LeadResearchInput,
  LeadResearchResult,
  CompanyResearchInput,
  CompanyResearchResult,
  CompanyAddress,
  PersonResearchInput,
  PersonResearchResult,
} from './lead-research.service'
export type { IdeaProcessingResult } from './idea-ai.service'
export type { OutreachResult } from './outreach.service'
export type { DocumentAnalysisResult } from './document-analysis.service'
