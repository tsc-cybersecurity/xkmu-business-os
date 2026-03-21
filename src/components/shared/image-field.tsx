'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ImageGeneratorDialog } from './image-generator-dialog'

interface ImageFieldProps {
  imageUrl: string
  onImageChange: (url: string) => void
  label?: string
  category?: string
}

export function ImageField({ imageUrl, onImageChange, label = 'Bild (optional)', category = 'general' }: ImageFieldProps) {
  const [showGallery, setShowGallery] = useState(false)
  const [galleryImages, setGalleryImages] = useState<Array<{ id: string; imageUrl: string; prompt: string }>>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadGallery = async () => {
    try {
      const res = await fetch(`/api/v1/images?limit=30`)
      const data = await res.json()
      if (data.success) setGalleryImages(data.data || [])
    } catch { /* ignore */ }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wählen Sie eine Bilddatei aus')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        onImageChange(data.data.path)
        toast.success('Bild hochgeladen')
      } else {
        toast.error(data.error?.message || 'Upload fehlgeschlagen')
      }
    } catch {
      toast.error('Fehler beim Hochladen')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {imageUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Ausgewähltes Bild" className="h-32 w-auto rounded-lg border" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={() => onImageChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ImageGeneratorDialog
            defaultCategory={category}
            onImageGenerated={onImageChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setShowGallery(!showGallery); if (!showGallery) loadGallery() }}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Aus Galerie
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Hochladen
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      )}
      {showGallery && !imageUrl && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-lg p-2">
          {galleryImages.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-4">
              Keine Bilder in der Galerie
            </p>
          )}
          {galleryImages.map(img => (
            <button
              key={img.id}
              type="button"
              className="aspect-square rounded border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
              onClick={() => { onImageChange(img.imageUrl); setShowGallery(false) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.imageUrl} alt={img.prompt} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
