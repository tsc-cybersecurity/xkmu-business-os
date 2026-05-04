import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { and, eq, ne } from 'drizzle-orm'

const SlugRegex = /^[a-z0-9-]{3,60}$/

const PatchSchema = z.object({
  slug: z.string().regex(SlugRegex).nullable(),
  active: z.boolean(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const rows = await db.select({
      slug: users.bookingSlug,
      active: users.bookingPageActive,
    }).from(users).where(eq(users.id, auth.userId)).limit(1)
    return NextResponse.json(rows[0] ?? { slug: null, active: false })
  })
}

export async function PATCH(request: NextRequest) {
  return withPermission(request, 'appointments', 'update', async (auth) => {
    if (!auth.userId) return NextResponse.json({ error: 'no_user_context' }, { status: 401 })
    const parsed = PatchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 })
    }

    const { slug, active } = parsed.data

    // If activating, slug must be set
    if (active && !slug) {
      return NextResponse.json({ error: 'slug_required_for_active' }, { status: 400 })
    }

    // Slug uniqueness — only when slug is set, exclude current user
    if (slug) {
      const conflicting = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.bookingSlug, slug), ne(users.id, auth.userId)))
        .limit(1)
      if (conflicting.length > 0) {
        return NextResponse.json({ error: 'slug_already_taken' }, { status: 409 })
      }
    }

    await db.update(users)
      .set({ bookingSlug: slug, bookingPageActive: active, updatedAt: new Date() })
      .where(eq(users.id, auth.userId))

    return NextResponse.json({ slug, active })
  })
}
