import { NextRequest, NextResponse } from 'next/server'
import { CronService } from '@/lib/services/cron.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/cron/tick - Called by crond every minute (no auth)
export async function GET(request: NextRequest) {
  // Optional: verify internal secret
  const secret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Invalid cron secret' }, { status: 403 })
  }

  try {
    const result = await CronService.tick()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    logger.error('Cron tick failed', error, { module: 'CronTick' })
    return NextResponse.json({ success: false, error: 'Tick failed' }, { status: 500 })
  }
}
