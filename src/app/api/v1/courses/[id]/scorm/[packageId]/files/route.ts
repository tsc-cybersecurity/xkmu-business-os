import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import path from 'path'
import { readdir, stat } from 'fs/promises'

interface Ctx { params: Promise<{ id: string; packageId: string }> }

function scormDir(): string {
  return path.resolve(
    process.env.SCORM_PACKAGE_DIR
      ?? process.env.COURSE_ASSET_DIR
      ?? path.join(process.cwd(), 'public', 'uploads', 'courses'),
  )
}

/**
 * Diagnostik-Endpoint: listet alle Dateien im SCORM-Paket auf.
 * Hilft beim Debugging, wenn der Player 404 zeigt — man kann den
 * tatsaechlichen Pfad vergleichen.
 */
export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const { id: courseId, packageId } = await ctx.params
      const root = path.join(scormDir(), courseId, 'scorm', packageId)
      const files: Array<{ path: string; size: number }> = []
      await walk(root, '', files)
      return apiSuccess({ root, count: files.length, files })
    } catch (err) {
      if (err instanceof Error && err.message.includes('ENOENT')) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Paket-Verzeichnis existiert nicht' } },
          { status: 404 },
        )
      }
      return apiServerError('Listing fehlgeschlagen')
    }
  })
}

async function walk(absRoot: string, rel: string, out: Array<{ path: string; size: number }>): Promise<void> {
  const here = rel ? path.join(absRoot, rel) : absRoot
  const entries = await readdir(here, { withFileTypes: true })
  for (const e of entries) {
    const childRel = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) {
      await walk(absRoot, childRel, out)
    } else if (e.isFile()) {
      const st = await stat(path.join(here, e.name))
      out.push({ path: childRel, size: st.size })
    }
  }
}
