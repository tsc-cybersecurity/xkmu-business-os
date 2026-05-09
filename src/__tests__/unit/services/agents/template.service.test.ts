import { describe, it, expect, vi, beforeEach } from 'vitest'

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
vi.mock('@/lib/db', () => ({ db: { select: selectMock } }))
vi.mock('@/lib/db/schema', () => ({ agentGoalTemplates: { id: 'id', slug: 'slug', isActive: 'isActive' } }))

const goalCreateMock = vi.fn()
const goalStartMock = vi.fn()
vi.mock('@/lib/services/agents/goal.service', () => ({
  GoalService: { create: goalCreateMock, start: goalStartMock },
}))

describe('TemplateService.list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert nur aktive Templates', async () => {
    const orderBy = vi.fn().mockResolvedValue([
      { id: 't1', slug: 'firma-recherchieren', name: 'Firma recherchieren', isActive: true },
    ])
    selectWhereMock.mockReturnValueOnce({ orderBy, limit: selectLimitMock })
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    const r = await TemplateService.list()
    expect(r).toHaveLength(1)
    expect(r[0].slug).toBe('firma-recherchieren')
  })
})

describe('TemplateService.createGoalFromTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rendert Title + Description, ruft GoalService.create + start', async () => {
    selectLimitMock.mockResolvedValueOnce([{
      id: 't1', slug: 'firma-recherchieren', name: 'Firma',
      titleTemplate: 'Recherche: {{firmenName}}',
      descriptionTemplate: 'Recherchiere {{firmenName}}',
      requiredVariables: ['firmenName'],
      defaultBudgetCents: 500, defaultBudgetTokens: null,
      defaultExecutionMode: 'cron', defaultPriority: 2,
      defaultRequirePlanApproval: false,
      isActive: true,
    }])
    goalCreateMock.mockResolvedValueOnce({ id: 'g1' })
    goalStartMock.mockResolvedValueOnce({ runId: 'r1' })

    const { TemplateService } = await import('@/lib/services/agents/template.service')
    const r = await TemplateService.createGoalFromTemplate('t1', { firmenName: 'Acme GmbH' })

    expect(goalCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Recherche: Acme GmbH',
      description: 'Recherchiere Acme GmbH',
      executionMode: 'cron',
      budgetCents: 500,
      priority: 2,
    }))
    expect(goalStartMock).toHaveBeenCalledWith('g1')
    expect(r.goalId).toBe('g1')
    expect(r.runId).toBe('r1')
  })

  it('wirft wenn requiredVariables fehlt', async () => {
    selectLimitMock.mockResolvedValueOnce([{
      id: 't1', slug: 'firma-recherchieren', titleTemplate: '{{firmenName}}',
      descriptionTemplate: '', requiredVariables: ['firmenName'],
      defaultBudgetCents: null, defaultBudgetTokens: null,
      defaultExecutionMode: 'cron', defaultPriority: 2,
      defaultRequirePlanApproval: false, isActive: true,
    }])
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    await expect(TemplateService.createGoalFromTemplate('t1', {})).rejects.toThrow(/firmenName/)
  })

  it('wirft wenn Template nicht existiert', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { TemplateService } = await import('@/lib/services/agents/template.service')
    await expect(TemplateService.createGoalFromTemplate('t-x', {})).rejects.toThrow(/nicht gefunden/)
  })
})
