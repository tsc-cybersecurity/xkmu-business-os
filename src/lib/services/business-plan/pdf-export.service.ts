/**
 * PDF-Export-Service: rendert einen Businessplan zu einem PDF-Buffer.
 * Wird von /api/v1/business-plans/[id]/export.pdf aufgerufen.
 *
 * Strategie: aktuell wird die letzte "done"-Iteration verwendet — wenn
 * keine vorhanden ist (z.B. failed in Iter 1), fallback auf die letzte
 * existierende Iteration. Bei einem komplett leeren Plan (status=idle/
 * running ohne Iteration) wird ein Fehler geworfen, weil es nichts zu
 * exportieren gibt.
 */
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { BusinessPlanService } from './business-plan.service'
import { BusinessPlanPDF, type BusinessPlanPDFProps } from '@/components/business-plan/BusinessPlanPDF'

export class BusinessPlanExportError extends Error {
  constructor(public code: 'not_found' | 'no_iteration' | 'render_failed', message: string) {
    super(message)
  }
}

export const BusinessPlanExportService = {
  async generatePdf(planId: string): Promise<{ buffer: Buffer; filename: string }> {
    const data = await BusinessPlanService.getWithIterations(planId)
    if (!data) throw new BusinessPlanExportError('not_found', `Plan ${planId} nicht gefunden`)
    const { plan, iterations } = data

    // Letzte "done"-Iteration bevorzugen, sonst letzte beliebige
    const sorted = [...iterations].sort((a, b) => b.iterationNumber - a.iterationNumber)
    const latest = sorted.find((it) => it.status === 'done') ?? sorted[0]
    if (!latest) {
      throw new BusinessPlanExportError(
        'no_iteration',
        'Plan hat noch keine Iteration durchlaufen — kein Inhalt fuer Export verfuegbar.',
      )
    }

    const props: BusinessPlanPDFProps = {
      title: plan.title,
      mode: plan.mode as 'canvas' | 'kfw' | 'both',
      status: plan.status,
      finalScore: plan.finalScore,
      scoreThreshold: plan.scoreThreshold,
      currentIteration: plan.currentIteration,
      maxIterations: plan.maxIterations,
      createdAt: plan.createdAt instanceof Date ? plan.createdAt.toISOString() : (plan.createdAt as string | null),
      canvas: latest.planCanvas as BusinessPlanPDFProps['canvas'],
      kfwMarkdown: latest.planKfwMarkdown,
      analysis: latest.analysis as BusinessPlanPDFProps['analysis'],
    }

    let buffer: Buffer
    try {
      buffer = (await renderToBuffer(createElement(BusinessPlanPDF, props))) as Buffer
    } catch (err) {
      throw new BusinessPlanExportError(
        'render_failed',
        `PDF-Rendering fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    const safeTitle = plan.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60) || 'businessplan'
    const filename = `${safeTitle}_iter${latest.iterationNumber}.pdf`

    return { buffer, filename }
  },
}
