'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DebugIssue {
  severity: 'critical' | 'warn' | 'info'
  code: string
  message: string
  recommendation: string
}

interface DebugData {
  run: { id: string; status: string; attempt: number; startedAt: string; finishedAt: string | null; lastError: string | null; livenessCheckedAt: string | null }
  goal: { id: string; title: string; status: string; executionMode: string; spentCents: number; budgetCents: number | null } | null
  steps: Array<{ id: string; stepKey: string; workerType: string; status: string; dependsOnStepKeys: string[]; error: string | null; resultSummary: string | null }>
  tasks: Array<{ id: string; type: string; status: string; error: string | null; result: Record<string, unknown> | null; referenceType: string | null; referenceId: string | null; createdAt: string; scheduledFor: string | null; executedAt: string | null; completedAt: string | null }>
  auditEvents: Array<{ id: string; action: string; entityType: string | null; entityId: string | null; payload: Record<string, unknown> | null; createdAt: string }>
  activeProviders: Array<{ id: string; name: string; providerType: string; model: string | null }>
  registeredTools: { count: number; sample: Array<{ ref: string; description: string }> }
  issues: DebugIssue[]
}

const SEVERITY_STYLE: Record<DebugIssue['severity'], string> = {
  critical: 'border-destructive bg-destructive/10',
  warn: 'border-yellow-500 bg-yellow-50',
  info: 'border-blue-500 bg-blue-50',
}

export function RunDebugPanel({ runId }: { runId: string }) {
  const [data, setData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/agents/runs/${runId}/debug`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json() as DebugData)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [runId])

  if (error) return <Card><CardContent className="text-destructive">Debug-Fehler: {error}</CardContent></Card>
  if (!data) return <Card><CardContent>Lade Debug-Daten ...</CardContent></Card>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Debug-Panel</h2>
        <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
          {loading ? 'Lade ...' : 'Refresh'}
        </Button>
      </div>

      {/* Issues */}
      {data.issues.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Erkannte Probleme ({data.issues.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.issues.map((iss, i) => (
              <div key={i} className={`border rounded p-3 text-sm ${SEVERITY_STYLE[iss.severity]}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={iss.severity === 'critical' ? 'destructive' : 'outline'}>{iss.severity}</Badge>
                  <code className="text-xs">{iss.code}</code>
                </div>
                <div className="font-medium">{iss.message}</div>
                <div className="text-muted-foreground mt-1">→ {iss.recommendation}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.issues.length === 0 && (
        <Card><CardContent className="text-green-700 text-sm">Keine Probleme erkannt.</CardContent></Card>
      )}

      {/* AI-Provider */}
      <Card>
        <CardHeader><CardTitle>Aktive AI-Provider ({data.activeProviders.length})</CardTitle></CardHeader>
        <CardContent>
          {data.activeProviders.length === 0 ? (
            <div className="text-destructive text-sm">Keiner aktiv — Agents koennen keine LLM-Calls machen!</div>
          ) : (
            <ul className="text-sm space-y-1">
              {data.activeProviders.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong> · {p.providerType} · {p.model ?? '(default)'}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Tool-Registry */}
      <Card>
        <CardHeader><CardTitle>Tool-Registry ({data.registeredTools.count} Tools)</CardTitle></CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm">Liste anzeigen ({Math.min(30, data.registeredTools.count)} sample)</summary>
            <ul className="text-xs mt-2 space-y-1">
              {data.registeredTools.sample.map((t) => (
                <li key={t.ref}><code>{t.ref}</code> — <span className="text-muted-foreground">{t.description}</span></li>
              ))}
            </ul>
          </details>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader><CardTitle>Task-Queue ({data.tasks.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left">
                <th className="py-1 pr-2">Type</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Created</th>
                <th className="py-1 pr-2">Result/Error</th>
              </tr></thead>
              <tbody>
                {data.tasks.map((t) => (
                  <tr key={t.id} className="border-b align-top">
                    <td className="py-1 pr-2"><code>{t.type}</code></td>
                    <td className="py-1 pr-2">
                      <Badge variant={t.status === 'failed' ? 'destructive' : t.status === 'completed' ? 'default' : 'secondary'}>{t.status}</Badge>
                    </td>
                    <td className="py-1 pr-2 text-muted-foreground">{new Date(t.createdAt).toLocaleString('de-DE')}</td>
                    <td className="py-1 pr-2 max-w-md truncate">
                      {t.error ? <span className="text-destructive">{t.error}</span> : t.result ? <code className="text-xs">{JSON.stringify(t.result).slice(0, 200)}</code> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit-Events */}
      <Card>
        <CardHeader><CardTitle>Audit-Events ({data.auditEvents.length})</CardTitle></CardHeader>
        <CardContent>
          {data.auditEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Events fuer diesen Run/Goal.</div>
          ) : (
            <ul className="text-xs space-y-1">
              {data.auditEvents.map((a) => (
                <li key={a.id} className="border-b pb-1">
                  <strong>{a.action}</strong>
                  <span className="text-muted-foreground"> · {new Date(a.createdAt).toLocaleString('de-DE')}</span>
                  {a.payload && <div className="text-muted-foreground"><code>{JSON.stringify(a.payload).slice(0, 300)}</code></div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
