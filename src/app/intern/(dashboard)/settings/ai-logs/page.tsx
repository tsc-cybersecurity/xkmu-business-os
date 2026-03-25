'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Search, FileText, Clock, Zap, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface AiLog {
  id: string; providerType: string; model: string; prompt: string; response: string | null
  status: string; errorMessage: string | null; promptTokens: number | null
  completionTokens: number | null; totalTokens: number | null; durationMs: number | null
  feature: string | null; entityType: string | null; entityId: string | null; createdAt: string
}

interface LogStats { totalLogs: number; totalTokens: number; avgDuration: number; errorCount: number }

const providerColors: Record<string, string> = { ollama: 'bg-green-500', openrouter: 'bg-purple-500', gemini: 'bg-blue-500', openai: 'bg-gray-700', deepseek: 'bg-teal-500' }
const featureLabels: Record<string, string> = { research: 'Research', completion: 'Chat', summarize: 'Zusammenfassung', extract_entities: 'Entitaeten', company_research: 'Firmen-Research', person_research: 'Personen-Research', lead_research: 'Lead-Research', cms_seo_generate: 'CMS SEO', blog_review: 'Blog Review', blog_seo_generate: 'Blog SEO', social_media: 'Social Media' }

function formatDate(d: string) { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(d)) }
function formatDuration(ms: number | null) { if (!ms) return '-'; return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }

