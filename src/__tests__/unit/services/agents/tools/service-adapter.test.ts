import { describe, it, expect, vi, beforeEach } from 'vitest'

const leadResearchMock = vi.fn()

vi.mock('@/lib/services/ai', () => ({
  LeadResearchService: { research: leadResearchMock },
  WebsiteScraperService: { scrapeCompanyWebsite: vi.fn().mockResolvedValue({ mainPage: {}, subPages: [], combinedText: '# Hello', success: true }) },
}))

describe('Service-Tool-Adapter', () => {
  beforeEach(() => {
    leadResearchMock.mockReset()
  })

  it('list() liefert die fest registrierten Service-Tools', async () => {
    const { serviceToolAdapter } = await import('@/lib/services/agents/tools/service-adapter')
    const tools = await serviceToolAdapter.list()
    expect(tools.length).toBeGreaterThanOrEqual(2)
    const names = tools.map((t) => t.ref.name)
    expect(names).toContain('lead-research')
    expect(names).toContain('website-scraper')
  })

  it('invoke service:website-scraper delegiert', async () => {
    const { serviceToolAdapter } = await import('@/lib/services/agents/tools/service-adapter')
    const r = await serviceToolAdapter.invoke({
      ref: { namespace: 'service', name: 'website-scraper', raw: 'service:website-scraper' },
      input: { url: 'https://example.com' },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(r.output).toEqual({ mainPage: {}, subPages: [], combinedText: '# Hello', success: true })
  })

  it('invoke unbekannter service-Name liefert failed', async () => {
    const { serviceToolAdapter } = await import('@/lib/services/agents/tools/service-adapter')
    const r = await serviceToolAdapter.invoke({
      ref: { namespace: 'service', name: 'unknown-service', raw: 'service:unknown-service' },
      input: {},
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/unbekannter Service/)
  })
})
