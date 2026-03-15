'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const response = await fetch('/api/v1/export/database', {
        method: 'GET',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export fehlgeschlagen')
      }

      // SQL als Datei herunterladen
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Dateiname mit Timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      a.download = `database-export-${timestamp}.sql`

      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Datenbank erfolgreich exportiert')
    } catch (error) {
      logger.error('Export error', error, { module: 'SettingsExportPage' })
      toast.error(error instanceof Error ? error.message : 'Export fehlgeschlagen')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      className="w-full sm:w-auto"
      size="lg"
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exportiere...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          SQL-Export herunterladen
        </>
      )}
    </Button>
  )
}
