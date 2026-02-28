import { AiProviderService } from '@/lib/services/ai-provider.service'
import { KieProvider } from './kie.provider'

interface VideoGenerationParams {
  prompt: string
  model?: string
  aspectRatio?: '9:16' | '16:9' | '1:1'
  mode?: 'std' | 'pro'
  sound?: boolean
  multiShots?: boolean
  imageUrls?: string[]
}

interface VideoTaskResult {
  taskId: string
  status: string
  progress?: number
  resultUrl?: string
  error?: string
}

export const KieService = {
  /**
   * Findet den kie.ai Provider für einen Tenant
   */
  async getProvider(tenantId: string): Promise<KieProvider> {
    const providers = await AiProviderService.getActiveProviders(tenantId)
    const kieConfig = providers.find((p) => p.providerType === 'kie')

    if (!kieConfig || !kieConfig.apiKey) {
      throw new Error('Kein kie.ai Provider konfiguriert. Bitte in den Einstellungen anlegen.')
    }

    return new KieProvider({ apiKey: kieConfig.apiKey })
  },

  /**
   * Startet eine Video-Generierung
   */
  async createVideoTask(
    tenantId: string,
    userId: string | null,
    params: VideoGenerationParams
  ): Promise<{ taskId: string }> {
    const startTime = Date.now()
    const provider = await this.getProvider(tenantId)

    try {
      const result = await provider.generateVideo(params.prompt, {
        model: params.model,
        aspectRatio: params.aspectRatio,
        mode: params.mode,
        sound: params.sound,
        multiShots: params.multiShots,
        imageUrls: params.imageUrls,
      })

      // Erfolg loggen (fire-and-forget)
      AiProviderService.createLog({
        tenantId,
        providerId: null,
        userId,
        providerType: 'kie',
        model: params.model || 'market/kling/kling-3.0',
        prompt: params.prompt,
        response: JSON.stringify({ taskId: result.taskId }),
        status: 'success',
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        durationMs: Date.now() - startTime,
        feature: 'video_generation',
        entityType: null,
        entityId: null,
      }).catch((err) => {
        console.error('Failed to log kie.ai request:', err)
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Fehler loggen (fire-and-forget)
      AiProviderService.createLog({
        tenantId,
        providerId: null,
        userId,
        providerType: 'kie',
        model: params.model || 'market/kling/kling-3.0',
        prompt: params.prompt,
        status: 'error',
        errorMessage,
        durationMs: Date.now() - startTime,
        feature: 'video_generation',
        entityType: null,
        entityId: null,
      }).catch((err) => {
        console.error('Failed to log kie.ai error:', err)
      })

      throw error
    }
  },

  /**
   * Fragt den Status einer Video-Generierung ab
   */
  async getTaskStatus(tenantId: string, taskId: string): Promise<VideoTaskResult> {
    const provider = await this.getProvider(tenantId)
    const status = await provider.getTaskStatus(taskId)

    return {
      taskId,
      ...status,
    }
  },

  /**
   * Polling mit Exponential Backoff bis die Aufgabe fertig ist
   */
  async waitForCompletion(
    tenantId: string,
    taskId: string,
    maxWaitMs = 300000 // 5 Minuten default
  ): Promise<VideoTaskResult> {
    const startTime = Date.now()
    let delay = 2000 // Start mit 2s

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.getTaskStatus(tenantId, taskId)

      if (result.status === 'completed' || result.status === 'success') {
        return result
      }

      if (result.status === 'failed' || result.status === 'error') {
        throw new Error(`Video-Generierung fehlgeschlagen: ${result.error || 'Unbekannter Fehler'}`)
      }

      // Warten mit Exponential Backoff (max 15s)
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay = Math.min(delay * 1.5, 15000)
    }

    throw new Error(`Video-Generierung Timeout nach ${maxWaitMs / 1000}s`)
  },
}
