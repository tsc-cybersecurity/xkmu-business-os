import { AIService, type AIRequestContext } from './ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { N8nService } from '@/lib/services/n8n.service'

export const N8nWorkflowBuilderService = {
  /**
   * Generiert ein n8n-Workflow-JSON aus einer natürlichsprachlichen Beschreibung.
   * System-Prompt wird aus der DB geladen (oder Default aus DEFAULT_TEMPLATES).
   */
  async generateWorkflow(
    tenantId: string,
    userId: string | null,
    prompt: string
  ): Promise<{ workflowJson: Record<string, unknown>; logId: string }> {
    // Prompt-Template aus DB laden (oder Fallback auf DEFAULT_TEMPLATES)
    const template = await AiPromptTemplateService.getOrDefault('n8n_workflow_builder')
    const systemPrompt = template.systemPrompt
    const outputFormat = template.outputFormat

    const context: AIRequestContext = {
      userId,
      feature: 'n8n_workflow_builder',
    }

    const fullPrompt = `Erstelle einen n8n-Workflow für folgende Beschreibung:\n\n${prompt}${outputFormat ? `\n\n${outputFormat}` : ''}`

    const response = await AIService.completeWithContext(
      fullPrompt,
      context,
      {
        systemPrompt,
        maxTokens: 4000,
        temperature: 0.3,
      }
    )

    // JSON aus der Antwort extrahieren
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Log mit Fehler erstellen
      const log = await N8nService.createWorkflowLog({
        prompt,
        status: 'error',
        errorMessage: 'KI konnte kein valides Workflow-JSON generieren',
        createdBy: userId || undefined,
      })

      throw new Error('KI konnte kein valides Workflow-JSON generieren')
    }

    let workflowJson: Record<string, unknown>
    try {
      workflowJson = JSON.parse(jsonMatch[0])
    } catch {
      const log = await N8nService.createWorkflowLog({
        prompt,
        generatedJson: jsonMatch[0],
        status: 'error',
        errorMessage: 'Generiertes JSON ist nicht valide',
        createdBy: userId || undefined,
      })

      throw new Error('Generiertes JSON ist nicht valide')
    }

    // Log erstellen
    const log = await N8nService.createWorkflowLog({
      n8nWorkflowName: (workflowJson.name as string) || 'Generierter Workflow',
      prompt,
      generatedJson: workflowJson,
      status: 'draft',
      createdBy: userId || undefined,
    })

    return { workflowJson, logId: log.id }
  },

  /**
   * Generiert und deployt einen Workflow direkt auf n8n
   */
  async generateAndDeploy(
    tenantId: string,
    userId: string | null,
    prompt: string
  ): Promise<{ workflowJson: Record<string, unknown>; workflowId: string; logId: string }> {
    const { workflowJson, logId } = await this.generateWorkflow(userId, prompt)

    try {
      const created = await N8nService.createWorkflow(workflowJson)

      // Log aktualisieren
      await N8nService.updateWorkflowLog(logId, {
        n8nWorkflowId: created.id,
        n8nWorkflowName: created.name,
        status: 'deployed',
      })

      return { workflowJson, workflowId: created.id, logId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      await N8nService.updateWorkflowLog(logId, {
        status: 'error',
        errorMessage: `Deploy fehlgeschlagen: ${errorMessage}`,
      })

      throw error
    }
  },
}
