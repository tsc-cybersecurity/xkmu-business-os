import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'ai_providers', 'read', async (auth) => {
    // Tenant-aware Provider-Status
    const dbProviders = await AIService.getAvailableProvidersForTenant(TENANT_ID)

    // Legacy Fallback
    const staticProviders = await AIService.getAvailableProviders()

    return apiSuccess({
      available: dbProviders.some((p) => p.available) || staticProviders.length > 0,
      providers: dbProviders.length > 0 ? dbProviders : staticProviders.map((name) => ({
        id: null,
        name,
        providerType: name,
        model: 'default',
        available: true,
      })),
    })
  })
}
