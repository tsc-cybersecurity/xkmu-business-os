import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { MERGED_SERVICES } from '@/lib/api-docs/merge'
import { buildStandaloneHtml } from '@/lib/api-docs/html-export'

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    const url = new URL(request.url)
    const baseUrl = url.searchParams.get('baseUrl')
      || process.env.NEXT_PUBLIC_BASE_URL
      || `${url.protocol}//${url.host}`
    const html = buildStandaloneHtml(MERGED_SERVICES, baseUrl, new Date())
    const filename = `xkmu-api-docs-${new Date().toISOString().slice(0, 10)}.html`
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  })
}
