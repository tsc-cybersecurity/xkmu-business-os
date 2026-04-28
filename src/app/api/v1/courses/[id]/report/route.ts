import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { CourseReportService } from '@/lib/services/course-report.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const { id } = await ctx.params
      const url = new URL(request.url)
      const format = url.searchParams.get('format')
      const report = await CourseReportService.forCourse(id)
      if (!report) return apiNotFound(`Kurs ${id} nicht gefunden`)
      if (format === 'csv') {
        const lessonHeaders = report.lessons.map((l) => `"${l.title.replace(/"/g, '""')}"`).join(',')
        const header = ['Name', 'E-Mail', 'Quelle', 'Fortschritt %', 'Erledigt', 'Gesamt', 'Letzte Aktivität', 'Frist', 'Status', lessonHeaders].filter(Boolean).join(',')
        const lines = report.rows.map((r) => {
          const cells = [
            `"${r.name.replace(/"/g, '""')}"`,
            r.email,
            r.source.join('|'),
            String(r.percentage),
            String(r.completedLessons),
            String(r.totalLessons),
            r.lastActivity ? r.lastActivity.toISOString() : '',
            r.assignment?.dueDate ? r.assignment.dueDate.toISOString().slice(0, 10) : '',
            r.assignment?.status ?? '',
          ]
          for (const l of report.lessons) {
            const p = r.perLesson[l.id]
            const q = r.quizScores[l.id]
            const cell = p?.completedAt
              ? q
                ? `${p.completedAt.toISOString().slice(0, 10)} (Quiz ${q.bestScore}%)`
                : p.completedAt.toISOString().slice(0, 10)
              : ''
            cells.push(`"${cell}"`)
          }
          return cells.join(',')
        })
        const body = [header, ...lines].join('\n')
        return new Response(body, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="course-${report.course.slug}-report.csv"`,
          },
        })
      }
      return apiSuccess(report)
    } catch (err) {
      logger.error('Course report failed', err, { module: 'CourseReportAPI' })
      return apiServerError()
    }
  })
}
