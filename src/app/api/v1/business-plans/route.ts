import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { createBusinessPlanSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { BusinessPlanService, type BusinessPlanStatus, type BusinessPlanMode } from '@/lib/services/business-plan/business-plan.service'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'business_plans', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const result = await BusinessPlanService.list({
        status: (searchParams.get('status') as BusinessPlanStatus | null) ?? undefined,
        mode: (searchParams.get('mode') as BusinessPlanMode | null) ?? undefined,
        page: Number(searchParams.get('page') ?? '1'),
        limit: Number(searchParams.get('limit') ?? '20'),
      })
      return apiSuccess(result.items, result.meta)
    } catch (err) {
      logger.error('Error listing business plans', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'business_plans', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createBusinessPlanSchema, body)
      if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))

      const plan = await BusinessPlanService.create(
        {
          mode: validation.data.mode,
          inputType: validation.data.inputType,
          seedInput: validation.data.seedInput as Record<string, unknown>,
          maxIterations: validation.data.maxIterations,
          scoreThreshold: validation.data.scoreThreshold,
        },
        auth.userId ?? undefined,
      )
      // Auto-Start direkt nach Create (Operator-Erwartung: anlegen → laeuft).
      await BusinessPlanService.start(plan.id)

      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'business_plan.create',
        entityType: 'business_plans',
        entityId: plan.id,
        payload: {
          title: plan.title,
          mode: plan.mode,
          inputType: plan.inputType,
          maxIterations: plan.maxIterations,
          scoreThreshold: plan.scoreThreshold,
        },
        request,
      })

      const updated = await BusinessPlanService.get(plan.id)
      return apiSuccess(updated ?? plan, undefined, 201)
    } catch (err) {
      logger.error('Error creating business plan', err, { module: 'BusinessPlansAPI' })
      return apiServerError(err instanceof Error ? err.message : undefined)
    }
  })
}
