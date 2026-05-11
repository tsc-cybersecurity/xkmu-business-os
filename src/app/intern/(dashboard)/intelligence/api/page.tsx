'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search, PanelLeftClose, PanelLeft, Code2, Download, Copy, Check, ServerCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MERGED_SERVICES } from '@/lib/api-docs/merge'
import type { ApiEndpoint, ApiService, HttpMethod } from '@/lib/api-docs/types'
import { buildCurlExample, buildFetchExample, buildPythonExample } from '@/lib/api-docs/code-examples'
import { USAGE_GUIDE, type CodeLang } from '@/lib/api-docs/usage-guide'
import { BookOpen } from 'lucide-react'
import { toast } from 'sonner'

const apiServices = MERGED_SERVICES

// ============================================
// Usage Guide Renderer
// ============================================
const LANG_ORDER: CodeLang[] = ['curl', 'fetch', 'python']

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-md bg-muted p-3">
      <div className="absolute right-2 top-2"><CopyButton text={code} /></div>
      <pre className="overflow-x-auto pr-8 text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  )
}

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
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
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

// ============================================
// Service Kategorisierung — abgeleitet aus Slug
// ============================================
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

function categoryOf(svc: ApiService): string {
  return CATEGORY_MAP[svc.slug] ?? 'Sonstige'
}

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

// ============================================
// Endpoint Card
// ============================================
function EndpointCard({ endpoint, baseUrl }: { endpoint: ApiEndpoint; baseUrl: string }) {
  const examples = useMemo(() => ({
    curl: buildCurlExample(endpoint, baseUrl),
    fetch: buildFetchExample(endpoint, baseUrl),
    python: buildPythonExample(endpoint, baseUrl),
  }), [endpoint, baseUrl])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${methodColors[endpoint.method]} text-white font-mono text-xs`}>
            {endpoint.method}
          </Badge>
          <code className="text-sm font-semibold">{endpoint.path}</code>
        </div>
        <CardTitle className="text-base">{endpoint.summary}</CardTitle>
        {endpoint.description && <CardDescription>{endpoint.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {endpoint.params && endpoint.params.length > 0 && (
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
                  {endpoint.params.map((p) => (
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

        {endpoint.requestBody && (
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request Body</h4>
            <div className="relative rounded-md bg-muted p-3">
              <div className="absolute right-2 top-2"><CopyButton text={JSON.stringify(endpoint.requestBody, null, 2)} /></div>
              <pre className="overflow-x-auto pr-8 text-xs leading-relaxed"><code>{JSON.stringify(endpoint.requestBody, null, 2)}</code></pre>
            </div>
          </div>
        )}

        {endpoint.response && (
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response Example</h4>
            <div className="relative rounded-md bg-muted p-3">
              <div className="absolute right-2 top-2"><CopyButton text={JSON.stringify(endpoint.response, null, 2)} /></div>
              <pre className="overflow-x-auto pr-8 text-xs leading-relaxed"><code>{JSON.stringify(endpoint.response, null, 2)}</code></pre>
            </div>
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
                <div className="relative rounded-md bg-muted p-3">
                  <div className="absolute right-2 top-2"><CopyButton text={examples[lang]} /></div>
                  <pre className="overflow-x-auto pr-8 text-xs leading-relaxed"><code>{examples[lang]}</code></pre>
                </div>
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
function ServiceDetail({ service, baseUrl }: { service: ApiService; baseUrl: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          {service.slug}
        </div>
        <h1 className="text-2xl font-bold">{service.name}</h1>
        <p className="text-sm text-muted-foreground">{service.description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">Base: <code className="ml-1">{service.basePath}</code></Badge>
          <Badge className={cn('text-xs', AUTH_COLOR[service.auth])}>{AUTH_LABEL[service.auth]}</Badge>
          <Badge variant="outline" className="text-xs">{service.endpoints.length} Endpoints</Badge>
        </div>
      </div>

      <div className="space-y-4">
        {service.endpoints.map((ep, i) => (
          <EndpointCard key={`${ep.method}-${ep.path}-${i}`} endpoint={ep} baseUrl={baseUrl} />
        ))}
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

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://www.xkmu.de'
    return `${window.location.protocol}//${window.location.host}`
  }, [])

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
            <ServiceDetail service={selected} baseUrl={baseUrl} />
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
