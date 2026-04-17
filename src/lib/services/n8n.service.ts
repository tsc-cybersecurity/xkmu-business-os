import { db } from '@/lib/db'
import { n8nConnections, n8nWorkflowLogs } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'

interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  nodes?: unknown[]
  connections?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

interface N8nExecution {
  id: string
  workflowId: string
  finished: boolean
  mode: string
  startedAt: string
  stoppedAt?: string
  status: string
  [key: string]: unknown
}

async function getConnection(_tenantId: string) {
  const [conn] = await db
    .select()
    .from(n8nConnections)
    .where(eq(n8nConnections.isActive, true))
    .limit(1)

  if (!conn) {
    throw new Error('Keine n8n-Verbindung konfiguriert. Bitte in den Einstellungen anlegen.')
  }

  return conn
}

async function n8nFetch(
  _tenantId: string,
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const conn = await getConnection(_tenantId)
  const baseUrl = conn.apiUrl.replace(/\/$/, '')

  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': conn.apiKey,
      ...options.headers,
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`n8n API Fehler (${response.status}): ${errorText}`)
  }

  return response.json()
}

export const N8nService = {
  // ==========================================
  // Connection Management
  // ==========================================

  async getConnection(_tenantId: string) {
    const [conn] = await db
      .select()
      .from(n8nConnections)
      .limit(1)

    return conn || null
  },

  async upsertConnection(_tenantId: string, data: { name: string; apiUrl: string; apiKey: string }) {
    const existing = await this.getConnection(_tenantId)

    if (existing) {
      const [updated] = await db
        .update(n8nConnections)
        .set({
          name: data.name,
          apiUrl: data.apiUrl,
          apiKey: data.apiKey,
          updatedAt: new Date(),
        })
        .where(eq(n8nConnections.id, existing.id))
        .returning()
      return updated
    }

    const [created] = await db
      .insert(n8nConnections)
      .values({
        name: data.name,
        apiUrl: data.apiUrl,
        apiKey: data.apiKey,
      })
      .returning()

    return created
  },

  async testConnection(_tenantId: string): Promise<{ success: boolean; message: string }> {
    try {
      await n8nFetch(_tenantId, '/workflows?limit=1')
      return { success: true, message: 'Verbindung erfolgreich' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verbindungsfehler'
      return { success: false, message }
    }
  },

  // ==========================================
  // Workflow Management
  // ==========================================

  async listWorkflows(_tenantId: string): Promise<N8nWorkflow[]> {
    const data = await n8nFetch(_tenantId, '/workflows') as { data?: N8nWorkflow[] }
    return data.data || []
  },

  async getWorkflow(_tenantId: string, workflowId: string): Promise<N8nWorkflow> {
    const data = await n8nFetch(_tenantId, `/workflows/${workflowId}`) as N8nWorkflow
    return data
  },

  async createWorkflow(_tenantId: string, workflowJson: Record<string, unknown>): Promise<N8nWorkflow> {
    const data = await n8nFetch(_tenantId, '/workflows', {
      method: 'POST',
      body: JSON.stringify(workflowJson),
    }) as N8nWorkflow
    return data
  },

  async updateWorkflow(_tenantId: string, workflowId: string, workflowJson: Record<string, unknown>): Promise<N8nWorkflow> {
    const data = await n8nFetch(_tenantId, `/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(workflowJson),
    }) as N8nWorkflow
    return data
  },

  async deleteWorkflow(_tenantId: string, workflowId: string): Promise<void> {
    await n8nFetch(_tenantId, `/workflows/${workflowId}`, {
      method: 'DELETE',
    })
  },

  async activateWorkflow(_tenantId: string, workflowId: string, active: boolean): Promise<N8nWorkflow> {
    const data = await n8nFetch(_tenantId, `/workflows/${workflowId}/${active ? 'activate' : 'deactivate'}`, {
      method: 'POST',
    }) as N8nWorkflow
    return data
  },

  async executeWorkflow(_tenantId: string, workflowId: string, inputData?: Record<string, unknown>): Promise<unknown> {
    const body = inputData ? { data: inputData } : undefined
    const data = await n8nFetch(_tenantId, `/workflows/${workflowId}/run`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
    return data
  },

  async getExecutions(_tenantId: string, workflowId?: string): Promise<N8nExecution[]> {
    const query = workflowId ? `?workflowId=${workflowId}` : ''
    const data = await n8nFetch(_tenantId, `/executions${query}`) as { data?: N8nExecution[] }
    return data.data || []
  },

  // ==========================================
  // Workflow Log Management
  // ==========================================

  async createWorkflowLog(_tenantId: string, data: {
    n8nWorkflowId?: string
    n8nWorkflowName?: string
    prompt?: string
    generatedJson?: unknown
    status: string
    errorMessage?: string
    createdBy?: string
  }) {
    const [log] = await db
      .insert(n8nWorkflowLogs)
      .values({
        n8nWorkflowId: data.n8nWorkflowId || null,
        n8nWorkflowName: data.n8nWorkflowName || null,
        prompt: data.prompt || null,
        generatedJson: data.generatedJson || null,
        status: data.status,
        errorMessage: data.errorMessage || null,
        createdBy: data.createdBy || null,
      })
      .returning()

    return log
  },

  async listWorkflowLogs(_tenantId: string, limit = 50) {
    return db
      .select()
      .from(n8nWorkflowLogs)
      .orderBy(desc(n8nWorkflowLogs.createdAt))
      .limit(limit)
  },

  async updateWorkflowLog(logId: string, data: {
    n8nWorkflowId?: string
    n8nWorkflowName?: string
    status?: string
    errorMessage?: string
  }) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (data.n8nWorkflowId !== undefined) updateData.n8nWorkflowId = data.n8nWorkflowId
    if (data.n8nWorkflowName !== undefined) updateData.n8nWorkflowName = data.n8nWorkflowName
    if (data.status !== undefined) updateData.status = data.status
    if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage

    const [updated] = await db
      .update(n8nWorkflowLogs)
      .set(updateData)
      .where(eq(n8nWorkflowLogs.id, logId))
      .returning()

    return updated || null
  },
}
