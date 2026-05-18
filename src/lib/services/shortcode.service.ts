import { db } from '@/lib/db'
import { cmsPages, blogPosts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'

// 6-stelliger Base36-Shortcode fuer Kurz-URLs der Form www.xkmu.de/xxxxxx.
// Eindeutigkeit gilt cross-table (cms_pages + blog_posts), weil der Resolver
// beide Tabellen durchsucht. Format wird im Catch-All-Router gematcht; keine
// strikten Validierungs-Anforderungen darueber hinaus.
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SHORTCODE_LENGTH = 6
const SHORTCODE_REGEX = /^[a-z0-9]{6}$/

export function isShortcodeFormat(s: string): boolean {
  return SHORTCODE_REGEX.test(s)
}

function randomCandidate(): string {
  // crypto.randomBytes statt Math.random — Vorhersagbarkeit raus, da der
  // Shortcode oeffentlich auflosbar ist und sonst per Brute-Force auf
  // unveroeffentlichte Drafts gefischt werden koennte.
  const buf = randomBytes(SHORTCODE_LENGTH)
  let out = ''
  for (let i = 0; i < SHORTCODE_LENGTH; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length]
  }
  return out
}

async function existsInEitherTable(code: string): Promise<boolean> {
  const [cmsHit] = await db
    .select({ id: cmsPages.id })
    .from(cmsPages)
    .where(eq(cmsPages.shortcode, code))
    .limit(1)
  if (cmsHit) return true
  const [blogHit] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.shortcode, code))
    .limit(1)
  return !!blogHit
}

export interface ResolvedShortcode {
  type: 'cms-page' | 'blog-post'
  // Kanonische oeffentliche URL, mit fuehrendem '/'.
  canonicalUrl: string
  // Ist die zugehoerige Page/Post veroeffentlicht? Resolver gibt auch
  // Drafts zurueck — die aufrufende Seite entscheidet, ob redirected
  // oder 404 ausgegeben wird (Public-Pfad blockt Drafts ohnehin).
  isPublished: boolean
}

export const ShortcodeService = {
  /**
   * Generiert einen frischen, unbenutzten Shortcode. Retry-Schleife bei
   * Kollision; faellt nach 20 Versuchen auf einen 7-Zeichen-Code zurueck
   * (theoretisch erst noetig bei >2 Mrd Eintraegen).
   */
  async generate(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const candidate = randomCandidate()
      if (!(await existsInEitherTable(candidate))) return candidate
    }
    // Extrem unwahrscheinlich — zur Sicherheit Suffix anhaengen und weitersuchen.
    for (let i = 0; i < 20; i++) {
      const candidate = randomCandidate() + ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
      if (!(await existsInEitherTable(candidate))) return candidate.slice(0, 8)
    }
    throw new Error('shortcode generation exhausted retries')
  },

  /**
   * Sucht code in beiden Tabellen. CMS-Page hat Vorrang (Slug-Routen sind
   * "primaerer" Content). Liefert die kanonische URL und den Publish-State.
   */
  async resolve(code: string): Promise<ResolvedShortcode | null> {
    if (!isShortcodeFormat(code)) return null
    const [cmsPage] = await db
      .select({ slug: cmsPages.slug, status: cmsPages.status })
      .from(cmsPages)
      .where(eq(cmsPages.shortcode, code))
      .limit(1)
    if (cmsPage) {
      return {
        type: 'cms-page',
        // cms_pages.slug ist bereits mit fuehrendem '/' gespeichert (z.B. '/ueber-uns').
        canonicalUrl: cmsPage.slug.startsWith('/') ? cmsPage.slug : `/${cmsPage.slug}`,
        isPublished: cmsPage.status === 'published',
      }
    }
    const [blogPost] = await db
      .select({ slug: blogPosts.slug, status: blogPosts.status })
      .from(blogPosts)
      .where(eq(blogPosts.shortcode, code))
      .limit(1)
    if (blogPost) {
      return {
        type: 'blog-post',
        canonicalUrl: `/it-news/${blogPost.slug}`,
        isPublished: blogPost.status === 'published',
      }
    }
    return null
  },
}
