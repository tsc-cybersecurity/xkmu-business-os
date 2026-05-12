import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseListGrid } from '@/components/elearning/CourseListGrid'
import { EmptyState } from '@/components/shared/empty-state'
import { GraduationCap } from 'lucide-react'
import { CmsPageContent } from '@/app/_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { generateCmsMetadata } from '@/lib/utils/cms-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata('/kurse', 'Onlinekurse – xKMU')
}

export default async function PublicCoursesIndexPage() {
  noStore()
  const [page, { items }] = await Promise.all([
    CmsPageService.getBySlugPublic('/kurse'),
    CoursePublicService.listPublic({ limit: 60 }),
  ])

  return (
    <>
      {page ? (
        <CmsPageContent slug="/kurse" />
      ) : (
        <div className="container mx-auto px-4 py-12">
          <header className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GraduationCap className="h-8 w-8" />
              Onlinekurse
            </h1>
            <p className="text-muted-foreground">
              Freie Lerneinheiten zu IT, Sicherheit und Compliance.
            </p>
          </header>
        </div>
      )}

      <div className="container mx-auto px-4 pb-12">
        {items.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Noch keine Kurse veröffentlicht"
            description="Demnächst gibt es hier freie Lerninhalte."
          />
        ) : (
          <CourseListGrid courses={items} basePath="/kurse" />
        )}
      </div>
    </>
  )
}
