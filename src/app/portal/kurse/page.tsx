import type { Metadata } from 'next'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseListGrid } from '@/components/elearning/CourseListGrid'
import { EmptyState } from '@/components/shared/empty-state'
import { GraduationCap } from 'lucide-react'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Onlinekurse — Kundenportal',
  robots: { index: false, follow: false },
}

export default async function PortalCoursesIndexPage() {
  const session = await getSession()
  const { items } = await CoursePublicService.listPortal({ limit: 60 }, session?.user.id)
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Onlinekurse
        </h1>
        <p className="text-muted-foreground mt-1">Lerninhalte für Sie als Kunde.</p>
      </header>
      {items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Noch keine Kurse"
          description="Sobald für Sie Inhalte freigeschaltet werden, erscheinen sie hier."
        />
      ) : (
        <CourseListGrid courses={items} basePath="/portal/kurse" />
      )}
    </div>
  )
}
