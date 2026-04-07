import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { getAllActions } from '@/lib/services/workflow'

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    const actions = getAllActions().map(a => ({
      name: a.name,
      label: a.label,
      description: a.description,
      category: a.category,
      icon: a.icon,
      configFields: a.configFields || [],
    }))
    return apiSuccess(actions)
  })
}
