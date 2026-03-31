import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Zap } from 'lucide-react'

interface DevTask {
  taskKey: string
  title: string
}

interface DevAnalysisDialogProps {
  aiDialogTask: DevTask | null
  onClose: () => void
  aiPrompt: string
  setAiPrompt: (value: string) => void
  aiRunning: boolean
  onRunAnalysis: () => void
}

export function DevAnalysisDialog({
  aiDialogTask,
  onClose,
  aiPrompt,
  setAiPrompt,
  aiRunning,
  onRunAnalysis,
}: DevAnalysisDialogProps) {
  return (
    <Dialog open={!!aiDialogTask} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            KI-Analyse: {aiDialogTask?.taskKey} — {aiDialogTask?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Prompt (anpassbar vor dem Absenden)
            </label>
            <Textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              rows={20}
              className="text-sm font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Der Prompt wird an die KI gesendet. Das Ergebnis ersetzt die bestehenden Programmieranforderungen fuer diese Aufgabe.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={onRunAnalysis} disabled={aiRunning}>
            {aiRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {aiRunning ? 'Analysiert...' : 'KI-Analyse starten'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
