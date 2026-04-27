import type { Metadata } from 'next'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseListGrid } from '@/components/elearning/CourseListGrid'
import { EmptyState } from '@/components/shared/empty-state'
import { GraduationCap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Onlinekurse – xKMU',
  description: 'Freie Onlinekurse — Marketing-, IT- und Sicherheitsthemen für KMU.',
}

export default async function PublicCoursesIndexPage() {
  const { items } = await CoursePublicService.listPublic({ limit: 60 })
  return (
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
  )
}
