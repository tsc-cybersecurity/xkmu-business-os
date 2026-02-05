'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Search,
  FileText,
  Clock,
  Zap,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface AiLog {
  id: string
  providerType: string
  model: string
  prompt: string
  response: string | null
  status: string
  errorMessage: string | null
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  durationMs: number | null
  feature: string | null
  entityType: string | null
  entityId: string | null
  createdAt: string
}

interface LogStats {
  totalLogs: number
  totalTokens: number
  avgDuration: number
  errorCount: number
}

const providerColors: Record<string, string> = {
  ollama: 'bg-green-500',
  openrouter: 'bg-purple-500',
  gemini: 'bg-blue-500',
  openai: 'bg-gray-700',
}

const statusColors: Record<string, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
}

const featureLabels: Record<string, string> = {
  research: 'Research',
  completion: 'Completion',
  summarize: 'Zusammenfassung',
  extract_entities: 'Entitäten',
  company_research: 'Firmen-Research',
  person_research: 'Personen-Research',
  lead_research: 'Lead-Research',
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateStr))
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen) + '...'
}

export default function AiLogsPage() {
  const [logs, setLogs] = useState<AiLog[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null)

  // Filter
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [featureFilter, setFeatureFilter] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page, providerFilter, statusFilter, featureFilter])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '30',
      })
      if (search) params.set('search', search)
      if (providerFilter) params.set('providerType', providerFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (featureFilter) params.set('feature', featureFilter)

      const response = await fetch(`/api/v1/ai-logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data)
        setTotalPages(data.meta?.totalPages || 1)
        setTotal(data.meta?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/ai-logs/stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchLogDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/ai-logs/${id}`)
      const data = await response.json()
      if (data.success) {
        setSelectedLog(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch log detail:', error)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchLogs()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">KI-Logging</h1>
          <p className="text-muted-foreground">
            Alle KI-Anfragen und Antworten im Überblick
          </p>
        </div>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Gesamte Anfragen</p>
                  <p className="text-2xl font-bold">{stats.totalLogs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Gesamte Tokens</p>
                  <p className="text-2xl font-bold">{Number(stats.totalTokens).toLocaleString('de-DE')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Ø Antwortzeit</p>
                  <p className="text-2xl font-bold">{formatDuration(Math.round(Number(stats.avgDuration)))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Fehler</p>
                  <p className="text-2xl font-bold text-red-600">{stats.errorCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex gap-2">
                <Input
                  placeholder="Suche in Prompts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Anbieter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Anbieter</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="success">Erfolg</SelectItem>
                <SelectItem value="error">Fehler</SelectItem>
              </SelectContent>
            </Select>
            <Select value={featureFilter} onValueChange={(v) => { setFeatureFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Funktion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Funktionen</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="completion">Completion</SelectItem>
                <SelectItem value="summarize">Zusammenfassung</SelectItem>
                <SelectItem value="company_research">Firmen-Research</SelectItem>
                <SelectItem value="person_research">Personen-Research</SelectItem>
                <SelectItem value="lead_research">Lead-Research</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log-Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Keine Log-Einträge</h3>
            <p className="text-muted-foreground text-sm">
              KI-Anfragen werden hier automatisch protokolliert.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <Card
                key={log.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fetchLogDetail(log.id)}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge className={statusColors[log.status] || 'bg-gray-400'}>
                        {log.status === 'success' ? '✓' : '✗'}
                      </Badge>
                      <Badge className={providerColors[log.providerType] || 'bg-gray-500'} variant="secondary">
                        {log.providerType}
                      </Badge>
                      <code className="text-xs bg-muted px-1 rounded">{log.model}</code>
                      {log.feature && (
                        <Badge variant="outline">
                          {featureLabels[log.feature] || log.feature}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground truncate">
                        {truncate(log.prompt, 80)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground ml-4 shrink-0">
                      {log.totalTokens && (
                        <span>{log.totalTokens.toLocaleString('de-DE')} tok</span>
                      )}
                      <span>{formatDuration(log.durationMs)}</span>
                      <span className="text-xs">{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} Einträge gesamt
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Seite {page} von {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Log-Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Log-Detail
              {selectedLog && (
                <>
                  <Badge className={statusColors[selectedLog.status]}>
                    {selectedLog.status}
                  </Badge>
                  <Badge className={providerColors[selectedLog.providerType]}>
                    {selectedLog.providerType}
                  </Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Meta-Informationen */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Modell:</span>
                  <code className="ml-2 bg-muted px-1 rounded">{selectedLog.model}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">Zeitpunkt:</span>
                  <span className="ml-2">{formatDate(selectedLog.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dauer:</span>
                  <span className="ml-2">{formatDuration(selectedLog.durationMs)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tokens:</span>
                  <span className="ml-2">
                    {selectedLog.promptTokens || 0} + {selectedLog.completionTokens || 0} = {selectedLog.totalTokens || 0}
                  </span>
                </div>
                {selectedLog.feature && (
                  <div>
                    <span className="text-muted-foreground">Funktion:</span>
                    <span className="ml-2">{featureLabels[selectedLog.feature] || selectedLog.feature}</span>
                  </div>
                )}
                {selectedLog.entityType && (
                  <div>
                    <span className="text-muted-foreground">Entität:</span>
                    <span className="ml-2">{selectedLog.entityType} ({selectedLog.entityId?.slice(0, 8)}...)</span>
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div>
                <h4 className="font-semibold mb-2">Prompt</h4>
                <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {selectedLog.prompt}
                </pre>
              </div>

              {/* Response */}
              {selectedLog.response && (
                <div>
                  <h4 className="font-semibold mb-2">Antwort</h4>
                  <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {selectedLog.response}
                  </pre>
                </div>
              )}

              {/* Error */}
              {selectedLog.errorMessage && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Fehler</h4>
                  <pre className="bg-red-50 dark:bg-red-950 p-4 rounded-md text-sm text-red-600 whitespace-pre-wrap">
                    {selectedLog.errorMessage}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
