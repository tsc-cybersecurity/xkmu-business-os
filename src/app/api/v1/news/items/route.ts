import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { runWatchdog } from '@/lib/services/news-pipeline-watchdog'

export async function GET(request: NextRequest) {
  return withPermission(request, 'news', 'read', async () => {
    // Best-effort watchdog — Fehler dürfen die Liste nicht blocken
    await runWatchdog().catch(() => undefined)

    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topicId')
    const includeHidden = searchParams.get('hidden') === 'true'

    if (topicId) {
      const items = await NewsService.listItemsByTopic(topicId, { hidden: includeHidden })
      return apiSuccess(items)
    }
    const grouped = await NewsService.listAllForDashboard({ hidden: includeHidden })
    return apiSuccess(grouped)
  })
}
