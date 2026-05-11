'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search, PanelLeftClose, PanelLeft, Code2, Download, Copy, Check, ServerCog,
  Sparkles, Loader2, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MERGED_SERVICES } from '@/lib/api-docs/merge'
import type { ApiEndpoint, ApiService, HttpMethod } from '@/lib/api-docs/types'
import { buildCurlExample, buildFetchExample, buildPythonExample } from '@/lib/api-docs/code-examples'
import { USAGE_GUIDE, type CodeLang } from '@/lib/api-docs/usage-guide'
import { toast } from 'sonner'

const apiServices = MERGED_SERVICES

// ============================================
// Constants
// ============================================
const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-green-600 hover:bg-green-600',
  POST: 'bg-blue-600 hover:bg-blue-600',
  PUT: 'bg-orange-500 hover:bg-orange-500',
  PATCH: 'bg-purple-600 hover:bg-purple-600',
  DELETE: 'bg-red-600 hover:bg-red-600',
}

const AUTH_LABEL: Record<string, string> = {
  public: 'Öffentlich',
  session: 'Session',
  'api-key': 'API-Key',
}
const AUTH_COLOR: Record<string, string> = {
  public: 'bg-green-100 text-green-700',
  session: 'bg-blue-100 text-blue-700',
  'api-key': 'bg-amber-100 text-amber-700',
}

const CATEGORY_MAP: Record<string, string> = {
  auth: 'Auth & Users', users: 'Auth & Users', roles: 'Auth & Users', 'api-keys': 'Auth & Users', admin: 'Auth & Users',
  companies: 'CRM', persons: 'CRM', leads: 'CRM', opportunities: 'CRM', activities: 'CRM',
  documents: 'Finanzen & Vertrag', 'contract-templates': 'Finanzen & Vertrag', 'contract-clauses': 'Finanzen & Vertrag',
  products: 'Katalog & Zeit', 'time-entries': 'Katalog & Zeit', receipts: 'Katalog & Zeit', projects: 'Katalog & Zeit',
  processes: 'Management', ideas: 'Management', cockpit: 'Management',
  'din-audit': 'Compliance', wiba: 'Compliance', grundschutz: 'Compliance', 'ir-playbook': 'Compliance',
  blog: 'Content & Marketing', cms: 'Content & Marketing', marketing: 'Content & Marketing',
  'social-media': 'Content & Marketing', newsletter: 'Content & Marketing',
  n8n: 'AI & Automation', ai: 'AI & Automation', chat: 'AI & Automation',
  images: 'Media', media: 'Media',
  webhooks: 'Integrationen',
}

const categoryOf = (svc: ApiService): string => CATEGORY_MAP[svc.slug] ?? 'Sonstige'

interface ClientAnnotation {
  summary: string
  description: string | null
  requestBody: unknown
  responseExample: unknown
  curlExample: string
  source: string
  model: string | null
}

const annotationKey = (method: string, path: string) => `${method} ${path}`

const isPlaceholder = (e: ApiEndpoint): boolean =>
  e.summary === `${e.method} ${e.path}` && !e.curl

// ============================================
// Copy-Button
// ============================================
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const onClick = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClick}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-md bg-muted p-3">
      <div className="absolute right-2 top-2"><CopyButton text={code} /></div>
      <pre className="overflow-x-auto pr-8 text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  )
}

// ============================================
// Usage Guide
// ============================================
const LANG_ORDER: CodeLang[] = ['curl', 'fetch', 'python']

