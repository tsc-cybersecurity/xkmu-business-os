import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'

interface RouteContext { params: Promise<{ id: string }> }

async function ownsOverride(userId: string, overrideId: string): Promise<boolean> {
  const overrides = await AvailabilityService.listOverrides(userId)
  return overrides.some(o => o.id === overrideId)
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    if (!await ownsOverride(auth.userId, id)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    await AvailabilityService.deleteOverride(id)
    return NextResponse.json({ ok: true })
  })
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    if (!await ownsOverride(auth.userId, id)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({})) as {
      startAt?: string
      endAt?: string
      kind?: 'free' | 'block'
      reason?: string | null
    }
    const patch: Record<string, unknown> = {}
    if (body.startAt !== undefined) patch.startAt = new Date(body.startAt)
    if (body.endAt !== undefined) patch.endAt = new Date(body.endAt)
    if (body.kind !== undefined) {
      if (body.kind !== 'free' && body.kind !== 'block') {
        return NextResponse.json({ error: 'invalid_kind' }, { status: 400 })
      }
      patch.kind = body.kind
    }
    if (body.reason !== undefined) patch.reason = body.reason
    if (patch.startAt instanceof Date && patch.endAt instanceof Date && patch.endAt <= patch.startAt) {
      return NextResponse.json({ error: 'end_at_before_start' }, { status: 400 })
    }
    const override = await AvailabilityService.updateOverride(id, patch)
    return NextResponse.json({ override })
  })
}
