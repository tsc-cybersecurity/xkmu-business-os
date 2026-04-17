import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { ContractClauseService } from '@/lib/services/contract-clause.service'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { id } = await params
    const clause = await ContractClauseService.getById(id)
    if (!clause) return apiNotFound('Baustein nicht gefunden')
    return apiSuccess(clause)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id } = await params
    const body = await request.json()
    try {
      const clause = await ContractClauseService.update(id, body)
      if (!clause) return apiNotFound('Baustein nicht gefunden')
      return apiSuccess(clause)
    } catch (err) {
      return apiError('FORBIDDEN', (err as Error).message, 403)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'documents', 'delete', async (auth) => {
    const { id } = await params
    try {
      const deleted = await ContractClauseService.delete(id)
      if (!deleted) return apiNotFound('Baustein nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (err) {
      return apiError('FORBIDDEN', (err as Error).message, 403)
    }
  })
}
