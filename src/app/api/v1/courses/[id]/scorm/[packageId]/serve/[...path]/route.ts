import { NextRequest, NextResponse } from 'next/server'
import { tryWithPermission } from '@/lib/auth/require-permission'
import { getAuthContext } from '@/lib/auth/auth-context'
import { db } from '@/lib/db'
import { courseAssets, courses } from '@/lib/db/schema'
import { and, eq, like } from 'drizzle-orm'
import path from 'path'
import { stat, open, readdir } from 'fs/promises'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; packageId: string; path: string[] }> }

/** SCORM-Storage analog Course-Assets. */
function scormDir(): string {
  return path.resolve(
    process.env.SCORM_PACKAGE_DIR
      ?? process.env.COURSE_ASSET_DIR
      ?? path.join(process.cwd(), 'public', 'uploads', 'courses'),
  )
}

/**
 * MIME-Tabelle fuer typische SCORM-Inhalte (HTML, JS, CSS, Bilder, Video, Fonts).
 * SCORM-Pakete sind statische Web-Bundles — wir muessen Browser-MIMEs liefern,
 * sonst rendert der Iframe nicht (z.B. .js als octet-stream → script blocked).
 */
function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
  }
  return map[ext] ?? 'application/octet-stream'
}

async function streamAsset(candidate: string): Promise<NextResponse> {
  const st = await stat(candidate)
  if (!st.isFile()) {
    return NextResponse.json({ success: false, error: { code: 'NOT_A_FILE' } }, { status: 404 })
  }
  const fh = await open(candidate, 'r')
  const stream = fh.createReadStream()
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': mimeFor(candidate),
      'Content-Length': String(st.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

/**
 * Fallback: case-insensitive Lookup. Manche SCORM-Pakete sind unter Windows
 * gepackt (case-insensitive FS) — auf Linux passt der Pfad dann nicht. Wir
 * versuchen zumindest die letzten Segmente case-insensitiv zu matchen.
 */
async function findCaseInsensitive(targetAbs: string): Promise<string | null> {
  // Schrittweise von der Wurzel nach unten — pro Segment den case-insensitiven
  // Treffer suchen. Erspart kompletten Tree-Walk.
  const root = path.parse(targetAbs).root
  const parts = targetAbs.substring(root.length).split(path.sep).filter(Boolean)
  let current = root || path.sep
  for (const part of parts) {
    let entries: string[]
    try {
      entries = await readdir(current)
    } catch {
      return null
    }
    const hit = entries.find((e) => e.toLowerCase() === part.toLowerCase())
    if (!hit) return null
    current = path.join(current, hit)
  }
  return current
}

async function checkPackageAccess(
  courseId: string,
  packageId: string,
  hasAuth: boolean,
): Promise<{ allowed: boolean; status: number }> {
  // courseAssets-Eintrag mit kind='scorm' und label = "scorm-<v>|<packageId>"
  const rows = await db
    .select({
      visibility: courses.visibility,
      status: courses.status,
    })
    .from(courseAssets)
    .leftJoin(courses, eq(courseAssets.courseId, courses.id))
    .where(
      and(
        eq(courseAssets.courseId, courseId),
        eq(courseAssets.kind, 'scorm'),
        like(courseAssets.label, `%|${packageId}`),
      ),
    )
    .limit(1)
  const row = rows[0]
  if (!row || !row.visibility || !row.status) return { allowed: false, status: 404 }
  if (row.status !== 'published') return { allowed: false, status: 404 }
  if (row.visibility === 'public' || row.visibility === 'both') return { allowed: true, status: 200 }
  // 'portal' → eingeloggt erforderlich
  return hasAuth ? { allowed: true, status: 200 } : { allowed: false, status: 403 }
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { id: courseId, packageId, path: parts } = await ctx.params

  // Path-Construction + Traversal-Schutz
  const base = scormDir()
  const candidate = path.resolve(base, courseId, 'scorm', packageId, ...parts)
  if (!candidate.startsWith(base + path.sep) && candidate !== base) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_PATH', message: 'Path traversal detected' } },
      { status: 400 },
    )
  }

  // 1) Editor-/Intern-Zugriff: courses:read genuegt fuer alle Stati
  const perm = await tryWithPermission(request, 'courses', 'read')
  if (perm.allowed) {
    return tryServe(candidate, parts)
  }

  // 2) Portal-/Public-Zugriff: visibility-basiert
  const auth = await getAuthContext(request)
  const acl = await checkPackageAccess(courseId, packageId, !!auth?.userId)
  if (!acl.allowed) {
    const code = acl.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND'
    return NextResponse.json({ success: false, error: { code } }, { status: acl.status })
  }
  return tryServe(candidate, parts)
}

async function tryServe(candidate: string, parts: string[]): Promise<NextResponse> {
  try {
    return await streamAsset(candidate)
  } catch {
    // Fallback: case-insensitive Lookup
    const ci = await findCaseInsensitive(candidate)
    if (ci) {
      try {
        return await streamAsset(ci)
      } catch {
        // ignore — final 404 unten
      }
    }
    logger.warn(`SCORM serve: file not found`, {
      module: 'ScormServeAPI',
      candidate,
      requested: parts.join('/'),
    })
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `SCORM-Datei nicht gefunden: ${parts.join('/')}`,
        },
      },
      { status: 404 },
    )
  }
}
