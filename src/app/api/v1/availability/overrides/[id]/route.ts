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
