import { apiSuccess, apiUnauthorized } from '@/lib/utils/api-response'
import { getSession } from '@/lib/auth/session'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return apiUnauthorized()
  }

  return apiSuccess({
    user: session.user,
  })
}
