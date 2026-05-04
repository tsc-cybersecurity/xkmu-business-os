'use client'

import { useState } from 'react'
import type { AvailabilityRule } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

const DAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

function ruleTime(t: string): string {
  return t.length === 8 ? t.slice(0, 5) : t
}

export function RulesEditor({ rules, onChange }: {
  rules: AvailabilityRule[]
  onChange: (next: AvailabilityRule[]) => void
}) {
  const [busy, setBusy] = useState(false)

  async function addRule(dayOfWeek: number) {
    setBusy(true)
    try {
      const res = await fetch('/api/v1/availability/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, startTime: '09:00', endTime: '17:00' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Anlegen fehlgeschlagen')
      const { rule } = await res.json()
      onChange([...rules, rule])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function patchRule(id: string, patch: Partial<{ startTime: string; endTime: string; isActive: boolean }>) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Update fehlgeschlagen')
      const { rule } = await res.json()
      onChange(rules.map(r => r.id === id ? rule : r))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  async function deleteRule(id: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/availability/rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      onChange(rules.filter(r => r.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fehler')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Definiere für jeden Wochentag, in welchen Zeitfenstern du buchbar bist. Mehrere Intervalle pro Tag möglich.
      </p>
      {DAYS_DE.map((day, idx) => {
        const dayRules = rules.filter(r => r.dayOfWeek === idx)
        return (
          <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="w-24 pt-1.5 text-sm font-medium">{day}</div>
            <div className="flex-1 space-y-2">
              {dayRules.length === 0 ? (
                <div className="text-sm text-muted-foreground">— frei —</div>
              ) : dayRules.map(r => (
                <div key={r.id} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={ruleTime(r.startTime)}
                    onChange={e => patchRule(r.id, { startTime: e.target.value })}
                    className="w-28"
                    disabled={busy}
                  />
                  <span>–</span>
                  <Input
                    type="time"
                    value={ruleTime(r.endTime)}
                    onChange={e => patchRule(r.id, { endTime: e.target.value })}
                    className="w-28"
                    disabled={busy}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)} disabled={busy} aria-label="Entfernen">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addRule(idx)} disabled={busy}>
                <Plus className="mr-1 h-4 w-4" />
                Intervall
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
