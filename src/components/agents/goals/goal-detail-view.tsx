'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ManualTriggers } from '@/components/agents/runs/manual-triggers'

interface DetailData {
  goal: {
    id: string
    title: string
    description: string | null
    status: string
    spentCents: number
    spentTokens: number
    budgetCents: number | null
    budgetTokens: number | null
    createdAt: string
    completedAt: string | null
  }
  runs: Array<{ id: string; status: string; startedAt: string; finishedAt: string | null; lastError: string | null }>
  steps: Array<{
    id: string
    stepKey: string
    workerType: string
    status: string
    resultSummary: string | null
    error: string | null
    startedAt: string | null
    finishedAt: string | null
  }>
  latestRunId: string | null
}

const STEP_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  running: 'secondary',
  succeeded: 'default',
  failed: 'destructive',
  skipped: 'outline',
}

const TERMINAL_STATUS = new Set(['done', 'failed', 'cancelled'])

export function GoalDetailView({ goalId }: { goalId: string }) {
  const [data, setData] = useState<DetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/agents/goals/${goalId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as DetailData
      setData(json)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    void load()
  }, [goalId])

  // Status-Polling: solange Goal nicht terminal, alle 5s reload
  useEffect(() => {
    if (!data) return
    if (TERMINAL_STATUS.has(data.goal.status)) return
    const handle = setInterval(() => { void load() }, 5_000)
    return () => clearInterval(handle)
  }, [data?.goal.status, goalId])

  async function action(act: 'pause' | 'resume' | 'cancel' | 'start') {
    setActing(true)
    try {
      const res = await fetch(`/api/agents/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success(`Aktion '${act}' ausgefuehrt`)
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setActing(false)
    }
  }

  if (error) return <p className="text-destructive">Fehler: {error}</p>
  if (!data) return <p className="text-muted-foreground">Lade …</p>

  const { goal, steps } = data
  const canPause = goal.status === 'running' || goal.status === 'planning'
  const canResume = goal.status === 'paused'
  const canCancel = !TERMINAL_STATUS.has(goal.status)
  const canStart = goal.status === 'draft'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{goal.title}</span>
            <Badge>{goal.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goal.description && <p className="text-sm whitespace-pre-wrap mb-3">{goal.description}</p>}
          <div className="text-xs text-muted-foreground space-x-3">
            <span>Spent: {(goal.spentCents / 100).toFixed(2)} EUR / {goal.spentTokens.toLocaleString('de-DE')} tokens</span>
            {goal.budgetCents != null && <span>· Budget: {(goal.budgetCents / 100).toFixed(2)} EUR</span>}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {canStart && <Button size="sm" onClick={() => action('start')} disabled={acting}>Starten</Button>}
            {canPause && <Button size="sm" variant="secondary" onClick={() => action('pause')} disabled={acting}>Pausieren</Button>}
            {canResume && <Button size="sm" onClick={() => action('resume')} disabled={acting}>Fortsetzen</Button>}
            {canCancel && <Button size="sm" variant="destructive" onClick={() => action('cancel')} disabled={acting}>Abbrechen</Button>}
            <Button size="sm" variant="outline" onClick={() => {
              setEditTitle(data.goal.title)
              setEditDescription(data.goal.description ?? '')
              setEditBudget(data.goal.budgetCents !== null ? String(data.goal.budgetCents) : '')
              setEditing(true)
            }} disabled={acting || editing}>Bearbeiten</Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(true)} disabled={acting}>Loeschen</Button>
          </div>
          {editing && (
            <div className="mt-4 p-3 border rounded space-y-3 bg-muted/30">
              <h3 className="font-medium">Goal bearbeiten</h3>
              <div>
                <label className="text-sm font-medium">Titel</label>
                <input className="w-full border rounded p-2 text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Beschreibung</label>
                <textarea className="w-full border rounded p-2 text-sm" rows={4} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Budget in Cent (leer = unbegrenzt)</label>
                <input type="number" className="w-full border rounded p-2 text-sm" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => {
                  setActing(true)
                  try {
                    const body: Record<string, unknown> = { action: 'update', title: editTitle.trim(), description: editDescription }
                    body.budgetCents = editBudget.trim() === '' ? null : Number(editBudget)
                    const r = await fetch(`/api/agents/goals/${goalId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
                    if (!r.ok) throw new Error(await r.text())
                    toast.success('Goal aktualisiert'); setEditing(false); await load()
                  } catch (e) { toast.error((e as Error).message) } finally { setActing(false) }
                }} disabled={acting || !editTitle.trim()}>Speichern</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={acting}>Abbrechen</Button>
              </div>
            </div>
          )}
          {deleteConfirm && (
            <div className="mt-4 p-3 border-2 border-destructive rounded space-y-2 bg-destructive/5">
              <p className="text-sm font-medium text-destructive">
                Goal "{data.goal.title}" wirklich loeschen? Loescht auch alle Runs/Steps/Cost-Events. Nicht reversibel.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={async () => {
                  setActing(true)
                  try {
                    const r = await fetch(`/api/agents/goals/${goalId}`, { method: 'DELETE' })
                    if (!r.ok) throw new Error(await r.text())
                    toast.success('Goal geloescht'); window.location.href = '/intern/agents/goals'
                  } catch (e) { toast.error((e as Error).message); setActing(false); setDeleteConfirm(false) }
                }} disabled={acting}>Endgueltig loeschen</Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(false)} disabled={acting}>Abbrechen</Button>
              </div>
            </div>
          )}
          {data.latestRunId && (
            <div className="mt-3">
              <Link href={`/intern/agents/runs/${data.latestRunId}`} className="text-primary hover:underline text-sm">
                Run-Details mit DAG anzeigen →
              </Link>
            </div>
          )}
          <div className="mt-3">
            <ManualTriggers goalId={goalId} runId={data.latestRunId ?? undefined} />
          </div>
        </CardContent>
      </Card>

      {data.goal.status === 'awaiting_approval' && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle>Plan-Freigabe erforderlich</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Der Plan wurde erstellt und wartet auf deine Freigabe. Pruefe die Steps unten und entscheide:
            </p>
            <div className="flex gap-2">
              <Button onClick={async () => {
                const r = await fetch(`/api/agents/goals/${data.goal.id}/approve`, { method: 'POST' })
                if (r.ok) { toast.success('Plan freigegeben'); window.location.reload() }
                else toast.error(`Fehler: ${await r.text()}`)
              }}>Plan freigeben</Button>
              <Button variant="destructive" onClick={async () => {
                if (!confirm('Plan wirklich ablehnen? Goal wird abgebrochen.')) return
                const r = await fetch(`/api/agents/goals/${data.goal.id}/reject`, { method: 'POST' })
                if (r.ok) { toast.success('Plan abgelehnt'); window.location.reload() }
                else toast.error(`Fehler: ${await r.text()}`)
              }}>Ablehnen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Steps</CardTitle></CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Noch keine Steps</p>
          ) : (
            <ul className="space-y-2">
              {steps.map((s) => (
                <li key={s.id} className="border rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-xs">{s.stepKey}</code>
                    <Badge variant={STEP_STATUS_COLORS[s.status] ?? 'outline'}>{s.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.workerType}</div>
                  {s.resultSummary && <div className="text-xs mt-1 text-muted-foreground">{s.resultSummary}</div>}
                  {s.error && <div className="text-xs mt-1 text-destructive">{s.error}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
