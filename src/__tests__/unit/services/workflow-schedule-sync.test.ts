import { describe, it, expect, vi, beforeEach } from 'vitest'

// Helper to get drizzle table name via Symbol
function getTableName(tbl: any): string {
  if (!tbl) return ''
  const sym = Object.getOwnPropertySymbols(tbl).find(s => s.toString() === 'Symbol(drizzle:Name)')
  return sym ? String(tbl[sym]) : ''
}

describe('WorkflowService.syncSchedule', () => {
  let cronJobsState: Array<Record<string, any>> = []
  let workflowsState: Array<Record<string, any>> = []

  beforeEach(() => {
    vi.resetModules()
    cronJobsState = []
    workflowsState = []

    vi.doMock('@/lib/db', () => ({
      db: {
        select: vi.fn(() => {
          const sel: any = {
            from: vi.fn((tbl: any) => {
              const tblName = getTableName(tbl)
              const isCron = tblName === 'cron_jobs' || tblName.includes('cron')
              return {
                where: vi.fn(() => Promise.resolve(isCron ? [...cronJobsState] : [...workflowsState])),
              }
            }),
          }
          return sel
        }),
        delete: vi.fn(() => ({
          where: vi.fn(() => {
            cronJobsState.length = 0  // clear array (mutate in place to keep ref)
            return Promise.resolve([])
          }),
        })),
        update: vi.fn(() => ({
          set: vi.fn((v: any) => ({
            where: vi.fn(() => {
              if (cronJobsState[0]) Object.assign(cronJobsState[0], v)
              return Promise.resolve([])
            }),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn((v: any) => {
            cronJobsState.push({ ...v, id: `cj-${cronJobsState.length + 1}` })
            return { returning: vi.fn().mockResolvedValue([cronJobsState[cronJobsState.length - 1]]) }
          }),
        })),
      },
    }))

    // Mock CronService — its create/update push/patch into cronJobsState
    vi.doMock('@/lib/services/cron.service', () => ({
      CronService: {
        create: vi.fn(async (data: any) => {
          cronJobsState.push({ ...data, id: `cj-${cronJobsState.length + 1}` })
        }),
        update: vi.fn(async (id: string, data: any) => {
          const row = cronJobsState.find(r => r.id === id) || cronJobsState[0]
          if (row) Object.assign(row, data)
        }),
      },
    }))
  })

  it('creates a cron_jobs row when workflow is scheduled and active', async () => {
    workflowsState = [{
      id: 'wf-1', name: 'My Scheduled WF', isActive: true,
      trigger: '__scheduled__', schedule: { interval: '5min' },
    }]

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule('wf-1')

    expect(cronJobsState).toHaveLength(1)
    expect(cronJobsState[0].actionType).toBe('workflow')
    expect(cronJobsState[0].actionConfig).toMatchObject({ workflowId: 'wf-1', direct: true })
    expect(cronJobsState[0].interval).toBe('5min')
    expect(cronJobsState[0].isActive).toBe(true)
  })

  it('deactivates cron_jobs row when workflow toggled to inactive', async () => {
    cronJobsState = [{
      id: 'cj-1', actionType: 'workflow',
      actionConfig: { workflowId: 'wf-1', direct: true },
      isActive: true, interval: '5min',
    }]
    workflowsState = [{
      id: 'wf-1', name: 'WF', isActive: false,
      trigger: '__scheduled__', schedule: { interval: '5min' },
    }]

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule('wf-1')

    expect(cronJobsState[0].isActive).toBe(false)
  })

  it('deletes cron_jobs row when workflow no longer exists', async () => {
    cronJobsState = [{
      id: 'cj-1', actionType: 'workflow',
      actionConfig: { workflowId: 'wf-orphan', direct: true },
      isActive: true,
    }]
    workflowsState = []

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule('wf-orphan')

    expect(cronJobsState).toHaveLength(0)
  })

  it('ignores manually-created cron_jobs (without direct flag)', async () => {
    cronJobsState = [{
      id: 'cj-manual', actionType: 'workflow',
      actionConfig: { trigger: 'cron.morning' },
      isActive: true,
    }]
    workflowsState = [{
      id: 'wf-1', name: 'WF', isActive: false,
      trigger: 'contact.submitted', schedule: null,
    }]

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule('wf-1')

    // Hauptassert: keine neuen direct-Cron-Jobs angelegt.
    expect(cronJobsState.filter(c => c.actionConfig?.direct === true)).toHaveLength(0)
  })
})
