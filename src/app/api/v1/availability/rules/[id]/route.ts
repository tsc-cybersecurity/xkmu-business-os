import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'

const TimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

const RuleUpdateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(TimeRegex).optional(),
  endTime: z.string().regex(TimeRegex).optional(),
  isActive: z.boolean().optional(),
})

interface RouteContext { params: Promise<{ id: string }> }

async function findOwnedRule(userId: string, ruleId: string) {
  const rules = await AvailabilityService.listRules(userId)
  return rules.find(r => r.id === ruleId && r.userId === userId) ?? null
}

function normalizeTime(t: string): string {
  // 'HH:MM' or 'HH:MM:SS' → 'HH:MM' for cross-field comparison
  return t.length >= 5 ? t.slice(0, 5) : t
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    const existing = await findOwnedRule(auth.userId, id)
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const parsed = RuleUpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    // Cross-field validation: merged endTime must be strictly greater than merged startTime
    const mergedStart = normalizeTime(parsed.data.startTime ?? existing.startTime)
    const mergedEnd = normalizeTime(parsed.data.endTime ?? existing.endTime)
    if (mergedEnd <= mergedStart) {
      return NextResponse.json({ error: 'end_time_before_start' }, { status: 400 })
    }
    const updated = await AvailabilityService.updateRule(id, parsed.data)
    return NextResponse.json({ rule: updated })
  })
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    const existing = await findOwnedRule(auth.userId, id)
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    await AvailabilityService.deleteRule(id)
    return NextResponse.json({ ok: true })
  })
}
