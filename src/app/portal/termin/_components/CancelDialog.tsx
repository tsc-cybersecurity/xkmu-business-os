'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Props {
  appt: { id: string; slotTypeName: string; startAt: string; staffTimezone: string } | null
  onClose: () => void
  onCancelled?: () => void
}

export function CancelDialog({ appt, onClose, onCancelled }: Props) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!appt) return
    setBusy(true)
    try {
      const res = await fetch(`/api/portal/termin/${appt.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Stornierung fehlgeschlagen')
      }
      toast.success('Termin storniert')
      onCancelled?.()
      onClose()
      setReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={appt !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        {appt ? (
          <>
            <DialogHeader>
              <DialogTitle>Termin stornieren</DialogTitle>
              <DialogDescription>
                {appt.slotTypeName} am {new Intl.DateTimeFormat('de-DE', { timeZone: appt.staffTimezone, dateStyle: 'long', timeStyle: 'short' }).format(new Date(appt.startAt))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">Grund (optional)</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={busy}>Abbrechen</Button>
              <Button variant="destructive" onClick={submit} disabled={busy}>
                {busy ? 'Wird storniert…' : 'Stornieren'}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
