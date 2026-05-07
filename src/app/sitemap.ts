import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { cmsPages, blogPosts } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { CoursePublicService } from '@/lib/services/course-public.service'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://xkmu.de'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/kurse`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // ─── Online-Kurse + Lektionen ─────────────────────────────────────────────
  const { items } = await CoursePublicService.listPublic({ limit: 1000 })
  for (const c of items) {
    entries.push({
      url: `${BASE_URL}/kurse/${c.slug}`,
      lastModified: c.updatedAt ?? undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
    const detail = await CoursePublicService.getPublicBySlug(c.slug)
    for (const l of detail?.lessons ?? []) {
      entries.push({
        url: `${BASE_URL}/kurse/${c.slug}/${l.slug}`,
        lastModified: c.updatedAt ?? undefined,
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    }
  }

  // ─── CMS-Seiten ───────────────────────────────────────────────────────────
  // Nur publizierte + per Toggle nicht ausgenommene Seiten.
  const cmsRows = await db.select({
    slug: cmsPages.slug,
    updatedAt: cmsPages.updatedAt,
    publishedAt: cmsPages.publishedAt,
  }).from(cmsPages).where(and(
    eq(cmsPages.status, 'published'),
    eq(cmsPages.inSitemap, true),
  ))
  for (const p of cmsRows) {
    entries.push({
      url: `${BASE_URL}/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  // ─── Blog-Posts ───────────────────────────────────────────────────────────
  const blogRows = await db.select({
    slug: blogPosts.slug,
    updatedAt: blogPosts.updatedAt,
    publishedAt: blogPosts.publishedAt,
  }).from(blogPosts).where(and(
    eq(blogPosts.status, 'published'),
    eq(blogPosts.inSitemap, true),
  ))
  for (const b of blogRows) {
    entries.push({
      url: `${BASE_URL}/blog/${b.slug}`,
      lastModified: b.updatedAt ?? b.publishedAt ?? undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
