'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'

interface ImageGeneratorDialogProps {
  onImageGenerated: (imageUrl: string) => void
  defaultCategory?: string
  trigger?: React.ReactNode
}

const PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini', models: [
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
    { value: 'nano-banana-pro-preview', label: 'Nano Banana Pro' },
    { value: 'imagen-4.0-fast-generate-001', label: 'Imagen 4.0 Fast' },
  ]},
  { value: 'kie', label: 'kie.ai', models: [
    { value: 'nano-banana-2', label: 'Nano Banana 2' },
    { value: 'flux-2/flex-text-to-image', label: 'Flux 2' },
    { value: 'mj', label: 'Midjourney' },
    { value: '4o', label: 'GPT-4o Image' },
    { value: 'ghibli', label: 'Ghibli AI' },
  ]},
  { value: 'openai', label: 'DALL-E 3 (OpenAI)', models: [
    { value: 'dall-e-3', label: 'DALL-E 3' },
  ]},
]

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Quadrat)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
]

export function ImageGeneratorDialog({ onImageGenerated, defaultCategory = 'general', trigger }: ImageGeneratorDialogProps) {
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState('gemini')
  const [model, setModel] = useState('gemini-2.5-flash-image')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentModels = PROVIDERS.find(p => p.value === provider)?.models || []

  const pollTaskStatus = async (taskId: string, taskPrompt: string, taskModel: string, taskCategory: string): Promise<string> => {
    const maxPolls = 60 // ~2 minutes with 2s interval
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const res = await fetch('/api/v1/images/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, prompt: taskPrompt, model: taskModel, category: taskCategory }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || 'Status-Abfrage fehlgeschlagen')

      if (data.data.status === 'completed' && data.data.imageUrl) {
        return data.data.imageUrl
      }
      if (data.data.status === 'error') {
        throw new Error(data.data.error || 'Bildgenerierung fehlgeschlagen')
      }
    }
    throw new Error('Bildgenerierung Timeout — bitte erneut versuchen')
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Bitte geben Sie einen Prompt ein')
      return
    }

    setGenerating(true)
    setPreviewUrl(null)
    setError(null)

    try {
      const response = await fetch('/api/v1/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider,
          model,
          aspectRatio,
          category: defaultCategory,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Server-Fehler (${response.status}). API-Route nicht erreichbar.`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error?.message || 'Generierung fehlgeschlagen')
      }

      // If kie.ai: async polling via taskId
      if (data.data.taskId && data.data.status === 'processing') {
        setError(null)
        toast.info('Bildgenerierung gestartet, bitte warten...')
        const imageUrl = await pollTaskStatus(data.data.taskId, prompt.trim(), model, defaultCategory)
        setPreviewUrl(imageUrl)
        toast.success('Bild generiert!')
      } else {
        // OpenAI: direct result
        setPreviewUrl(data.data.imageUrl)
        setError(null)
        toast.success('Bild generiert!')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler bei der Bildgenerierung.'
      setError(msg)
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  const handleUse = () => {
    if (previewUrl) {
      onImageGenerated(previewUrl)
      setOpen(false)
      setPrompt('')
      setPreviewUrl(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Wand2 className="mr-2 h-4 w-4" />
            Bild generieren
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>KI-Bild generieren</DialogTitle>
          <DialogDescription>
            Beschreiben Sie das Bild und wählen Sie einen Provider.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="z.B. Professionelles Team-Meeting in modernem Büro, hell und freundlich"
              rows={3}
              disabled={generating}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <div className="space-y-2">
              <Label>Format</Label>
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
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {previewUrl && (
            <div className="rounded-lg overflow-hidden border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={prompt} className="w-full h-auto max-h-64 object-contain" />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="flex-1"
            >
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generiert...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />{previewUrl ? 'Nochmal generieren' : 'Generieren'}</>
              )}
            </Button>
            {previewUrl && (
              <Button onClick={handleUse} variant="secondary">
                Übernehmen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
