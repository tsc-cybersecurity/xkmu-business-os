import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  try {
    const db = getDb()
    await db.execute(sql`SELECT 1`)
    return NextResponse.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', database: 'disconnected', message: String(error) },
      { status: 503 }
    )
  }
}
