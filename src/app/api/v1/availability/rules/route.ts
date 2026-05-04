import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'

const TimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

const RuleCreateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(TimeRegex),
  endTime: z.string().regex(TimeRegex),
  isActive: z.boolean().default(true),
}).refine(d => d.endTime > d.startTime, {
  message: 'endTime must be after startTime',
  path: ['endTime'],
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const rules = await AvailabilityService.listRules(auth.userId)
    return NextResponse.json({ rules })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'create', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = RuleCreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const rule = await AvailabilityService.createRule(auth.userId, parsed.data)
    return NextResponse.json({ rule }, { status: 201 })
  })
}
