import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { logger } from '@/lib/utils/logger'

export interface DocumentAnalysisResult {
  extractedText: string
  financialKPIs: {
    revenue?: string
    profit?: string
    ebitda?: string
    employeeCount?: string
    growthRate?: string
    [key: string]: string | undefined
  }
  summary: string
  documentType: string
  analyzedAt: string
}

export const DocumentAnalysisService = {
  /**
   * Analysiert ein PDF-Dokument und extrahiert KPIs und eine Zusammenfassung
   */
  async analyzeDocument(
    pdfBuffer: Buffer,
    companyName: string,
    context: AIRequestContext
  ): Promise<DocumentAnalysisResult> {
    // 1. Text aus PDF extrahieren
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) })
    const textResult = await parser.getText()
    const extractedText = (textResult.text || '').substring(0, 15000) // Limit auf 15k chars

    if (!extractedText.trim()) {
      throw new Error('Kein Text im PDF gefunden. Bitte überprüfen Sie, ob das PDF durchsuchbar ist.')
    }

    // 2. Template laden
    const template = await AiPromptTemplateService.getOrDefault('', 'document_analysis')

    const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
      companyName,
      documentText: extractedText,
    })

    const fullPrompt = template.outputFormat
      ? `${userPrompt}\n\n${template.outputFormat}`
      : userPrompt

    // 3. KI aufrufen
    const response = await AIService.completeWithContext(fullPrompt, {
      ...context,
      feature: 'document_analysis',
    }, {
      maxTokens: 3000,
      temperature: 0.2,
      systemPrompt: template.systemPrompt,
    })

    // 4. JSON parsen
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          extractedText: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? '...' : ''),
          financialKPIs: parsed.financialKPIs || parsed.kpis || {},
          summary: parsed.summary || parsed.zusammenfassung || 'Keine Zusammenfassung verfügbar',
          documentType: parsed.documentType || parsed.dokumenttyp || 'unbekannt',
          analyzedAt: new Date().toISOString(),
        }
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON in document analysis, using raw text as summary', { module: 'DocumentAnalysisService', feature: 'analyzeDocument' })
      logger.debug('Parse error detail', { module: 'DocumentAnalysisService', error: String(parseError) })
    }

    return {
      extractedText: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? '...' : ''),
      financialKPIs: {},
      summary: response.text.substring(0, 500),
      documentType: 'unbekannt',
      analyzedAt: new Date().toISOString(),
    }
  },
}
