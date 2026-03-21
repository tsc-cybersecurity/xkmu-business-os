'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Download,
  Copy,
  Sparkles,
  Wand2,
  CheckCircle2,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface GeneratedImage {
  id: string
  prompt: string
  revisedPrompt: string | null
  provider: string
  model: string
  size: string | null
  style: string | null
  imageUrl: string
  category: string | null
  tags: string[]
  sizeBytes: number | null
  createdAt: string
}

// ============================================
// Constants
// ============================================

const CATEGORIES = [
  { value: 'all', label: 'Alle' },
  { value: 'general', label: 'Allgemein' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'blog', label: 'Blog' },
  { value: 'marketing', label: 'Marketing' },
]

const PROVIDERS = [
  { value: 'kie', label: 'kie.ai', models: [
    { value: 'nano-banana-2', label: 'Nano Banana 2 (schnell)' },
    { value: 'flux-2/flex-text-to-image', label: 'Flux 2' },
    { value: 'mj', label: 'Midjourney' },
    { value: '4o', label: 'GPT-4o Image' },
    { value: 'ghibli', label: 'Ghibli AI' },
  ]},
  { value: 'openai', label: 'DALL-E 3 (OpenAI direkt)', models: [
    { value: 'dall-e-3', label: 'DALL-E 3' },
  ]},
]

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Quadrat)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '4:3', label: '4:3 (Standard)' },
]

const providerLabels: Record<string, string> = {
  openai: 'DALL-E 3',
  kie: 'kie.ai',
}

const modelLabels: Record<string, string> = {
  'dall-e-3': 'DALL-E 3',
  'nano-banana-2': 'Nano Banana 2',
  'flux-2/flex-text-to-image': 'Flux 2',
  'mj': 'Midjourney',
  '4o': 'GPT-4o Image',
  'ghibli': 'Ghibli AI',
}

// ============================================
// Component
// ============================================

export default function ImagesPage() {
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)

  // Generate form
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState('kie')
  const [model, setModel] = useState('nano-banana-2')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [category, setCategory] = useState('general')
  const [style, setStyle] = useState('vivid')

  const fetchImages = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (search) params.set('search', search)

      const response = await fetch(`/api/v1/images?${params}`)
      const data = await response.json()
      if (data.success) setImages(data.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, search])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Bitte geben Sie einen Prompt ein')
      return
    }

    setGenerating(true)
    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        provider,
        model,
        aspectRatio,
        category,
      }
      if (provider === 'openai') {
        body.style = style
      }

      const response = await fetch('/api/v1/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Server-Fehler (${response.status})`)
      }

      const data = await response.json()
      if (data.success) {
        toast.success('Bild erfolgreich generiert!')
        setGenerateOpen(false)
        setPrompt('')
        fetchImages()
      } else {
        toast.error(data.error?.message || 'Generierung fehlgeschlagen')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler bei der Bildgenerierung. Bitte Provider-Konfiguration prüfen.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bild wirklich löschen?')) return
    try {
      await fetch(`/api/v1/images/${id}`, { method: 'DELETE' })
      toast.success('Bild gelöscht')
      setImages(prev => prev.filter(i => i.id !== id))
      if (selectedImage?.id === id) setSelectedImage(null)
    } catch {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  const copyUrl = async (url: string) => {
    const fullUrl = `${window.location.origin}${url}`
    await navigator.clipboard.writeText(fullUrl)
    toast.success('URL kopiert')
  }

  const currentModels = PROVIDERS.find(p => p.value === provider)?.models || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-primary" />
            Bildgenerierung & Galerie
          </h1>
          <p className="text-muted-foreground">
            KI-generierte Bilder fuer Social Media, Website und Marketing
          </p>
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Wand2 className="mr-2 h-4 w-4" />
              Bild generieren
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)]">
            <DialogHeader>
              <DialogTitle>Neues Bild generieren</DialogTitle>
              <DialogDescription>
                Beschreiben Sie das gewünschte Bild und wählen Sie den Provider.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="z.B. Ein modernes Bürogebäude bei Sonnenuntergang, minimalistisch, professionell"
                  rows={3}
                  disabled={generating}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={v => {
                    setProvider(v)
                    const models = PROVIDERS.find(p => p.value === v)?.models || []
                    if (models.length > 0) setModel(models[0].value)
                  }} disabled={generating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modell</Label>
                  <Select value={model} onValueChange={setModel} disabled={generating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentModels.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Seitenverhältnis</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={generating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={category} onValueChange={setCategory} disabled={generating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {provider === 'openai' && (
                <div className="space-y-2">
                  <Label>Stil (DALL-E)</Label>
                  <Select value={style} onValueChange={setStyle} disabled={generating}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vivid">Lebendig</SelectItem>
                      <SelectItem value="natural">Natürlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird generiert...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generieren
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Prompt suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Keine Bilder</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Generieren Sie Ihr erstes KI-Bild.
            </p>
            <Button className="mt-4" onClick={() => setGenerateOpen(true)}>
              <Wand2 className="mr-2 h-4 w-4" />
              Bild generieren
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map(image => (
            <div
              key={image.id}
              className="group relative rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => setSelectedImage(image)}
            >
              <div className="aspect-square bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt={image.prompt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px] px-1">
                    {modelLabels[image.model] || image.model}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Detail Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={open => { if (!open) setSelectedImage(null) }}>
        <DialogContent className="sm:max-w-3xl max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Bild-Details</DialogTitle>
                <DialogDescription className="sr-only">Details zum generierten Bild</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.prompt}
                    className="w-full h-auto max-h-[50vh] object-contain"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Prompt</p>
                    <p className="text-sm">{selectedImage.prompt}</p>
                  </div>
                  {selectedImage.revisedPrompt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Überarbeiteter Prompt (KI)</p>
                      <p className="text-xs text-muted-foreground">{selectedImage.revisedPrompt}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {providerLabels[selectedImage.provider] || selectedImage.provider}
                    </Badge>
                    <Badge variant="outline">
                      {modelLabels[selectedImage.model] || selectedImage.model}
                    </Badge>
                    {selectedImage.size && <Badge variant="outline">{selectedImage.size}</Badge>}
                    {selectedImage.category && (
                      <Badge variant="secondary">
                        {CATEGORIES.find(c => c.value === selectedImage.category)?.label || selectedImage.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Erstellt: {new Date(selectedImage.createdAt).toLocaleString('de-DE')}
                    {selectedImage.sizeBytes && ` · ${(selectedImage.sizeBytes / 1024).toFixed(0)} KB`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyUrl(selectedImage.imageUrl)}>
                    <Copy className="mr-1 h-3 w-3" />
                    URL kopieren
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedImage.imageUrl} download target="_blank" rel="noopener">
                      <Download className="mr-1 h-3 w-3" />
                      Herunterladen
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(selectedImage.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Löschen
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