function UsageGuide() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">how-to-use-the-api</div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />API-Einführung
        </h1>
        <p className="text-sm text-muted-foreground">
          Komplett-Anleitung mit Auth-Flow, Response-Format, Pagination, Fehlerbehandlung
          und End-to-End-Skripten. Lies das einmal — danach kennst du die Spielregeln aller
          {' '}{apiServices.length} Services.
        </p>
      </div>
      {USAGE_GUIDE.map((section) => (
        <Card key={section.id}>
          <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {section.intro.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap">{para}</p>
            ))}
            {section.staticBlocks?.map((block, i) => (
              <div key={i}>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{block.label}</h4>
                <CodeBlock code={block.code} />
              </div>
            ))}
            {section.table && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {section.table.columns.map((c) => (
                        <th key={c} className="px-3 py-2 text-left font-medium text-xs">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, ri) => (
                      <tr key={ri} className="border-b last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-xs">
                            {ci === 1 ? <code className="font-mono">{cell}</code> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section.examples && section.examples.length > 0 && (
              <Tabs defaultValue={section.examples[0].lang}>
                <TabsList className="h-8">
                  {LANG_ORDER.filter((l) => section.examples!.some((ex) => ex.lang === l)).map((l) => {
                    const ex = section.examples!.find((e) => e.lang === l)!
                    return <TabsTrigger key={l} value={l} className="text-xs">{ex.label}</TabsTrigger>
                  })}
                </TabsList>
                {section.examples.map((ex) => (
                  <TabsContent key={ex.lang} value={ex.lang} className="mt-2">
                    <CodeBlock code={ex.code} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============================================
// Endpoint Card
// ============================================
function EndpointCard({
  endpoint, baseUrl, annotation, isGenerating, onGenerate,
}: {
  endpoint: ApiEndpoint
  baseUrl: string
  annotation: ClientAnnotation | undefined
  isGenerating: boolean
  onGenerate: () => void
}) {
  const effective: ApiEndpoint = useMemo(() => {
    if (!annotation) return endpoint
    return {
      ...endpoint,
      summary: annotation.summary,
      description: annotation.description ?? endpoint.description,
      requestBody: (annotation.requestBody as Record<string, unknown>) ?? endpoint.requestBody,
      response: (annotation.responseExample as Record<string, unknown>) ?? endpoint.response,
      curl: annotation.curlExample || endpoint.curl,
    }
  }, [endpoint, annotation])

  const placeholder = isPlaceholder(effective)
  const aiAnnotated = !!annotation && annotation.source === 'ai_generated'

  const examples = useMemo(() => ({
    curl: buildCurlExample(effective, baseUrl),
    fetch: buildFetchExample(effective, baseUrl),
    python: buildPythonExample(effective, baseUrl),
  }), [effective, baseUrl])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${methodColors[effective.method]} text-white font-mono text-xs`}>
            {effective.method}
          </Badge>
          <code className="text-sm font-semibold">{effective.path}</code>
          {aiAnnotated && (
            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />KI-doku
            </Badge>
          )}
          <div className="ml-auto">
            <Button
              variant="ghost" size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
              className="text-xs h-7"
              title={annotation ? 'Neu generieren' : 'Auto-doku generieren'}
            >
              {isGenerating ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generiere...</>
              ) : (
                <><Sparkles className="h-3 w-3 mr-1" />{annotation || !placeholder ? 'Neu generieren' : 'Generieren'}</>
              )}
            </Button>
          </div>
        </div>
        <CardTitle className="text-base">{effective.summary}</CardTitle>
        {effective.description && <CardDescription>{effective.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {effective.params && effective.params.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parameters</h4>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">In</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Required</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {effective.params.map((p) => (
                    <tr key={`${p.name}-${p.in}`} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                      <td className="px-3 py-2 text-xs">{p.in}</td>
                      <td className="px-3 py-2 text-xs">{p.type}</td>
                      <td className="px-3 py-2 text-xs">
                        {p.required ? <Badge variant="destructive" className="text-[10px]">Required</Badge> : <span className="text-muted-foreground">Optional</span>}
                      </td>
                      <td className="px-3 py-2 text-xs">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {effective.requestBody && (
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request Body</h4>
            <CodeBlock code={JSON.stringify(effective.requestBody, null, 2)} />
          </div>
        )}

        {effective.response && (
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response Example</h4>
            <CodeBlock code={JSON.stringify(effective.response, null, 2)} />
          </div>
        )}

        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Codebeispiele</h4>
          <Tabs defaultValue="curl">
            <TabsList className="h-8">
              <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
              <TabsTrigger value="fetch" className="text-xs">fetch (JS)</TabsTrigger>
              <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
            </TabsList>
            {(['curl', 'fetch', 'python'] as const).map((lang) => (
              <TabsContent key={lang} value={lang} className="mt-2">
                <CodeBlock code={examples[lang]} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Service Detail
// ============================================
function ServiceDetail({
  service, baseUrl, annotations, generating, onGenerate, onBulkGenerate, bulkProgress,
}: {
  service: ApiService
  baseUrl: string
  annotations: Map<string, ClientAnnotation>
  generating: Set<string>
  onGenerate: (method: string, path: string) => Promise<boolean>
  onBulkGenerate: (service: ApiService) => Promise<void>
  bulkProgress: { current: number; total: number } | null
}) {
  const unannotatedCount = service.endpoints.filter((e) =>
    isPlaceholder(e) && !annotations.has(annotationKey(e.method, e.path)),
  ).length
  const bulkRunning = bulkProgress !== null

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">{service.slug}</div>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold flex-1">{service.name}</h1>
          {unannotatedCount > 0 && (
            <Button
              onClick={() => onBulkGenerate(service)}
              disabled={bulkRunning}
              size="sm"
              variant="secondary"
            >
              {bulkRunning ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{bulkProgress!.current}/{bulkProgress!.total}</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{unannotatedCount} fehlende auto-doku</>
              )}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{service.description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">Base: <code className="ml-1">{service.basePath}</code></Badge>
          <Badge className={cn('text-xs', AUTH_COLOR[service.auth])}>{AUTH_LABEL[service.auth]}</Badge>
          <Badge variant="outline" className="text-xs">{service.endpoints.length} Endpoints</Badge>
        </div>
      </div>

      <div className="space-y-4">
        {service.endpoints.map((ep, i) => {
          const key = annotationKey(ep.method, ep.path)
          return (
            <EndpointCard
              key={`${ep.method}-${ep.path}-${i}`}
              endpoint={ep}
              baseUrl={baseUrl}
              annotation={annotations.get(key)}
              isGenerating={generating.has(key)}
              onGenerate={() => onGenerate(ep.method, ep.path)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// Main Page
// ============================================
type ViewMode = { kind: 'guide' } | { kind: 'service'; slug: string }

export default function ApiCatalogPage() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>({ kind: 'guide' })
  const [showSidebar, setShowSidebar] = useState(true)
  const [annotations, setAnnotations] = useState<Map<string, ClientAnnotation>>(new Map())
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null)

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://www.xkmu.de'
    return `${window.location.protocol}//${window.location.host}`
  }, [])

  useEffect(() => {
    fetch('/api/v1/api-docs/annotations')
      .then((r) => r.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) {
          const m = new Map<string, ClientAnnotation>()
          for (const row of payload.data) {
            m.set(annotationKey(row.method, row.path), {
              summary: row.summary,
              description: row.description ?? null,
              requestBody: row.requestBody ?? null,
              responseExample: row.responseExample ?? null,
              curlExample: row.curlExample ?? '',
              source: row.source ?? 'ai_generated',
              model: row.model ?? null,
            })
          }
          setAnnotations(m)
        }
      })
      .catch(() => { /* non-fatal */ })
  }, [])

  const generateOne = async (method: string, path: string): Promise<boolean> => {
    const key = annotationKey(method, path)
    setGenerating((prev) => new Set(prev).add(key))
    try {
      const res = await fetch('/api/v1/api-docs/annotations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, path }),
      })
      const payload = await res.json()
      if (payload.success) {
        setAnnotations((prev) => {
          const m = new Map(prev)
          m.set(key, {
            summary: payload.data.summary,
            description: payload.data.description ?? null,
            requestBody: payload.data.requestBody ?? null,
            responseExample: payload.data.responseExample ?? null,
            curlExample: payload.data.curlExample ?? '',
            source: payload.data.source ?? 'ai_generated',
            model: payload.data.model ?? null,
          })
          return m
        })
        return true
      }
      toast.error(payload.error?.message || 'Generierung fehlgeschlagen')
      return false
    } catch {
      toast.error('Netzwerk-Fehler bei der Generierung')
      return false
    } finally {
      setGenerating((prev) => {
        const m = new Set(prev)
        m.delete(key)
        return m
      })
    }
  }

  const bulkGenerateService = async (service: ApiService) => {
    const todo = service.endpoints.filter((e) => {
      const key = annotationKey(e.method, e.path)
      return isPlaceholder(e) && !annotations.has(key)
    })
    if (todo.length === 0) {
      toast.info('Keine fehlenden Annotationen in diesem Service')
      return
    }
    setBulkProgress({ current: 0, total: todo.length })
    let ok = 0
    for (let i = 0; i < todo.length; i++) {
      setBulkProgress({ current: i, total: todo.length })
      const success = await generateOne(todo[i].method, todo[i].path)
      if (success) ok++
    }
    setBulkProgress(null)
    toast.success(`${ok}/${todo.length} Endpoints dokumentiert`)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return apiServices
    return apiServices.filter((s) => {
      if (s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.slug.includes(q)) return true
      return s.endpoints.some((e) =>
        e.method.toLowerCase().includes(q)
        || e.path.toLowerCase().includes(q)
        || e.summary.toLowerCase().includes(q)
        || (e.description?.toLowerCase().includes(q) ?? false),
      )
    })
  }, [search])

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, ApiService[]>>((acc, s) => {
      const cat = categoryOf(s)
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(s)
      return acc
    }, {})
  }, [filtered])

  const totalEndpoints = useMemo(() => apiServices.reduce((sum, s) => sum + s.endpoints.length, 0), [])
  const unannotatedTotal = useMemo(() => apiServices.reduce((sum, s) =>
    sum + s.endpoints.filter((e) => isPlaceholder(e) && !annotations.has(annotationKey(e.method, e.path))).length,
  0), [annotations])

  const selected = view.kind === 'service'
    ? (apiServices.find((s) => s.slug === view.slug) ?? null)
    : null

  const exportHtml = () => {
    const url = `/api/v1/api-docs/export?baseUrl=${encodeURIComponent(baseUrl)}`
    window.open(url, '_blank')
    toast.success('HTML-Doku wird generiert und heruntergeladen')
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-r flex flex-col shrink-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold flex items-center gap-2">
                <Code2 className="h-4 w-4" />API-Katalog
              </h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSidebar(false)}>
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {apiServices.length} Services · {totalEndpoints} Endpoints
              {unannotatedTotal > 0 && <> · <span className="text-amber-600">{unannotatedTotal} ohne KI-doku</span></>}
            </p>
          </div>

          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <button
              onClick={() => setView({ kind: 'guide' })}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs hover:bg-accent transition-colors border-b border-border/40 font-medium',
                view.kind === 'guide' && 'bg-accent',
              )}
            >
              <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate flex-1">Einführung — How to use the API</span>
            </button>
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
              <div key={cat}>
                <div className="px-4 py-1.5 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0">
                  {cat} ({items.length})
                </div>
                {items.map((s) => {
                  const isSelected = view.kind === 'service' && view.slug === s.slug
                  const missing = s.endpoints.filter((e) =>
                    isPlaceholder(e) && !annotations.has(annotationKey(e.method, e.path)),
                  ).length
                  return (
                    <button
                      key={s.slug}
                      onClick={() => setView({ kind: 'service', slug: s.slug })}
                      className={cn(
                        'w-full flex items-center gap-2 px-4 py-2 text-left text-xs hover:bg-accent transition-colors border-b border-border/40',
                        isSelected && 'bg-accent font-medium',
                      )}
                    >
                      <span className="truncate flex-1">{s.name}</span>
                      {missing > 0 && (
                        <span className="shrink-0 text-[10px] text-amber-600" title={`${missing} ohne KI-doku`}>
                          {missing}!
                        </span>
                      )}
                      <span className="shrink-0 text-[10px] text-muted-foreground">{s.endpoints.length}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">Keine Treffer</div>
            )}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b bg-muted/30 px-6 py-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                  <PanelLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <ServerCog className="h-4 w-4 text-primary" />
                <span className="font-semibold">API-Katalog</span>
                {view.kind === 'guide' && <span className="text-sm text-muted-foreground hidden md:inline">— Einführung</span>}
                {selected && <span className="text-sm text-muted-foreground hidden md:inline">— {selected.name}</span>}
              </div>
            </div>
            <Button onClick={exportHtml} size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />HTML-Doku exportieren
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {view.kind === 'guide' ? (
            <UsageGuide />
          ) : selected ? (
            <ServiceDetail
              service={selected}
              baseUrl={baseUrl}
              annotations={annotations}
              generating={generating}
              onGenerate={generateOne}
              onBulkGenerate={bulkGenerateService}
              bulkProgress={bulkProgress}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Code2 className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">Service aus der Seitenleiste auswählen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
