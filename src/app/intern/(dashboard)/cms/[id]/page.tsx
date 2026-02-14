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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Globe,
  Sparkles,
} from 'lucide-react'

interface CmsBlock {
  id: string
  blockType: string
  sortOrder: number | null
  content: Record<string, unknown>
  settings: Record<string, unknown>
  isVisible: boolean | null
}

interface CmsPage {
  id: string
  slug: string
  title: string
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  ogImage: string | null
  status: string | null
  blocks: CmsBlock[]
}

const blockTypeLabels: Record<string, string> = {
  hero: 'Hero',
  features: 'Features',
  cta: 'Call-to-Action',
  text: 'Text',
  heading: 'Ueberschrift',
  image: 'Bild',
  cards: 'Karten',
  placeholder: 'Platzhalter',
}

export default function CmsPageEditorPage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.id as string

  const [page, setPage] = useState<CmsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [newBlockType, setNewBlockType] = useState('text')

  // SEO form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')
  const [ogImage, setOgImage] = useState('')

  const fetchPage = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/cms/pages/${pageId}`)
      const data = await response.json()
      if (data.success) {
        setPage(data.data)
        setTitle(data.data.title)
        setSlug(data.data.slug)
        setSeoTitle(data.data.seoTitle || '')
        setSeoDescription(data.data.seoDescription || '')
        setSeoKeywords(data.data.seoKeywords || '')
        setOgImage(data.data.ogImage || '')
      }
    } catch (error) {
      console.error('Failed to fetch CMS page:', error)
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/v1/cms/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          seoTitle: seoTitle || undefined,
          seoDescription: seoDescription || undefined,
          seoKeywords: seoKeywords || undefined,
          ogImage: ogImage || undefined,
        }),
      })
      fetchPage()
    } catch (error) {
      console.error('Failed to save page:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddBlock = async () => {
    try {
      const sortOrder = page?.blocks.length || 0
      await fetch(`/api/v1/cms/pages/${pageId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType: newBlockType,
          sortOrder,
          content: {},
          settings: {},
        }),
      })
      setShowAddBlock(false)
      fetchPage()
    } catch (error) {
      console.error('Failed to add block:', error)
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Block wirklich loeschen?')) return
    try {
      await fetch(`/api/v1/cms/blocks/${blockId}`, { method: 'DELETE' })
      fetchPage()
    } catch (error) {
      console.error('Failed to delete block:', error)
    }
  }

  const handleDuplicateBlock = async (blockId: string) => {
    try {
      await fetch(`/api/v1/cms/blocks/${blockId}/duplicate`, { method: 'POST' })
      fetchPage()
    } catch (error) {
      console.error('Failed to duplicate block:', error)
    }
  }

  const handleToggleVisibility = async (block: CmsBlock) => {
    try {
      await fetch(`/api/v1/cms/blocks/${block.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !block.isVisible }),
      })
      fetchPage()
    } catch (error) {
      console.error('Failed to toggle visibility:', error)
    }
  }

  const handleMoveBlock = async (blockIndex: number, direction: 'up' | 'down') => {
    if (!page) return
    const blocks = [...page.blocks]
    const swapIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1
    if (swapIndex < 0 || swapIndex >= blocks.length) return

    const blockIds = blocks.map((b) => b.id)
    ;[blockIds[blockIndex], blockIds[swapIndex]] = [blockIds[swapIndex], blockIds[blockIndex]]

    try {
      await fetch(`/api/v1/cms/pages/${pageId}/blocks/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockIds }),
      })
      fetchPage()
    } catch (error) {
      console.error('Failed to reorder blocks:', error)
    }
  }

  const handlePublish = async () => {
    const isPublished = page?.status === 'published'
    try {
      await fetch(`/api/v1/cms/pages/${pageId}/publish${isPublished ? '?unpublish=true' : ''}`, {
        method: 'POST',
      })
      fetchPage()
    } catch (error) {
      console.error('Failed to publish/unpublish:', error)
    }
  }

  const handleGenerateSeo = async () => {
    try {
      const response = await fetch(`/api/v1/cms/pages/${pageId}/seo/generate`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success && data.data) {
        if (data.data.seoTitle) setSeoTitle(data.data.seoTitle)
        if (data.data.seoDescription) setSeoDescription(data.data.seoDescription)
        if (data.data.seoKeywords) setSeoKeywords(data.data.seoKeywords)
      }
    } catch (error) {
      console.error('Failed to generate SEO:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!page) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Seite nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/intern/cms">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{page.title}</h1>
            <p className="text-sm text-muted-foreground font-mono">{page.slug}</p>
          </div>
          <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
            {page.status === 'published' ? 'Veroeffentlicht' : 'Entwurf'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePublish}>
            {page.status === 'published' ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Zurueckziehen
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Veroeffentlichen
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Speichern
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: SEO Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seiten-Einstellungen</CardTitle>
          </CardHeader>
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
              <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="keyword1, keyword2, ..." />
            </div>
            <div className="space-y-2">
              <Label>OG Image URL</Label>
              <Input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..." />
            </div>
            <Button variant="outline" className="w-full" onClick={handleGenerateSeo}>
              <Sparkles className="h-4 w-4 mr-2" />
              SEO per KI generieren
            </Button>
          </CardContent>
        </Card>

        {/* Right: Block List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bloecke ({page.blocks.length})</h2>
            <Button onClick={() => setShowAddBlock(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Block hinzufuegen
            </Button>
          </div>

          {page.blocks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Noch keine Bloecke vorhanden. Fuegen Sie den ersten Block hinzu.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {page.blocks.map((block, index) => (
                <Card key={block.id} className={block.isVisible === false ? 'opacity-50' : ''}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => handleMoveBlock(index, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === page.blocks.length - 1}
                        onClick={() => handleMoveBlock(index, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <Badge variant="outline" className="shrink-0">
                      {blockTypeLabels[block.blockType] || block.blockType}
                    </Badge>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {getBlockPreview(block)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/intern/cms/${pageId}/blocks/${block.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Bearbeiten">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={block.isVisible ? 'Ausblenden' : 'Einblenden'}
                        onClick={() => handleToggleVisibility(block)}
                      >
                        {block.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Duplizieren"
                        onClick={() => handleDuplicateBlock(block.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Loeschen"
                        onClick={() => handleDeleteBlock(block.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block hinzufuegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Blocktyp</Label>
              <Select value={newBlockType} onValueChange={setNewBlockType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(blockTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBlock(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddBlock}>
              Hinzufuegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getBlockPreview(block: CmsBlock): string {
  const content = block.content as Record<string, unknown>
  switch (block.blockType) {
    case 'hero':
      return (content.headline as string) || 'Hero Block'
    case 'features':
      return (content.sectionTitle as string) || 'Features Block'
    case 'cta':
      return (content.headline as string) || 'CTA Block'
    case 'text':
      return ((content.content as string) || '').substring(0, 80) || 'Text Block'
    case 'heading':
      return (content.text as string) || 'Ueberschrift Block'
    case 'image':
      return (content.alt as string) || (content.src as string) || 'Bild Block'
    case 'cards':
      return `${(content.items as unknown[])?.length || 0} Karten`
    case 'placeholder':
      return (content.title as string) || 'Platzhalter'
    default:
      return block.blockType
  }
}
