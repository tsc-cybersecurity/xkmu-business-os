import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('BusinessPlanActions', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function mockTemplateService(responses: Record<string, unknown>) {
    let callCount = 0
    // @/lib/db wird transitiv von AI-Services importiert (AI-Logs etc.).
    // Wir mocken eine voll chain-faehige db, damit nirgends ".limit is not
    // a function" oder DATABASE_URL-Errors greifen. Jeder Chain-Step gibt
    // ein Promise-resolves-to-[] zurueck (Default).
    vi.doMock('@/lib/db', () => {
      const chain: any = {}
      const passthrough = ['from', 'where', 'limit', 'set', 'values', 'orderBy', 'leftJoin', 'innerJoin', 'groupBy']
      for (const m of passthrough) chain[m] = vi.fn().mockReturnValue(chain)
      chain.returning = vi.fn().mockResolvedValue([])
      chain.execute = vi.fn().mockResolvedValue([])
      // Awaiting chain directly → leeres Array (postgres-driver Pattern)
      chain.then = (resolve: any) => Promise.resolve([]).then(resolve)
      return {
        db: {
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          select: vi.fn(() => chain),
          delete: vi.fn(() => chain),
        },
      }
    })
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({
          systemPrompt: '',
          userPrompt: '',
          outputFormat: null,
        }),
        applyPlaceholders: vi.fn().mockImplementation((t: string) => t),
      },
    }))
    vi.doMock('@/lib/services/ai-provider.service', () => ({
      AiProviderService: {
        getDefaultProvider: vi.fn().mockResolvedValue({ id: 'prov1' }),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockImplementation(async (prompt: string) => {
          // simple keyword routing: erkennt aus dem Prompt, welches Template aufgerufen wird
          // Tests setzen passende Responses per Key
          const slug = Object.keys(responses).find((s) =>
            prompt.includes(s) || responses[s] === undefined,
          )
          callCount++
          // Wir nutzen einfach call-index als Fallback-Selector
          const keys = Object.keys(responses)
          const key = keys[callCount - 1] ?? keys[0]
          return {
            text: JSON.stringify(responses[key]),
            provider: 'mock',
            model: 'mock',
          }
        }),
      },
    }))
  }

  describe('generateBusinessPlanAction', () => {
    it('returns only canvas when mode=canvas', async () => {
      mockTemplateService({
        canvas: {
          problem: ['P1'], solution: ['S1'], keyMetrics: ['K1'],
          uniqueValueProposition: 'UVP', unfairAdvantage: ['UA1'],
          channels: ['C1'], customerSegments: ['CS1'],
          costStructure: ['Cost1'], revenueStreams: ['R1'],
        },
      })
      const { generateBusinessPlanAction } = await import('@/lib/services/business-plan/actions')
      const res = await generateBusinessPlanAction(
        { triggerData: {}, stepResults: {} },
        { story: 'A story', mode: 'canvas', planId: 'p1' },
      )
      expect(res.success).toBe(true)
      expect(res.data?.canvas).toBeDefined()
      expect(res.data?.kfw).toBeUndefined()
    })

    it('returns only kfw when mode=kfw', async () => {
      mockTemplateService({ kfw: { markdown: '## EXEC' } })
      const { generateBusinessPlanAction } = await import('@/lib/services/business-plan/actions')
      const res = await generateBusinessPlanAction(
        { triggerData: {}, stepResults: {} },
        { story: 'A story', mode: 'kfw', planId: 'p1' },
      )
      expect(res.success).toBe(true)
      expect(res.data?.kfw).toEqual({ markdown: '## EXEC' })
      expect(res.data?.canvas).toBeUndefined()
    })

    it('returns both when mode=both', async () => {
      mockTemplateService({
        canvas: {
          problem: ['P1'], solution: ['S1'], keyMetrics: ['K1'],
          uniqueValueProposition: 'UVP', unfairAdvantage: ['UA1'],
          channels: ['C1'], customerSegments: ['CS1'],
          costStructure: ['Cost1'], revenueStreams: ['R1'],
        },
        kfw: { markdown: '## EXEC' },
      })
      const { generateBusinessPlanAction } = await import('@/lib/services/business-plan/actions')
      const res = await generateBusinessPlanAction(
        { triggerData: {}, stepResults: {} },
        { story: 'A story', mode: 'both', planId: 'p1' },
      )
      expect(res.success).toBe(true)
      expect(res.data?.canvas).toBeDefined()
      expect(res.data?.kfw).toBeDefined()
    })

    it('fails when story is empty', async () => {
      const { generateBusinessPlanAction } = await import('@/lib/services/business-plan/actions')
      const res = await generateBusinessPlanAction(
        { triggerData: {}, stepResults: {} },
        { story: '', mode: 'canvas' },
      )
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/story fehlt/)
    })
  })

  describe('simulateWithMirofishAction', () => {
    it('formulates question and forwards plan content to MirofishClient', async () => {
      mockTemplateService({
        question_template: { question: 'Wie reagieren Friseure in TH auf das Angebot?' },
      })
      const simulateMock = vi.fn().mockResolvedValue({
        summary: 'OK',
        riskSignals: [],
        narrativePaths: [],
        followUpQuestions: [],
        rawResponse: {},
      })
      vi.doMock('@/lib/services/mirofish/client', () => ({
        MirofishClient: { simulate: simulateMock },
      }))

      const { simulateWithMirofishAction } = await import('@/lib/services/business-plan/actions')
      const res = await simulateWithMirofishAction(
        { triggerData: {}, stepResults: {} },
        {
          plan: { kfw: { markdown: '## Plan-Markdown' } },
          mode: 'kfw',
          seedInput: { idea: 'X' },
          planId: 'p1',
        },
      )

      expect(res.success).toBe(true)
      expect(simulateMock).toHaveBeenCalledTimes(1)
      const callArg = simulateMock.mock.calls[0][0]
      expect(callArg.question).toBe('Wie reagieren Friseure in TH auf das Angebot?')
      expect(callArg.seedMaterials).toHaveLength(1)
      expect(callArg.seedMaterials[0].content).toContain('## Plan-Markdown')
      expect(callArg.seedMaterials[0].contentType).toBe('text/markdown')
    })

    it('fails when plan is missing', async () => {
      mockTemplateService({})
      vi.doMock('@/lib/services/mirofish/client', () => ({ MirofishClient: { simulate: vi.fn() } }))
      const { simulateWithMirofishAction } = await import('@/lib/services/business-plan/actions')
      const res = await simulateWithMirofishAction(
        { triggerData: {}, stepResults: {} },
        { mode: 'canvas' },
      )
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/plan fehlt/)
    })
  })

  describe('analyzeSimulationAction', () => {
    it('returns normalized analysis with score in 0-100', async () => {
      mockTemplateService({
        analysis: {
          score: 78,
          reasoning: 'Solide, aber Preisanker zu hoch',
          strengths: ['Klare Zielgruppe'],
          weaknesses: ['Preisakzeptanz unsicher'],
          improvements: ['Preis von 299 auf 199 senken'],
        },
      })
      const { analyzeSimulationAction } = await import('@/lib/services/business-plan/actions')
      const res = await analyzeSimulationAction(
        { triggerData: {}, stepResults: {} },
        {
          plan: { kfw: { markdown: '## Plan' } },
          simulationResult: { summary: 'X' },
          planId: 'p1',
        },
      )
      expect(res.success).toBe(true)
      expect(res.data?.score).toBe(78)
      expect((res.data?.improvements as string[]).length).toBe(1)
    })

    it('rejects out-of-range score', async () => {
      mockTemplateService({
        analysis: {
          score: 250,
          reasoning: 'bad',
          strengths: [],
          weaknesses: [],
          improvements: [],
        },
      })
      const { analyzeSimulationAction } = await import('@/lib/services/business-plan/actions')
      const res = await analyzeSimulationAction(
        { triggerData: {}, stepResults: {} },
        {
          plan: { kfw: { markdown: '## Plan' } },
          simulationResult: { summary: 'X' },
        },
      )
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/0-100/)
    })

    it('defends against missing arrays in AI response', async () => {
      mockTemplateService({ analysis: { score: 60 } })
      const { analyzeSimulationAction } = await import('@/lib/services/business-plan/actions')
      const res = await analyzeSimulationAction(
        { triggerData: {}, stepResults: {} },
        {
          plan: { kfw: { markdown: '## Plan' } },
          simulationResult: { summary: 'X' },
        },
      )
      expect(res.success).toBe(true)
      expect(res.data?.strengths).toEqual([])
      expect(res.data?.weaknesses).toEqual([])
      expect(res.data?.improvements).toEqual([])
    })
  })
})
