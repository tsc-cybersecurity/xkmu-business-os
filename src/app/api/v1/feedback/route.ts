import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { FeedbackService } from '@/lib/services/feedback.service'
import { withPermission } from '@/lib/auth/require-permission'
export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async (auth) => {
    const forms = await FeedbackService.list()
    return apiSuccess(forms)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const body = await request.json()
      const form = await FeedbackService.create(body)
      return apiSuccess(form, undefined, 201)
    } catch { return apiServerError() }
  })
}
