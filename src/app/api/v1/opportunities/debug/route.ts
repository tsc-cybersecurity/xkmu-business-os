import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { AiProviderService } from '@/lib/services/ai-provider.service'
// GET /api/v1/opportunities/debug - Check if table and SerpAPI are configured
export async function GET(request: NextRequest) {
  return withPermission(request, 'opportunities', 'read', async (auth) => {
    const checks: Record<string, unknown> = {}

    // 1. Check if opportunities table exists
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'opportunities'
        ) as exists
      `)
      const rows = result as unknown as Array<{ exists: boolean }>
      checks.tableExists = rows[0]?.exists ?? false
    } catch (e) {
      checks.tableExists = false
      checks.tableError = e instanceof Error ? e.message : String(e)
    }

    // 2. Check if SerpAPI key is configured (DB)
    try {
      const providers = await AiProviderService.list()
      const serpapi = providers.find((p) => p.providerType === 'serpapi' && p.isActive)
      checks.serpApiProvider = serpapi ? { id: serpapi.id, name: serpapi.name, hasKey: !!serpapi.apiKey } : null
    } catch (e) {
      checks.serpApiProviderError = e instanceof Error ? e.message : String(e)
    }

    // 3. Check env fallback
    checks.serpApiEnvKey = !!process.env.SERPAPI_KEY

    // 4. Check row count if table exists
    if (checks.tableExists) {
      try {
        const result = await db.execute(sql`SELECT COUNT(*) as count FROM opportunities WHERE tenant_id = ${TENANT_ID}`)
        const rows = result as unknown as Array<{ count: number }>
        checks.rowCount = Number(rows[0]?.count ?? 0)
      } catch (e) {
        checks.rowCountError = e instanceof Error ? e.message : String(e)
      }
    }

    // 5. Test full search+save flow with 1 result
    try {
      const { SerpApiService } = await import('@/lib/services/serpapi.service')
      const { OpportunityService } = await import('@/lib/services/opportunity.service')

      const results = await SerpApiService.searchPlaces('Restaurant', 'Berlin', 5, 1, TENANT_ID)
      checks.serpApiCallOk = true
      checks.serpApiResultCount = results.length

      if (results.length > 0) {
        try {
          const saveResult = await OpportunityService.createMany(results.map(r => ({
            ...r,
            phone: r.phone ?? undefined,
            email: r.email ?? undefined,
            website: r.website ?? undefined,
            rating: r.rating ?? undefined,
            reviewCount: r.reviewCount ?? undefined,
            searchQuery: 'debug-test',
            searchLocation: 'Berlin',
          })))
          checks.saveTest = { success: true, inserted: saveResult.inserted, skipped: saveResult.skipped }
        } catch (e) {
          checks.saveTest = { success: false, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.split('\n').slice(0, 5) : undefined }
        }
      }
    } catch (e) {
      checks.fullTest = { success: false, error: e instanceof Error ? e.message : String(e) }
    }

    // 6. Quick SerpAPI test (1 result)
    if (checks.serpApiProvider || checks.serpApiEnvKey) {
      try {
        const { SerpApiService } = await import('@/lib/services/serpapi.service')
        const results = await SerpApiService.searchPlaces('Restaurant', 'Berlin', 5, 1, TENANT_ID)
        checks.serpApiTest = { success: true, resultCount: results.length, firstResult: results[0]?.name || null }
      } catch (e) {
        checks.serpApiTest = { success: false, error: e instanceof Error ? e.message : String(e) }
      }
    }

    return apiSuccess(checks)
  })
}

// POST /api/v1/opportunities/debug - Repair all addresses
export async function POST(request: NextRequest) {
  return withPermission(request, 'opportunities', 'update', async (auth) => {
    try {
      const { OpportunityService } = await import('@/lib/services/opportunity.service')
      const fixed = await OpportunityService.repairAddresses()
      return apiSuccess({ repaired: fixed })
    } catch (e) {
      return apiError('REPAIR_FAILED', e instanceof Error ? e.message : 'Fehler', 500)
    }
  })
}
