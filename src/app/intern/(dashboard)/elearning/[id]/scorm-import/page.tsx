'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Upload, FileArchive, Download } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

export default function ScormImportPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const upload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/v1/courses/${courseId}/scorm/import`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error?.message ?? 'Import fehlgeschlagen')
        return
      }
      const created = data.data?.lessons?.length ?? 0
      toast.success(`${created} Lektion${created === 1 ? '' : 'en'} aus SCORM importiert`)
      router.push(`/intern/elearning/${courseId}`)
    } catch (err) {
      logger.error('SCORM upload failed', err, { module: 'ScormImportPage' })
      toast.error('Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  const exportZip = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/scorm/export`, { method: 'GET' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error?.message ?? 'Export fehlgeschlagen')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `course-${courseId}-scorm.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('SCORM-Paket heruntergeladen')
    } catch (err) {
      logger.error('SCORM export failed', err, { module: 'ScormImportPage' })
      toast.error('Export fehlgeschlagen')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href={`/intern/elearning/${courseId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">SCORM Import / Export</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            SCORM-Paket importieren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lade ein SCORM-1.2- oder 2004-ZIP hoch. Pro Manifest-Item wird eine Lektion
            mit einem SCORM-Iframe-Block angelegt. Bestehende Lektionen bleiben unberuehrt.
            <br />
            <span className="text-xs">
              Maximal 500 MB. Quizze/Sequencing werden nicht uebernommen — nur Inhalte +
              Completion-Status.
            </span>
          </p>
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
          />
          {file && (
            <p className="text-xs text-muted-foreground">
              Ausgewaehlt: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
          <Button onClick={upload} disabled={!file || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? 'Importiere...' : 'Importieren'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Kurs als SCORM-Paket exportieren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Erzeugt ein SCORM-1.2-ZIP des aktuellen Kurses (Lektionen werden zu HTML
            gerendert, Markdown- und einfache CMS-Bloecke werden uebernommen).
            <br />
            <span className="text-xs">
              Quiz-Inhalte und interaktive Elemente sind nicht enthalten.
            </span>
          </p>
          <Button variant="outline" onClick={exportZip} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {exporting ? 'Erzeuge...' : 'SCORM-ZIP herunterladen'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
