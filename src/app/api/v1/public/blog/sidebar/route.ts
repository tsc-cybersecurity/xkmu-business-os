import { NextResponse } from 'next/server'
import { BlogSidebarService } from '@/lib/services/blog-sidebar.service'

// Public Read-Endpoint — wird vom Blog-Beitrags-Template gefetcht.
// Wenn die Sidebar deaktiviert ist, antworten wir mit enabled=false
// und leerem markdown, damit das Frontend einfach nicht rendert.
export async function GET() {
  try {
    const settings = await BlogSidebarService.get()
    if (!settings.enabled) {
      return NextResponse.json({ success: true, data: { enabled: false, markdown: '' } })
    }
    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: true, data: { enabled: false, markdown: '' } })
  }
}
