'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ImageIcon,
  Loader2,
  Upload,
  Trash2,
  Download,
  Copy,
} from 'lucide-react'

interface MediaUpload {
  id: string
  filename: string
  originalName: string
  mimeType: string
  sizeBytes: number
  path: string
  alt: string | null
  createdAt: string
}

function formatKB(bytes: number | null): string {
  if (!bytes) return ''
  return `${(bytes / 1024).toFixed(0)} KB`
}

export default function UploadsTab() {
  const [uploads, setUploads] = useState<MediaUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<MediaUpload | null>(null)

  const fetchUploads = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/media?limit=100')
      const data = await response.json()
      if (data.success) setUploads(data.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUploads()
  }, [fetchUploads])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/v1/media/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        toast.success('Datei hochgeladen')
        fetchUploads()
      } else {
        toast.error(data.error?.message || 'Upload fehlgeschlagen')
      }
    } catch {
      toast.error('Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      // Input zurücksetzen, damit derselbe Dateiname erneut hochladbar ist.
      e.target.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Datei wirklich löschen?')) return
    try {
      const res = await fetch(`/api/v1/media/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      toast.success('Datei gelöscht')
      setUploads((prev) => prev.filter((u) => u.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  const copyUrl = async (url: string) => {
    const fullUrl = `${window.location.origin}${url}`
    await navigator.clipboard.writeText(fullUrl)
    toast.success('URL kopiert')
  }

  const isImage = (mime: string) => mime.startsWith('image/')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Manuell hochgeladene Dateien (z.B. aus Blog-Editor und ImageField).
          Werden unter <code className="text-xs">/api/v1/media/serve/uploads/</code> bereitgestellt.
        </p>
        <div>
          <Label htmlFor="upload-input" className="cursor-pointer">
            <span
              className={`inline-flex items-center gap-2 rounded-md border bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {uploading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Upload className="h-4 w-4" />}
              Datei hochladen
            </span>
          </Label>
          <Input
            id="upload-input"
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : uploads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Keine Uploads</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lade eine Datei hoch oder verwende das ImageField in Blog-/Social-Editoren.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="group relative rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => setSelected(u)}
            >
              <div className="aspect-square bg-muted">
                {isImage(u.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.path}
                    alt={u.alt || u.originalName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                    {u.mimeType}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs line-clamp-2">{u.originalName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-3xl max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Datei-Details</DialogTitle>
                <DialogDescription className="sr-only">Details zur hochgeladenen Datei</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {isImage(selected.mimeType) && (
                  <div className="rounded-lg overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.path}
                      alt={selected.alt || selected.originalName}
                      className="w-full h-auto max-h-[50vh] object-contain"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{selected.originalName}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{selected.mimeType}</Badge>
                    <Badge variant="outline">{formatKB(selected.sizeBytes)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hochgeladen: {new Date(selected.createdAt).toLocaleString('de-DE')}
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    Pfad: {selected.path}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyUrl(selected.path)}>
                    <Copy className="mr-1 h-3 w-3" />
                    URL kopieren
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={selected.path} download target="_blank" rel="noopener">
                      <Download className="mr-1 h-3 w-3" />
                      Herunterladen
                    </a>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)}>
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
