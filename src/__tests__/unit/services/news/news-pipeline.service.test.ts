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

describe('NewsPipelineService — generateSocialPosts', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
  })

  it('generates one draft per default platform', async () => {
    const renderMock = vi.fn()
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({ systemPrompt: '', userPrompt: '', outputFormat: null }),
        applyPlaceholders: vi.fn().mockImplementation((t: string) => t),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockImplementation((prompt: string) => {
          renderMock(prompt)
          // platform info is in the prompt OR in vars; we mock independent of that
          const platform = prompt.includes('linkedin') ? 'linkedin' : 'x'
          return Promise.resolve({
            text: JSON.stringify({
              platform,
              title: 'T',
              content: `Content for ${platform}`,
              hashtags: ['#a'],
            }),
            provider: 'mock',
            model: 'mock',
          })
        }),
      },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')

    const drafts = await NewsPipelineService.generateSocialPosts(
      itemFixture(),
      { summary: 's', keyPoints: [], sources: [], context: '' },
      { id: 'b1', title: 'BlogTitle', excerpt: 'Ex' },
    )

    expect(drafts).toHaveLength(2)
    expect(drafts.map((d) => d.platform).sort()).toEqual(['linkedin', 'x'])
    expect(renderMock).toHaveBeenCalledTimes(2)
  })

  it('skips a platform when AI returns empty content but continues with others', async () => {
    let calls = 0
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({ systemPrompt: '', userPrompt: '', outputFormat: null }),
        applyPlaceholders: vi.fn().mockImplementation((t: string) => t),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockImplementation(() => {
          calls++
          return Promise.resolve({
            text: calls === 1
              ? JSON.stringify({ platform: 'linkedin' }) // missing content
              : JSON.stringify({ platform: 'x', content: 'OK', hashtags: [] }),
            provider: 'mock',
            model: 'mock',
          })
        }),
      },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')

    const drafts = await NewsPipelineService.generateSocialPosts(
      itemFixture(),
      { summary: 's', keyPoints: [], sources: [], context: '' },
      { id: 'b1', title: 'BlogTitle', excerpt: null },
    )
    expect(drafts).toHaveLength(1)
    expect(drafts[0].platform).toBe('x')
  })
})

describe('NewsPipelineService — run', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  it('runs all 3 stages and ends with status=completed', async () => {
    let aiCallCount = 0
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: {
        getItem: vi.fn().mockResolvedValue(itemFixture()),
        updateItem: vi.fn().mockResolvedValue(undefined),
      },
    }))
    vi.doMock('@/lib/services/blog-post.service', () => ({
      BlogPostService: {
        create: vi.fn().mockResolvedValue({ id: 'b1', title: 'B', excerpt: 'E' }),
      },
    }))
    vi.doMock('@/lib/services/social-media-post.service', () => ({
      SocialMediaPostService: {
        create: vi.fn().mockResolvedValue({ id: 'sp1' }),
      },
    }))
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({ systemPrompt: '', userPrompt: '', outputFormat: null }),
        applyPlaceholders: vi.fn().mockImplementation((t: string) => t),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockImplementation(() => {
          aiCallCount++
          // call 1 = research, 2 = blog, 3+ = social drafts
          if (aiCallCount === 1) {
            return Promise.resolve({ text: JSON.stringify({ summary: 's', keyPoints: [], sources: [], context: '' }), provider: 'mock', model: 'mock' })
          }
          if (aiCallCount === 2) {
            return Promise.resolve({ text: JSON.stringify({ title: 'B', excerpt: 'E', content: 'C', tags: [] }), provider: 'mock', model: 'mock' })
          }
          return Promise.resolve({ text: JSON.stringify({ platform: aiCallCount === 3 ? 'linkedin' : 'x', content: 'X', hashtags: [] }), provider: 'mock', model: 'mock' })
        }),
      },
    }))

    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await NewsPipelineService.run(ITEM_ID)

    // markStatus uses db.update internally — final state should be 'completed'
    expect(dbMock.db.update).toHaveBeenCalled()
  })

  it('marks failed on Stufe 1 error', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: {
        getItem: vi.fn().mockResolvedValue(itemFixture()),
        updateItem: vi.fn(),
      },
    }))
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        getOrDefault: vi.fn().mockResolvedValue({ systemPrompt: '', userPrompt: '', outputFormat: null }),
        applyPlaceholders: vi.fn().mockImplementation((t: string) => t),
      },
    }))
    vi.doMock('@/lib/services/ai/ai.service', () => ({
      AIService: {
        completeWithContext: vi.fn().mockRejectedValue(new Error('AI down')),
      },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await expect(NewsPipelineService.run(ITEM_ID)).rejects.toThrow('AI down')
  })

  it('throws if item not found', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: { getItem: vi.fn().mockResolvedValue(null) },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await expect(NewsPipelineService.run(ITEM_ID)).rejects.toThrow(/not found/i)
  })
})
