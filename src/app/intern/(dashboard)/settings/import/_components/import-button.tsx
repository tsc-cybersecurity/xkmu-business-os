'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { logger } from '@/lib/utils/logger'

interface ImportStats {
  totalStatements: number
  totalInserted: number
  tablesAffected: number
  perTable: Record<string, number>
  errors?: string[]
}

export function ImportButton() {
  const [isImporting, setIsImporting] = useState(false)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.sql')) {
      toast.error('Nur .sql-Dateien werden akzeptiert')
      return
    }

    setSelectedFile(file)
  }

  const handleImportClick = () => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie zuerst eine Datei aus')
      return
    }

    if (mode === 'replace') {
      setShowConfirm(true)
    } else {
      startImport()
    }
  }

  const startImport = async () => {
    if (!selectedFile) return
    setShowConfirm(false)
    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('mode', mode)

      const response = await fetch('/api/v1/import/database', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import fehlgeschlagen')
      }

      const stats = data.stats as ImportStats

      toast.success(
        `Import erfolgreich: ${stats.totalInserted} von ${stats.totalStatements} Einträgen in ${stats.tablesAffected} Tabellen importiert`
      )

      if (stats.errors && stats.errors.length > 0) {
        toast.warning(
          `${stats.errors.length} Einträge konnten nicht importiert werden`
        )
      }

      // Datei-Input zurücksetzen
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      logger.error('Import error', error, { module: 'SettingsImportPage' })
      toast.error(
        error instanceof Error ? error.message : 'Import fehlgeschlagen'
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={mode}
          onValueChange={(v) => setMode(v as 'merge' | 'replace')}
        >
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Import-Modus wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="merge">
              Zusammenführen (bestehende Daten behalten)
            </SelectItem>
            <SelectItem value="replace">
              Ersetzen (bestehende Daten löschen)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            onChange={handleFileSelect}
            className="hidden"
            id="sql-file-input"
          />
          <label
            htmlFor="sql-file-input"
            className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <FileUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {selectedFile ? selectedFile.name : 'SQL-Datei auswählen...'}
            </span>
          </label>
        </div>

        <Button
          onClick={handleImportClick}
          disabled={isImporting || !selectedFile}
          className="w-full sm:w-auto"
          size="lg"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importiere...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              SQL-Import starten
            </>
          )}
        </Button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestehende Daten ersetzen?</DialogTitle>
            <DialogDescription>
              Im Modus &quot;Ersetzen&quot; werden alle bestehenden Daten Ihres
              Organisationsdaten gelöscht und durch die Daten aus der Import-Datei
              ersetzt. Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={startImport}>
              Ja, Daten ersetzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
