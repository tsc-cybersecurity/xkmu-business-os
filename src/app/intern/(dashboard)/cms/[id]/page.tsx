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
  LayoutTemplate,
  Type,
  Heading,
  ImageIcon,
  SquareStack,
  MousePointerClick,
  Star,
  Box,
  Check,
  MessageSquareQuote,
  CreditCard,
  HelpCircle,
  BarChart3,
  Users,
  GitBranch,
  Building2,
  Play,
  GalleryHorizontalEnd,
  Megaphone,
  Minus,
  Table2,
} from 'lucide-react'
import { CmsBlockRenderer } from '@/app/_components/cms-block-renderer'
import { toast } from 'sonner'

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
  hasDraftChanges: boolean | null
  blocks: CmsBlock[]
}

interface BlockTypeDefinition {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  category: string | null
  fields: string[]
  defaultContent: Record<string, unknown>
  defaultSettings: Record<string, unknown>
  isActive: boolean | null
  sortOrder: number | null
}

import type { LucideIcon } from 'lucide-react'
const iconMap: Record<string, LucideIcon> = {
  LayoutTemplate,
  Type,
  Heading,
  ImageIcon,
  SquareStack,
  MousePointerClick,
  Star,
  Box,
  MessageSquareQuote,
  CreditCard,
  HelpCircle,
  BarChart3,
  Users,
  GitBranch,
  Building2,
  Play,
  GalleryHorizontalEnd,
  Megaphone,
  Minus,
  Table2,
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
  const [blockTypes, setBlockTypes] = useState<BlockTypeDefinition[]>([])
  const [generatingSeo, setGeneratingSeo] = useState(false)

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

  const fetchBlockTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/cms/block-types')
      const data = await response.json()
      if (data.success) {
        setBlockTypes(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch block types:', error)
    }
  }, [])

  useEffect(() => {
    fetchPage()
    fetchBlockTypes()
  }, [fetchPage, fetchBlockTypes])

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

  // Helper: get block type info from DB-loaded data
  const getBlockTypeDef = useCallback((slug: string) => blockTypes.find((bt) => bt.slug === slug), [blockTypes])
  const getBlockTypeLabel = useCallback((slug: string) => getBlockTypeDef(slug)?.name || slug, [getBlockTypeDef])

  const handleAddBlock = async (typeOverride?: string) => {
    const blockType = typeOverride || newBlockType
    try {
      const sortOrder = page?.blocks.length || 0
      const def = getBlockTypeDef(blockType)
      const defaultContent = (def?.defaultContent as Record<string, unknown>) || {}
      await fetch(`/api/v1/cms/pages/${pageId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType,
          sortOrder,
          content: defaultContent,
          settings: {},
        }),
      })
      setShowAddBlock(false)
      setNewBlockType('text')
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
    setGeneratingSeo(true)
    try {
      const response = await fetch(`/api/v1/cms/pages/${pageId}/seo/generate`, {
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
          {page.hasDraftChanges && (
            <Badge variant="outline" className="border-orange-400 text-orange-600">
              Unveroeffentlichte Aenderungen
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePublish}>
            {page.status === 'published' && !page.hasDraftChanges ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Zurueckziehen
              </>
            ) : page.hasDraftChanges ? (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Aenderungen veroeffentlichen
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
            <Button variant="outline" className="w-full" onClick={handleGenerateSeo} disabled={generatingSeo}>
              {generatingSeo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {generatingSeo ? 'Generiere...' : 'SEO per KI generieren'}
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
                      {getBlockTypeLabel(block.blockType)}
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

      {/* Live Preview */}
      {page.blocks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Live-Vorschau</h2>
          <div className="rounded-xl border bg-white dark:bg-background overflow-hidden">
            {page.blocks.map((block) => (
              <div
                key={block.id}
                className={`relative group ${block.isVisible === false ? 'opacity-40 grayscale' : ''}`}
              >
                <div className="pointer-events-none">
                  <CmsBlockRenderer
                    blockType={block.blockType}
                    content={block.content}
                    settings={block.settings}
                  />
                </div>
                {block.isVisible === false && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Badge variant="secondary" className="text-xs">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Ausgeblendet
                    </Badge>
                  </div>
                )}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 transition-colors rounded pointer-events-none" />
                <Link
                  href={`/intern/cms/${pageId}/blocks/${block.id}`}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/10"
                >
                  <Button size="sm" variant="secondary" className="pointer-events-auto">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Bearbeiten
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Block Dialog - Visual Card Selection */}
      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Block hinzufuegen</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
            {blockTypes.map((bt) => {
              const Icon = (bt.icon ? iconMap[bt.icon] : null) || Box
              const isSelected = newBlockType === bt.slug
              const fields = (bt.fields as string[]) || []
              return (
                <button
                  key={bt.slug}
                  onClick={() => setNewBlockType(bt.slug)}
                  className={`text-left rounded-lg border-2 p-4 transition-all hover:border-blue-400 hover:shadow-sm ${
                    isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-md p-2 ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'bg-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{bt.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-blue-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{bt.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {fields.map((field) => (
                          <Badge key={field} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {/* Mini preview of selected block type */}
          <div className="rounded-lg border overflow-hidden bg-white dark:bg-background">
            <div className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/50 border-b">
              Vorschau: {getBlockTypeLabel(newBlockType)}
            </div>
            <div className="pointer-events-none max-h-64 overflow-hidden relative">
              <CmsBlockRenderer
                blockType={newBlockType}
                content={(getBlockTypeDef(newBlockType)?.defaultContent as Record<string, unknown>) || {}}
                settings={{}}
              />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-background to-transparent" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBlock(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => handleAddBlock()}>
              <Plus className="h-4 w-4 mr-2" />
              {getBlockTypeLabel(newBlockType)} hinzufuegen
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
    case 'testimonials':
      return (content.sectionTitle as string) || `${(content.items as unknown[])?.length || 0} Referenzen`
    case 'pricing':
      return (content.sectionTitle as string) || `${(content.plans as unknown[])?.length || 0} Pakete`
    case 'faq':
      return (content.sectionTitle as string) || `${(content.items as unknown[])?.length || 0} Fragen`
    case 'stats':
      return (content.sectionTitle as string) || `${(content.items as unknown[])?.length || 0} Kennzahlen`
    case 'team':
      return (content.sectionTitle as string) || `${(content.items as unknown[])?.length || 0} Mitglieder`
    case 'timeline':
      return (content.sectionTitle as string) || `${(content.items as unknown[])?.length || 0} Schritte`
    case 'logocloud':
      return (content.sectionTitle as string) || `${(content.items as unknown[])?.length || 0} Logos`
    case 'video':
      return (content.title as string) || (content.src as string) || 'Video Block'
    case 'gallery':
      return (content.sectionTitle as string) || `${(content.items as unknown[])?.length || 0} Bilder`
    case 'banner':
      return (content.text as string)?.substring(0, 60) || 'Banner'
    case 'divider':
      return `Trenner (${(content.style as string) || 'line'})`
    case 'comparison':
      return (content.sectionTitle as string) || 'Vergleichstabelle'
    case 'placeholder':
      return (content.title as string) || 'Platzhalter'
    default:
      return block.blockType
  }
}
