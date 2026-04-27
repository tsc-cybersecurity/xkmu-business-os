import { NextRequest, NextResponse } from 'next/server'
import { tryWithPermission } from '@/lib/auth/require-permission'
import { checkAssetAccess, type SessionLike } from '@/lib/utils/course-asset-acl'
import { getAuthContext } from '@/lib/auth/auth-context'
import path from 'path'
import { stat, open } from 'fs/promises'

interface Ctx { params: Promise<{ path: string[] }> }

function assetDir(): string {
  return path.resolve(
    process.env.COURSE_ASSET_DIR ?? path.join(process.cwd(), 'public', 'uploads', 'courses'),
  )
}

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return map[ext] ?? 'application/octet-stream'
}

async function streamAsset(candidate: string, request: NextRequest): Promise<NextResponse> {
  const st = await stat(candidate)
  if (!st.isFile()) {
    return NextResponse.json({ success: false, error: { code: 'NOT_A_FILE' } }, { status: 404 })
  }
  const total = st.size
  const range = request.headers.get('range')
  const fh = await open(candidate, 'r')

  if (range) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(range)
    if (!m) {
      await fh.close()
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
    }
    const start = Number(m[1])
    const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1
    if (start > end || start >= total) {
      await fh.close()
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
    }
    const stream = fh.createReadStream({ start, end })
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Type': mimeFor(candidate),
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
      },
    })
  }

  const stream = fh.createReadStream()
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': mimeFor(candidate),
      'Content-Length': String(total),
      'Accept-Ranges': 'bytes',
    },
  })
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { path: parts } = await ctx.params
  const base = assetDir()
  const candidate = path.resolve(base, ...parts)
  if (!candidate.startsWith(base + path.sep) && candidate !== base) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_PATH', message: 'Path traversal detected' } },
      { status: 400 },
    )
  }

  const rawPath = parts.join('/')

  // 1) Intern-Pfad: User mit courses:read darf alles (auch draft/archived) — Editor-Vorschau
  const perm = await tryWithPermission(request, 'courses', 'read')
  if (perm.allowed) {
    try {
      return await streamAsset(candidate, request)
    } catch {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })
    }
  }

  // 2) Public/Portal-Pfad: visibility-basierte ACL
  const auth = await getAuthContext(request)
  const session: SessionLike = auth?.userId ? { user: { id: auth.userId } } : { user: null }
  const acl = await checkAssetAccess(rawPath, session)
  if (!acl.allowed) {
    const code = acl.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND'
    return NextResponse.json({ success: false, error: { code } }, { status: acl.status })
  }
  try {
    return await streamAsset(candidate, request)
  } catch {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }
}
