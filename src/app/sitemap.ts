import type { MetadataRoute } from 'next'
import { CoursePublicService } from '@/lib/services/course-public.service'

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
  ]

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

  return entries
}