export default function AiLogsPage() {
  const [logs, setLogs] = useState<AiLog[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<AiLog | null>(null)
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [featureFilter, setFeatureFilter] = useState('')

  useEffect(() => { fetchLogs() }, [page, providerFilter, statusFilter, featureFilter])
  useEffect(() => { fetchStats() }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' })
      if (search) params.set('search', search)
      if (providerFilter) params.set('providerType', providerFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (featureFilter) params.set('feature', featureFilter)
      const res = await fetch(`/api/v1/ai-logs?${params}`)
      const data = await res.json()
      if (data.success) { setLogs(data.data); setTotalPages(data.meta?.totalPages || 1); setTotal(data.meta?.total || 0) }
    } catch (e) { logger.error('Fetch logs', e, { module: 'AiLogs' }) }
    finally { setLoading(false) }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/ai-logs/stats')
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch (e) { logger.error('Fetch stats', e, { module: 'AiLogs' }) }
  }

  const fetchDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/ai-logs/${id}`)
      const data = await res.json()
      if (data.success) setSelected(data.data)
    } catch (e) { logger.error('Fetch detail', e, { module: 'AiLogs' }) }
  }

  const handleSearch = () => { setPage(1); fetchLogs() }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/intern/settings"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div><h1 className="text-2xl font-bold">KI-Logging</h1><p className="text-sm text-muted-foreground">{total} Eintraege</p></div>
        </div>
        {/* Stats */}
        {stats && (
          <div className="hidden lg:flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-muted-foreground" />{stats.totalLogs} Anfragen</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-muted-foreground" />{Number(stats.totalTokens).toLocaleString('de-DE')} Tokens</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" />Ø {formatDuration(Math.round(Number(stats.avgDuration)))}</span>
            <span className="flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-red-500" />{stats.errorCount} Fehler</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Links: Filter + Liste */}
        <div className="w-[480px] xl:w-[540px] border-r flex flex-col shrink-0">
          {/* Filter */}
          <div className="p-3 border-b space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-9 h-8 text-sm" /></div>
              <Button variant="outline" size="sm" onClick={handleSearch} className="h-8"><Search className="h-3 w-3" /></Button>
            </div>
            <div className="flex gap-2">
              <Select value={providerFilter || 'all'} onValueChange={v => { setProviderFilter(v === 'all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Anbieter" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Anbieter</SelectItem><SelectItem value="ollama">Ollama</SelectItem><SelectItem value="openrouter">OpenRouter</SelectItem><SelectItem value="gemini">Gemini</SelectItem><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="deepseek">Deepseek</SelectItem></SelectContent></Select>
              <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Alle</SelectItem><SelectItem value="success">Erfolg</SelectItem><SelectItem value="error">Fehler</SelectItem></SelectContent></Select>
              <Select value={featureFilter || 'all'} onValueChange={v => { setFeatureFilter(v === 'all' ? '' : v); setPage(1) }}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Funktion" /></SelectTrigger><SelectContent><SelectItem value="all">Alle</SelectItem><SelectItem value="completion">Chat</SelectItem><SelectItem value="research">Research</SelectItem><SelectItem value="company_research">Firmen</SelectItem><SelectItem value="lead_research">Leads</SelectItem><SelectItem value="cms_seo_generate">CMS SEO</SelectItem><SelectItem value="blog_review">Blog Review</SelectItem><SelectItem value="social_media">Social Media</SelectItem></SelectContent></Select>
            </div>
          </div>

          {/* Log-Liste */}
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : logs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground"><FileText className="h-8 w-8 mb-2" /><p className="text-sm">Keine Log-Eintraege</p></div>
            ) : logs.map(log => (
              <button key={log.id} onClick={() => fetchDetail(log.id)} className={`w-full text-left px-4 py-2.5 border-b hover:bg-muted/50 transition-colors ${selected?.id === log.id ? 'bg-muted' : ''}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <Badge className={`text-[10px] px-1.5 py-0 ${providerColors[log.providerType] || 'bg-gray-500'}`}>{log.providerType}</Badge>
                  <code className="text-[10px] bg-muted px-1 rounded">{log.model}</code>
                  {log.feature && <Badge variant="outline" className="text-[10px] px-1 py-0">{featureLabels[log.feature] || log.feature}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{log.prompt.substring(0, 100)}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  {log.totalTokens && <span>{log.totalTokens.toLocaleString('de-DE')} tok</span>}
                  <span>{formatDuration(log.durationMs)}</span>
                  <span>{formatDate(log.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t text-sm">
              <span className="text-xs text-muted-foreground">Seite {page}/{totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-3 w-3" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-3 w-3" /></Button>
              </div>
            </div>
          )}
        </div>

        {/* Rechts: Detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><FileText className="h-12 w-12 mb-4" /><p>Log-Eintrag auswaehlen</p></div>
          ) : (
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center gap-3">
                <Badge className={selected.status === 'success' ? 'bg-green-500' : 'bg-red-500'}>{selected.status}</Badge>
                <Badge className={providerColors[selected.providerType] || 'bg-gray-500'}>{selected.providerType}</Badge>
                <code className="text-sm bg-muted px-2 rounded">{selected.model}</code>
                {selected.feature && <Badge variant="outline">{featureLabels[selected.feature] || selected.feature}</Badge>}
              </div>

              {/* Meta */}
              <Card><CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground block">Zeitpunkt</span><span>{formatDate(selected.createdAt)}</span></div>
                  <div><span className="text-muted-foreground block">Dauer</span><span>{formatDuration(selected.durationMs)}</span></div>
                  <div><span className="text-muted-foreground block">Tokens</span><span>{selected.promptTokens || 0} + {selected.completionTokens || 0} = {selected.totalTokens || 0}</span></div>
                  {selected.entityType && <div><span className="text-muted-foreground block">Entitaet</span><span>{selected.entityType} ({selected.entityId?.slice(0, 8)}...)</span></div>}
                </div>
              </CardContent></Card>

              {/* Prompt */}
              <div>
                <h3 className="font-semibold mb-2">Prompt</h3>
                <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap max-h-[250px] overflow-y-auto">{selected.prompt}</pre>
              </div>

              {/* Response */}
              {selected.response && (
                <div>
                  <h3 className="font-semibold mb-2">Antwort</h3>
                  <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap max-h-[350px] overflow-y-auto">{selected.response}</pre>
                </div>
              )}

              {/* Error */}
              {selected.errorMessage && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">Fehler</h3>
                  <pre className="bg-red-50 dark:bg-red-950 p-4 rounded-md text-sm text-red-600 whitespace-pre-wrap">{selected.errorMessage}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
