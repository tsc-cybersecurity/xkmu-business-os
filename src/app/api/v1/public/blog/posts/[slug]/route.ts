import { NextRequest, NextResponse } from 'next/server'
import { BlogPostService } from '@/lib/services/blog-post.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await BlogPostService.getBySlugPublic(slug)

    if (!post) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Beitrag nicht gefunden' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: post })
  } catch (error) {
    console.error('Error fetching public blog post:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
