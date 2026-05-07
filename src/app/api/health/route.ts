import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Health-Endpoint fuer Docker/Coolify-Healthcheck und Reverse-Proxy-Routing.
// Prueft DB-Konnektivitaet mit 3s-Timeout — wenn DB nicht erreichbar, 503,
// damit Traefik bei Rolling Deploys den neuen Container erst nach voller
// Bereitschaft anzielt.
export async function GET() {
  const start = Date.now()
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('db timeout')), 3000)),
    ])
    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      latencyMs: Date.now() - start,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'fail',
        error: error instanceof Error ? error.message : 'unknown',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
