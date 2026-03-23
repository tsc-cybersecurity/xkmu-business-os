import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { FeedbackService } from '@/lib/services/feedback.service'

// POST /api/v1/feedback/[id]/respond - Oeffentlicher Endpoint (kein Auth)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: token } = await params
    const body = await request.json()
    const response = await FeedbackService.submitResponse(token, body)
    return apiSuccess(response, undefined, 201)
  } catch (error) {
    if (error instanceof Error && error.message.includes('nicht gefunden')) {
      return apiError('NOT_FOUND', 'Formular nicht gefunden oder abgelaufen', 404)
    }
    return apiServerError()
  }
}
