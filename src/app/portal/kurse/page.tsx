import type { Metadata } from 'next'
import Link from 'next/link'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseAssignmentService } from '@/lib/services/course-assignment.service'
import { CourseListGrid } from '@/components/elearning/CourseListGrid'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CalendarClock, GraduationCap } from 'lucide-react'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Onlinekurse — Kundenportal',
  robots: { index: false, follow: false },
}

export default async function PortalCoursesIndexPage() {
  const session = await getSession()
  const userId = session?.user.id
  const { items } = await CoursePublicService.listPortal({ limit: 60 }, userId)
  const assignments = userId
    ? (await CourseAssignmentService.listForUser(userId)).filter((a) => a.status !== 'completed')
    : []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Onlinekurse
        </h1>
        <p className="text-muted-foreground mt-1">Lerninhalte für Sie als Kunde.</p>
      </header>

      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Meine Pflichtkurse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {assignments.map((a) => {
                const due = a.dueDate ? new Date(a.dueDate) : null
                const overdue = a.status === 'overdue'
                const percent = a.totalLessons > 0
                  ? Math.round((a.completedLessons / a.totalLessons) * 100)
                  : 0
                return (
                  <li key={a.assignmentId} className="py-3">
                    <Link
                      href={`/portal/kurse/${a.course.slug}`}
                      className="flex flex-col gap-1 rounded-md p-2 -mx-2 hover:bg-muted"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{a.course.title}</span>
                        {due && (
                          <Badge variant={overdue ? 'destructive' : 'secondary'} className="text-xs">
                            <CalendarClock className="mr-1 h-3 w-3" />
                            Fällig {due.toLocaleDateString('de-DE')}
                          </Badge>
                        )}
                        {overdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Überfällig
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fortschritt: {a.completedLessons} / {a.totalLessons} Lektionen ({percent} %)
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

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
