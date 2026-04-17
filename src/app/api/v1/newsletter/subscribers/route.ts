import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { NewsletterService } from '@/lib/services/newsletter.service'
import { withPermission } from '@/lib/auth/require-permission'
import { parsePaginationParams } from '@/lib/utils/api-response'
export async function GET(request: NextRequest) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const result = await NewsletterService.listSubscribers({ ...pagination, status, search })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'marketing', 'create', async (auth) => {
    try {
      const body = await request.json()
      // Bulk import or single
      if (Array.isArray(body.subscribers)) {
        const created = await NewsletterService.importSubscribers(body.subscribers)
        return apiSuccess({ imported: created }, undefined, 201)
      }
      const sub = await NewsletterService.createSubscriber(body)
      return apiSuccess(sub, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}
