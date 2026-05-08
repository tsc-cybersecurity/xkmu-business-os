import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../../helpers/mock-db'

const ITEM_ID = '00000000-0000-0000-0000-000000000c01'

function itemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    topicId: 't1',
    title: 'News Title',
    url: 'https://example.com/a',
    snippet: 'Snippet text',
    source: 'example.com',
    imageUrl: null,
    publishedAt: null,
    urlHash: 'h',
    pipelineStatus: 'idle',
    pipelineError: null,
    pipelineTaskId: null,
    researchData: null,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('NewsPipelineService — markStatus', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  it('markStatus updates pipeline_status and pipeline_error', async () => {
    dbMock.mockUpdate.mockResolvedValueOnce([itemFixture({ pipelineStatus: 'failed', pipelineError: 'boom' })])
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await NewsPipelineService.markStatus(ITEM_ID, 'failed', 'boom')
    expect(dbMock.db.update).toHaveBeenCalled()
  })
})

describe('NewsPipelineService — deepResearch', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
  })

  function setupAiMock(jsonResponse: unknown) {
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({
          systemPrompt: 'sys',
          userPrompt: 'user {{title}}',
          outputFormat: null,
        }),
        applyPlaceholders: vi.fn().mockImplementation((tmpl: string) => tmpl),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockResolvedValue({
          text: JSON.stringify(jsonResponse),
          provider: 'mock',
          model: 'mock',
        }),
      },
    }))
  }

  it('returns parsed research JSON on happy path', async () => {
    setupAiMock({ summary: 'X', keyPoints: ['a'], sources: [], context: '' })
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    const result = await NewsPipelineService.deepResearch(itemFixture())
    expect(result.summary).toBe('X')
    expect(Array.isArray(result.keyPoints)).toBe(true)
  })

  it('handles AI response wrapped in markdown code block', async () => {
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({ systemPrompt: '', userPrompt: '', outputFormat: null }),
        applyPlaceholders: vi.fn().mockImplementation((t: string) => t),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockResolvedValue({
          text: '```json\n{"summary":"Y","keyPoints":[],"sources":[],"context":""}\n```',
          provider: 'mock',
          model: 'mock',
        }),
      },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    const result = await NewsPipelineService.deepResearch(itemFixture())
    expect(result.summary).toBe('Y')
  })

  it('throws when AI returns no parseable JSON', async () => {
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({ systemPrompt: '', userPrompt: '', outputFormat: null }),
        applyPlaceholders: vi.fn().mockImplementation((t: string) => t),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockResolvedValue({
          text: 'no json here',
          provider: 'mock',
          model: 'mock',
        }),
      },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await expect(NewsPipelineService.deepResearch(itemFixture())).rejects.toThrow(/news-deep-research/)
  })
})

describe('NewsPipelineService — generateBlogPost', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
  })

  function setupAiMock(jsonResponse: unknown) {
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({ systemPrompt: '', userPrompt: '', outputFormat: null }),
        applyPlaceholders: vi.fn().mockImplementation((t: string) => t),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockResolvedValue({
          text: JSON.stringify(jsonResponse),
          provider: 'mock',
          model: 'mock',
        }),
      },
    }))
  }

  it('returns BlogDraft on happy path', async () => {
    setupAiMock({
      title: 'B', excerpt: 'E', content: 'C',
      seoTitle: 'S', seoDescription: 'D', tags: ['t'],
    })
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    const draft = await NewsPipelineService.generateBlogPost(itemFixture(), {
      summary: 's', keyPoints: [], sources: [], context: '',
    })
    expect(draft.title).toBe('B')
    expect(draft.tags).toEqual(['t'])
  })

  it('throws when title or content missing', async () => {
    setupAiMock({ excerpt: 'E' }) // no title or content
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await expect(
      NewsPipelineService.generateBlogPost(itemFixture(), {
        summary: 's', keyPoints: [], sources: [], context: '',
      }),
    ).rejects.toThrow(/news-blog-draft/)
  })
})
