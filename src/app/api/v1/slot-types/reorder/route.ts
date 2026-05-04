import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { SlotTypeService } from '@/lib/services/slot-type.service'

const ReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = ReorderSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    await SlotTypeService.reorder(auth.userId, parsed.data.ids)
    return NextResponse.json({ ok: true })
  })
}
