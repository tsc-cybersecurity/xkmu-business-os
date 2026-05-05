import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { persons } from '@/lib/db/schema'
import { or, sql } from 'drizzle-orm'

const QuerySchema = z.object({
  q: z.string().min(2).max(100),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'persons', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({ q: searchParams.get('q') ?? '' })
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'invalid_query', 400)
    }

    const q = `%${parsed.data.q.toLowerCase()}%`
    const rows = await db
      .select({
        id: persons.id,
        firstName: persons.firstName,
        lastName: persons.lastName,
        email: persons.email,
        phone: persons.phone,
        mobile: persons.mobile,
      })
      .from(persons)
      .where(or(
        sql`lower(${persons.firstName} || ' ' || ${persons.lastName}) like ${q}`,
        sql`lower(coalesce(${persons.email}, '')) like ${q}`,
      ))
      .limit(20)

    return apiSuccess(rows)
  })
}
