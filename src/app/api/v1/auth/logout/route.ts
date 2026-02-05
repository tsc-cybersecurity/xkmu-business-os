import { apiSuccess } from '@/lib/utils/api-response'
import { deleteSession } from '@/lib/auth/session'

export async function POST() {
  await deleteSession()
  return apiSuccess({ message: 'Logged out successfully' })
}
