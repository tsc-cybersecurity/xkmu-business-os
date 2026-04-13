'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, History, CheckCircle2, XCircle, AlertTriangle, ChevronDown } from 'lucide-react'

interface ExecutionLogPanelProps {
  entityType: 'sop' | 'deliverable'
  entityId: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  completed: { label: 'Abgeschlossen', icon: CheckCircle2, color: 'text-green-600' },
  aborted:   { label: 'Abgebrochen',   icon: XCircle,      color: 'text-red-500'   },
  escalated: { label: 'Eskaliert',     icon: AlertTriangle, color: 'text-orange-500' },
}

const EXECUTOR_LABELS: Record<string, string> = {
  agent: 'Agent', human: 'Mensch'
}

export function ExecutionLogPanel({ entityType, entityId }: ExecutionLogPanelProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({
      entity_type: entityType,
      entity_id: entityId,
      page: String(p),
      limit: String(PAGE_SIZE),
    })
    const res = await fetch(`/api/v1/execution-logs?${params}`)
    const d = await res.json()
    if (d.success) {
      setLogs(prev => p === 1 ? d.data : [...prev, ...d.data])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { load(1) }, [load])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(next)
  }

  const hasMore = logs.length < total

  if (loading && logs.length === 0) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          Ausfuehrungshistorie
          <Badge variant="outline">{total}</Badge>
        </h3>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Noch keine Ausfuehrungen protokolliert
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map(log => {
              const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.completed
              const StatusIcon = statusCfg.icon
              const startedAt = new Date(log.started_at)
              return (
                <Card key={log.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon className={`h-4 w-4 shrink-0 ${statusCfg.color}`} />
                        <div>
                          <p className="text-sm font-medium">{statusCfg.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {startedAt.toLocaleDateString('de-DE')}
                            {' '}
                            {startedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge variant="outline" className="text-xs">
                          {EXECUTOR_LABELS[log.executed_by] || log.executed_by}
                        </Badge>
                        {log.duration_minutes != null && (
                          <Badge variant="secondary" className="text-xs">
                            {log.duration_minutes} Min.
                          </Badge>
                        )}
                        {log.quality_score != null && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${log.quality_score >= 80 ? 'text-green-600' : log.quality_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}
                          >
                            Q: {log.quality_score}%
                          </Badge>
                        )}
                        {log.cost_estimate_usd != null && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            ${log.cost_estimate_usd.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {log.abort_reason && (
                      <p className="text-xs text-muted-foreground mt-2 pl-6">
                        Grund: {log.abort_reason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={loading}
              className="w-full"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><ChevronDown className="h-4 w-4 mr-1" />Mehr laden ({total - logs.length} weitere)</>
              }
            </Button>
          )}
        </>
      )}
    </div>
  )
}
