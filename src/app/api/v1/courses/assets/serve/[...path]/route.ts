import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
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

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    const { path: parts } = await ctx.params
    const base = assetDir()
    const candidate = path.resolve(base, ...parts)
    if (!candidate.startsWith(base + path.sep) && candidate !== base) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_PATH', message: 'Path traversal detected' } },
        { status: 400 },
      )
    }

    let st
    try {
      st = await stat(candidate)
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Datei nicht gefunden' } },
        { status: 404 },
      )
    }
    if (!st.isFile()) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_A_FILE', message: 'Pfad ist keine Datei' } },
        { status: 404 },
      )
    }

    const total = st.size
    const range = request.headers.get('range')
    const fh = await open(candidate, 'r')

    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range)
      if (!m) {
        await fh.close()
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${total}` },
        })
      }
      const start = Number(m[1])
      const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1
      if (start > end || start >= total) {
        await fh.close()
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${total}` },
        })
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
  })
}
