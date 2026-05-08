import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiValidationError } from '@/lib/utils/api-response'
import { updateNewsItemSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { NewsService } from '@/lib/services/news.service'
import { db } from '@/lib/db'
import { blogPosts, socialMediaPosts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'read', async () => {
    const { id } = await params
    const item = await NewsService.getItem(id)
    if (!item) return apiNotFound('News-Item nicht gefunden')

    const [blogs, socials] = await Promise.all([
      db.select().from(blogPosts).where(eq(blogPosts.sourceNewsItemId, id)),
      db.select().from(socialMediaPosts).where(eq(socialMediaPosts.sourceNewsItemId, id)),
    ])

    return apiSuccess({ item, drafts: { blog: blogs, social: socials } })
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'update', async () => {
    const { id } = await params
    const body = await request.json()
    const validation = validateAndParse(updateNewsItemSchema, body)
    if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))

    if (validation.data.isHidden !== undefined) {
      const ok = await NewsService.hideItem(id, validation.data.isHidden)
      if (!ok) return apiNotFound('News-Item nicht gefunden')
    }
    return apiSuccess({ updated: true })
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'delete', async () => {
    const { id } = await params
    const ok = await NewsService.deleteItem(id)
    if (!ok) return apiNotFound('News-Item nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
