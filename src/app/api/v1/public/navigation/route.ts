import { NextRequest, NextResponse } from 'next/server'
import { CmsNavigationService } from '@/lib/services/cms-navigation.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

// Fallback nur wenn DB leer ist
const FALLBACK_HEADER = [
  { label: 'Startseite', href: '/', sortOrder: 0, openInNewTab: false },
  { label: 'Cyber Security', href: '/cyber-security', sortOrder: 1, openInNewTab: false },
  { label: 'KI & Automation', href: '/ki-automation', sortOrder: 2, openInNewTab: false },
  { label: 'IT Consulting', href: '/it-consulting', sortOrder: 3, openInNewTab: false },
  { label: 'IT-News', href: '/it-news', sortOrder: 4, openInNewTab: false },
]

const FALLBACK_FOOTER = [
  { label: 'Kostenlos starten', href: '/intern/register', sortOrder: 0, openInNewTab: false },
  { label: 'API-Dokumentation', href: '/api-docs', sortOrder: 1, openInNewTab: false },
  { label: 'Impressum', href: '/impressum', sortOrder: 2, openInNewTab: false },
  { label: 'Kontakt', href: '/kontakt', sortOrder: 3, openInNewTab: false },
  { label: 'AGB', href: '/agb', sortOrder: 4, openInNewTab: false },
  { label: 'Datenschutz', href: '/datenschutz', sortOrder: 5, openInNewTab: false },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    if (!location || !['header', 'footer'].includes(location)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'location muss "header" oder "footer" sein' } },
        { status: 400 }
      )
    }

    // DB ist die Wahrheit — CMS-Navigation-Verwaltung bestimmt alles
    try {
      const dbItems = await CmsNavigationService.listPublic(location)

      if (dbItems.length > 0) {
        const items = dbItems.map((item) => ({
          label: item.label,
          href: item.href,
          sortOrder: item.sortOrder ?? 0,
          openInNewTab: item.openInNewTab ?? false,
        }))
        return NextResponse.json({ success: true, data: items })
      }
    } catch {
      // DB nicht erreichbar — Fallback verwenden
    }

    // Fallback wenn DB leer oder nicht erreichbar
    const fallback = location === 'header' ? FALLBACK_HEADER : FALLBACK_FOOTER
    return NextResponse.json({ success: true, data: fallback })
  } catch (error) {
    logger.error('Error fetching public navigation', error, { module: 'PublicNavigationAPI' })
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
