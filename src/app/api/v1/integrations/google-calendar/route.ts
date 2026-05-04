import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { CalendarConfigService } from '@/lib/services/calendar-config.service'

const UpdateSchema = z.object({
  clientId: z.string().min(1).nullable(),
  clientSecret: z.string().min(1).nullable(),
  redirectUri: z.string().url().nullable(),
  appPublicUrl: z.string().url().nullable(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    if (auth.role !== 'owner' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const cfg = await CalendarConfigService.getConfig()
    return NextResponse.json({
      clientId: cfg.clientId,
      clientSecretMasked: cfg.clientSecret ? '••••••••' + cfg.clientSecret.slice(-4) : null,
      redirectUri: cfg.redirectUri,
      appPublicUrl: cfg.appPublicUrl,
      isConfigured: CalendarConfigService.isConfigured(cfg),
    })
  })
}

export async function PUT(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    if (auth.role !== 'owner' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const parsed = UpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data
    if (data.clientSecret && data.clientSecret.startsWith('••••••••')) {
      const current = await CalendarConfigService.getConfig()
      data.clientSecret = current.clientSecret
    }
    const updated = await CalendarConfigService.updateCredentials(data)
    return NextResponse.json({
      clientId: updated.clientId,
      clientSecretMasked: updated.clientSecret ? '••••••••' + updated.clientSecret.slice(-4) : null,
      redirectUri: updated.redirectUri,
      appPublicUrl: updated.appPublicUrl,
      isConfigured: CalendarConfigService.isConfigured(updated),
    })
  })
}
