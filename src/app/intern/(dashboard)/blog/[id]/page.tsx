'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Save, Globe, EyeOff, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  featuredImage: string | null
  featuredImageAlt: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  tags: string[] | null
  category: string | null
  status: string | null
  source: string | null
}

export default function BlogPostEditorPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [featuredImageAlt, setFeaturedImageAlt] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [category, setCategory] = useState('')
  const [generatingSeo, setGeneratingSeo] = useState(false)

  const fetchPost = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/blog/posts/${postId}`)
      const data = await response.json()
      if (data.success) {
        const p = data.data
        setPost(p)
        setTitle(p.title)
        setSlug(p.slug)
        setExcerpt(p.excerpt || '')
        setContent(p.content || '')
        setFeaturedImage(p.featuredImage || '')
        setFeaturedImageAlt(p.featuredImageAlt || '')
        setSeoTitle(p.seoTitle || '')
        setSeoDescription(p.seoDescription || '')
        setSeoKeywords(p.seoKeywords || '')
        setTagsStr((p.tags || []).join(', '))
        setCategory(p.category || '')
      }
    } catch (error) {
      console.error('Failed to fetch blog post:', error)
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/v1/blog/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          excerpt: excerpt || '',
          content: content || '',
          featuredImage: featuredImage || '',
          featuredImageAlt: featuredImageAlt || '',
          seoTitle: seoTitle || '',
          seoDescription: seoDescription || '',
          seoKeywords: seoKeywords || '',
          tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
          category: category || '',
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Beitrag gespeichert')
        fetchPost()
      } else {
        toast.error(data.error?.message || 'Speichern fehlgeschlagen')
      }
    } catch (error) {
      console.error('Failed to save post:', error)
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    const isPublished = post?.status === 'published'
    try {
      await fetch(`/api/v1/blog/posts/${postId}/publish${isPublished ? '?unpublish=true' : ''}`, {
        method: 'POST',
      })
      fetchPost()
    } catch (error) {
      console.error('Failed to publish/unpublish:', error)
    }
  }

  const handleGenerateSeo = async () => {
    setGeneratingSeo(true)
    try {
      const response = await fetch(`/api/v1/blog/posts/${postId}/seo/generate`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success && data.data) {
        if (data.data.seoTitle) setSeoTitle(data.data.seoTitle)
        if (data.data.seoDescription) setSeoDescription(data.data.seoDescription)
        if (data.data.seoKeywords) setSeoKeywords(data.data.seoKeywords)
        toast.success('SEO-Daten erfolgreich generiert')
      } else {
        toast.error(data.error?.message || 'SEO-Generierung fehlgeschlagen')
      }
    } catch (error) {
      console.error('Failed to generate SEO:', error)
      toast.error('SEO-Generierung fehlgeschlagen. Ist ein KI-Provider konfiguriert?')
    } finally {
      setGeneratingSeo(false)
    }
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (data.success) {
        setFeaturedImage(data.data.path)
        toast.success('Bild erfolgreich hochgeladen')
      } else {
        toast.error(data.error?.message || 'Upload fehlgeschlagen')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Bild-Upload fehlgeschlagen')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!post) {
    return <div className="text-center py-16"><p className="text-muted-foreground">Beitrag nicht gefunden</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/intern/blog">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Beitrag bearbeiten</h1>
            <p className="text-sm text-muted-foreground font-mono">{post.slug}</p>
          </div>
          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
            {post.status === 'published' ? 'Veroeffentlicht' : 'Entwurf'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePublish}>
            {post.status === 'published' ? (
              <><EyeOff className="h-4 w-4 mr-2" />Zurueckziehen</>
            ) : (
              <><Globe className="h-4 w-4 mr-2" />Veroeffentlichen</>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Speichern
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Inhalt</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Zusammenfassung</Label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Inhalt (Markdown)</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20} className="font-mono text-sm" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Bild & Medien</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Beitragsbild URL</Label>
                <Input value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} placeholder="https:// oder /uploads/..." />
              </div>
              <div className="space-y-2">
                <Label>Alt-Text</Label>
                <Input value={featuredImageAlt} onChange={(e) => setFeaturedImageAlt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bild hochladen</Label>
                <Input type="file" accept="image/*" onChange={handleUploadImage} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Kategorisierung</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z.B. IT-Sicherheit" />
              </div>
              <div className="space-y-2">
                <Label>Tags (kommagetrennt)</Label>
                <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="tag1, tag2, tag3" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>SEO Titel</Label>
                  <span className="text-xs text-muted-foreground">{seoTitle.length}/70</span>
                </div>
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>SEO Beschreibung</Label>
                  <span className="text-xs text-muted-foreground">{seoDescription.length}/160</span>
                </div>
                <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={160} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>SEO Keywords</Label>
                <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} />
              </div>
              <Button variant="outline" className="w-full" onClick={handleGenerateSeo} disabled={generatingSeo}>
                {generatingSeo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {generatingSeo ? 'Generiere...' : 'SEO per KI generieren'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
