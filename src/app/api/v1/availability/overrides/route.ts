import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'

const OverrideCreateSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  kind: z.enum(['free', 'block']),
  reason: z.string().max(255).nullable().optional(),
}).refine(d => new Date(d.endAt) > new Date(d.startAt), {
  message: 'endAt must be after startAt',
  path: ['endAt'],
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const overrides = await AvailabilityService.listOverrides(
      auth.userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    )
    return NextResponse.json({ overrides })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'create', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = OverrideCreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const override = await AvailabilityService.createOverride(auth.userId, {
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      kind: parsed.data.kind,
      reason: parsed.data.reason ?? null,
    })
    return NextResponse.json({ override }, { status: 201 })
  })
}
