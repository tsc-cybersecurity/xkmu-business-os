import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { SlotTypeService } from '@/lib/services/slot-type.service'

const UpdateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,100}$/).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().optional(),
  bufferBeforeMinutes: z.number().int().min(0).optional(),
  bufferAfterMinutes: z.number().int().min(0).optional(),
  minNoticeHours: z.number().int().min(0).optional(),
  maxAdvanceDays: z.number().int().positive().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isActive: z.boolean().optional(),
  location: z.enum(['phone', 'video', 'onsite', 'custom']).optional(),
  locationDetails: z.string().nullable().optional(),
})

interface RouteContext { params: Promise<{ id: string }> }

async function getOwnedSlotType(id: string, userId: string) {
  const st = await SlotTypeService.getById(id)
  if (!st || st.userId !== userId) return null
  return st
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    const st = await getOwnedSlotType(id, auth.userId)
    if (!st) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ slotType: st })
  })
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    const st = await getOwnedSlotType(id, auth.userId)
    if (!st) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const parsed = UpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const updated = await SlotTypeService.update(id, parsed.data)
    return NextResponse.json({ slotType: updated })
  })
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const { id } = await ctx.params
    const st = await getOwnedSlotType(id, auth.userId)
    if (!st) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    await SlotTypeService.delete(id)
    return NextResponse.json({ ok: true })
  })
}
