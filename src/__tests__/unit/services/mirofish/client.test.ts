import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('MirofishClient', () => {
  const ORIGINAL_ENV = process.env.MIROFISH_BASE_URL

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (ORIGINAL_ENV === undefined) delete process.env.MIROFISH_BASE_URL
    else process.env.MIROFISH_BASE_URL = ORIGINAL_ENV
  })

  describe('healthcheck', () => {
    it('returns true on HTTP 200', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', fetchMock)
      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      const ok = await MirofishClient.healthcheck()
      expect(ok).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith('http://mirofish:5001/', { method: 'GET' })
    })

    it('returns false on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      expect(await MirofishClient.healthcheck()).toBe(false)
    })

    it('returns false on non-2xx', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      expect(await MirofishClient.healthcheck()).toBe(false)
    })
  })

  describe('simulate', () => {
    it('POSTs to /simulate and normalizes snake_case → camelCase', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            summary: 'Zielgruppe reagiert vorsichtig.',
            risk_signals: [
              { severity: 'high', description: 'Preisakzeptanz unsicher' },
              { severity: 'medium', description: 'Konkurrenz aktiv' },
            ],
            narrative_paths: [
              { persona: 'Inhaberin Friseursalon', reaction: 'skeptisch', reasoning: 'Investitionssumme hoch' },
            ],
            follow_up_questions: ['Wie sind die Wartungskosten kalkuliert?'],
          }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      const result = await MirofishClient.simulate({
        question: 'Wie reagieren KMU auf das Angebot?',
        seedMaterials: [
          { filename: 'plan.md', contentType: 'text/markdown', content: '# Plan\n…' },
        ],
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('http://mirofish:5001/simulate')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      const body = JSON.parse(init.body)
      expect(body.question).toBe('Wie reagieren KMU auf das Angebot?')
      expect(body.seedMaterials).toHaveLength(1)

      expect(result.summary).toBe('Zielgruppe reagiert vorsichtig.')
      expect(result.riskSignals).toHaveLength(2)
      expect(result.riskSignals[0]).toEqual({ severity: 'high', description: 'Preisakzeptanz unsicher' })
      expect(result.narrativePaths).toHaveLength(1)
      expect(result.narrativePaths[0].persona).toBe('Inhaberin Friseursalon')
      expect(result.followUpQuestions).toEqual(['Wie sind die Wartungskosten kalkuliert?'])
      expect(result.rawResponse).toBeDefined()
    })

    it('uses MIROFISH_BASE_URL from env when set', async () => {
      process.env.MIROFISH_BASE_URL = 'https://mirofish.example.com'
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ summary: '', risk_signals: [], narrative_paths: [], follow_up_questions: [] }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      await MirofishClient.simulate({ question: 'q', seedMaterials: [] })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://mirofish.example.com/simulate',
        expect.any(Object),
      )
    })

    it('throws on non-2xx with body excerpt in message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable: upstream LLM offline'),
      }))
      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      await expect(MirofishClient.simulate({ question: 'q', seedMaterials: [] }))
        .rejects.toThrow(/HTTP 503.*Service Unavailable/)
    })

    it('defends against missing/malformed fields in response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ summary: 'ok' }), // alle arrays fehlen
      }))
      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      const result = await MirofishClient.simulate({ question: 'q', seedMaterials: [] })
      expect(result.summary).toBe('ok')
      expect(result.riskSignals).toEqual([])
      expect(result.narrativePaths).toEqual([])
      expect(result.followUpQuestions).toEqual([])
    })

    it('clamps invalid severity to "medium"', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          summary: 's',
          risk_signals: [{ severity: 'critical', description: 'X' }],
          narrative_paths: [],
          follow_up_questions: [],
        }),
      }))
      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      const result = await MirofishClient.simulate({ question: 'q', seedMaterials: [] })
      expect(result.riskSignals[0].severity).toBe('medium')
    })
  })
})
