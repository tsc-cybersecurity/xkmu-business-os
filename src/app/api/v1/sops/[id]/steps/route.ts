import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { SopService } from '@/lib/services/sop.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const steps = await SopService.setSteps(id, body.steps || [])
      return apiSuccess(steps)
    } catch { return apiServerError() }
  })
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'create', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const step = await SopService.addStep(id, body)
      return apiSuccess(step, undefined, 201)
    } catch { return apiServerError() }
  })
}
