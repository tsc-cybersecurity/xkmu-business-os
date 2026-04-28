import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CourseReportService } from '@/lib/services/course-report.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const url = new URL(request.url)
      const groupId = url.searchParams.get('groupId') || undefined
      const format = url.searchParams.get('format')
      const rows = await CourseReportService.complianceOverview(groupId ? { groupId } : undefined)
      if (format === 'csv') {
        const header = ['Name', 'E-Mail', 'Kurs', 'Frist', 'Status', 'Fortschritt %', 'Erledigt', 'Gesamt', 'Gruppen'].join(',')
        const lines = rows.map((r) => [
          `"${r.name.replace(/"/g, '""')}"`,
          r.email,
          `"${r.courseTitle.replace(/"/g, '""')}"`,
          r.dueDate ? r.dueDate.toISOString().slice(0, 10) : '',
          r.status,
          String(r.percentage),
          String(r.completedLessons),
          String(r.totalLessons),
          `"${r.groupNames.join('|').replace(/"/g, '""')}"`,
        ].join(','))
        const body = [header, ...lines].join('\n')
        return new Response(body, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="elearning-compliance.csv"',
          },
        })
      }
      return apiSuccess(rows)
    } catch (err) {
      logger.error('Compliance report failed', err, { module: 'CourseReportAPI' })
      return apiServerError()
    }
  })
}
