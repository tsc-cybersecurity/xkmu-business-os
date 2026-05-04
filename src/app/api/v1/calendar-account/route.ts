import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarAccountService } from '@/lib/services/calendar-account.service'

const PatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('setPrimary'), googleCalendarId: z.string().min(1) }),
  z.object({ action: z.literal('setReadForBusy'), watchedId: z.string().uuid(), readForBusy: z.boolean() }),
])

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ account: null, calendars: [] })
    const calendars = await CalendarAccountService.listWatchedCalendars(account.id)
    return NextResponse.json({
      account: {
        id: account.id,
        googleEmail: account.googleEmail,
        primaryCalendarId: account.primaryCalendarId,
        connectedAt: account.createdAt,
      },
      calendars,
    })
  })
}

export async function PATCH(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    const body = PatchSchema.parse(await request.json())
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ error: 'no_active_account' }, { status: 404 })

    if (body.action === 'setPrimary') {
      await CalendarAccountService.setPrimaryCalendar(account.id, body.googleCalendarId)
    } else {
      await CalendarAccountService.setReadForBusy(body.watchedId, body.readForBusy)
    }
    return NextResponse.json({ ok: true })
  })
}

export async function DELETE(request: NextRequest) {
  return withPermission(request, 'appointments', 'delete', async (auth) => {
    const account = await CalendarAccountService.getActiveAccount(auth.userId)
    if (!account) return NextResponse.json({ error: 'no_active_account' }, { status: 404 })
    await CalendarAccountService.revoke(account.id)
    return NextResponse.json({ ok: true })
  })
}
