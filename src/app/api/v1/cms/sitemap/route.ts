import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { cmsPages, blogPosts } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/cms/sitemap — Liste aller CMS-Seiten + Blog-Posts mit Sitemap-Flag
export async function GET(request: NextRequest) {
  return withPermission(request, 'cms', 'read', async () => {
    try {
      const [cmsRows, blogRows] = await Promise.all([
        db.select({
          id: cmsPages.id,
          slug: cmsPages.slug,
          title: cmsPages.title,
          status: cmsPages.status,
          inSitemap: cmsPages.inSitemap,
          updatedAt: cmsPages.updatedAt,
        }).from(cmsPages).orderBy(asc(cmsPages.slug)),
        db.select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          status: blogPosts.status,
          inSitemap: blogPosts.inSitemap,
          updatedAt: blogPosts.updatedAt,
        }).from(blogPosts).orderBy(asc(blogPosts.title)),
      ])
      return apiSuccess({ cmsPages: cmsRows, blogPosts: blogRows })
    } catch (e) {
      logger.error('Failed to load sitemap overview', e, { module: 'CmsSitemapAPI' })
      return apiServerError()
    }
  })
}

const patchSchema = z.object({
  type: z.enum(['cms_page', 'blog_post']),
  id: z.string().uuid(),
  inSitemap: z.boolean(),
})

// PATCH /api/v1/cms/sitemap — Toggle inSitemap fuer eine Entity
export async function PATCH(request: NextRequest) {
  return withPermission(request, 'cms', 'update', async () => {
    try {
      const body = await request.json()
      const parsed = patchSchema.safeParse(body)
      if (!parsed.success) {
        return apiValidationError(
          parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        )
      }
      const { type, id, inSitemap } = parsed.data
      const table = type === 'cms_page' ? cmsPages : blogPosts
      const [row] = await db.update(table)
        .set({ inSitemap, updatedAt: new Date() })
        .where(eq(table.id, id))
        .returning({ id: table.id, inSitemap: table.inSitemap })
      if (!row) return apiNotFound('Entity nicht gefunden')
      return apiSuccess({ id: row.id, inSitemap: row.inSitemap })
    } catch (e) {
      logger.error('Failed to update sitemap flag', e, { module: 'CmsSitemapAPI' })
      return apiServerError()
    }
  })
}
