'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function CancelConfirm({ token }: { token: string }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const res = await fetch('/api/buchen/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: reason || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Stornierung fehlgeschlagen')
      }
      setDone(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-emerald-50 p-4 text-emerald-900">
        <p className="font-medium">Termin storniert.</p>
        <p className="text-sm mt-1">Eine Bestätigung wurde an deine E-Mail-Adresse gesendet.</p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">Grund (optional)</label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
      </div>
      <Button type="submit" disabled={busy} variant="destructive">
        {busy ? 'Wird storniert…' : 'Termin stornieren'}
      </Button>
    </form>
  )
}
