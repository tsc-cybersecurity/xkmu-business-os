import { NextRequest, NextResponse } from 'next/server'
import { resolveMediaPath } from '@/lib/services/media-upload.service'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params

  if (!segments || segments.length < 2) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Prevent path traversal
  if (segments.some((s) => s.includes('..') || s.includes('\0'))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const relativePath = `/api/v1/media/serve/${segments.join('/')}`
  const filePath = resolveMediaPath(relativePath)

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ext = segments[segments.length - 1].split('.').pop()?.toLowerCase() || ''
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  const buffer = await readFile(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
