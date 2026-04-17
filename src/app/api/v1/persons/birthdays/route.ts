import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { persons } from '@/lib/db/schema'
import { eq, and, isNotNull, sql } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'

// GET /api/v1/persons/birthdays?days=7 - Upcoming birthdays
export async function GET(request: NextRequest) {
  return withPermission(request, 'persons', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const allPersons = await db.select().from(persons)
      .where(and(eq(persons.tenantId, TENANT_ID), isNotNull(persons.birthday)))

    const today = new Date()
    const upcoming = allPersons.filter(p => {
      if (!p.birthday) return false
      const bd = new Date(p.birthday)
      const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate())
      if (thisYear < today) thisYear.setFullYear(thisYear.getFullYear() + 1)
      const diff = (thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= days
    }).map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      birthday: p.birthday,
      daysUntil: Math.ceil((new Date(today.getFullYear(), new Date(p.birthday!).getMonth(), new Date(p.birthday!).getDate()).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    }))

    return apiSuccess(upcoming)
  })
}
