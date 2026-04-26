'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

export interface PublishProblem {
  lessonId?: string
  code: string
  message: string
}

export function PublishValidationDialog({
  open,
  onClose,
  problems,
}: {
  open: boolean
  onClose: () => void
  problems: PublishProblem[]
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Publish nicht möglich
          </DialogTitle>
          <DialogDescription>
            Folgende Punkte müssen vor dem Veröffentlichen behoben werden:
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 mt-4">
          {problems.map((p, i) => (
            <li key={i} className="text-sm border-l-2 border-amber-400 pl-3">
              <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
              <br />
              {p.message}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
