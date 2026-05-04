import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { SlotTypeService } from '@/lib/services/slot-type.service'

const SlugRegex = /^[a-z0-9-]{1,100}$/
const HexColorRegex = /^#[0-9a-fA-F]{6}$/

const CreateSchema = z.object({
  slug: z.string().regex(SlugRegex),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive(),
  bufferBeforeMinutes: z.number().int().min(0).default(0),
  bufferAfterMinutes: z.number().int().min(0).default(0),
  minNoticeHours: z.number().int().min(0).default(24),
  maxAdvanceDays: z.number().int().positive().default(60),
  color: z.string().regex(HexColorRegex).default('#3b82f6'),
  isActive: z.boolean().default(true),
  location: z.enum(['phone', 'video', 'onsite', 'custom']).default('phone'),
  locationDetails: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const slotTypes = await SlotTypeService.list(auth.userId)
    return NextResponse.json({ slotTypes })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'create', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = CreateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    try {
      const created = await SlotTypeService.create(auth.userId, parsed.data)
      return NextResponse.json({ slotType: created }, { status: 201 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('uq_slot_types_user_slug')) {
        return NextResponse.json({ error: 'slug_already_exists' }, { status: 409 })
      }
      throw err
    }
  })
}
