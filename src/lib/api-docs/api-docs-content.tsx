'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Search, Copy, Check, ChevronDown } from 'lucide-react'
import { apiServices } from '@/lib/api-docs/registry'
import type { ApiEndpoint, HttpMethod } from '@/lib/api-docs/types'

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-green-600 hover:bg-green-600',
  POST: 'bg-blue-600 hover:bg-blue-600',
  PUT: 'bg-orange-500 hover:bg-orange-500',
  DELETE: 'bg-red-600 hover:bg-red-600',
  PATCH: 'bg-purple-600 hover:bg-purple-600',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-0 text-xs font-medium text-muted-foreground">
          <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]_&]:rotate-180" />
          {title}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="relative mt-1.5 rounded-md bg-muted p-3">
          <div className="absolute right-2 top-2">
            <CopyButton text={code} />
          </div>
          <pre className="overflow-x-auto text-xs leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
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
        {endpoint.description && (
          <CardDescription>{endpoint.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {endpoint.params && endpoint.params.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium">Parameters</h4>
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
                  {endpoint.params.map((param) => (
                    <tr key={`${param.name}-${param.in}`} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{param.name}</td>
                      <td className="px-3 py-2 text-xs">{param.in}</td>
                      <td className="px-3 py-2 text-xs">{param.type}</td>
                      <td className="px-3 py-2 text-xs">
                        {param.required ? (
                          <Badge variant="destructive" className="text-[10px]">Required</Badge>
                        ) : (
                          <span className="text-muted-foreground">Optional</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{param.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {endpoint.requestBody && (
          <CodeBlock
            title="Request Body"
            code={JSON.stringify(endpoint.requestBody, null, 2)}
          />
        )}

        {endpoint.response && (
          <CodeBlock
            title="Response Example"
            code={JSON.stringify(endpoint.response, null, 2)}
          />
        )}

        <div>
          <h4 className="mb-1.5 text-sm font-medium">cURL</h4>
          <div className="relative rounded-md bg-muted p-3">
            <div className="absolute right-2 top-2">
              <CopyButton text={endpoint.curl} />
            </div>
            <pre className="overflow-x-auto pr-8 text-xs leading-relaxed">
              <code>{endpoint.curl}</code>
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ApiDocsContent() {
  const [search, setSearch] = useState('')

  const filteredServices = useMemo(() => {
    if (!search.trim()) return apiServices

    const q = search.toLowerCase()
    return apiServices
      .map((service) => {
        const serviceMatches =
          service.name.toLowerCase().includes(q) ||
          service.description.toLowerCase().includes(q)

        const matchedEndpoints = service.endpoints.filter(
          (ep) =>
            ep.method.toLowerCase().includes(q) ||
            ep.path.toLowerCase().includes(q) ||
            ep.summary.toLowerCase().includes(q) ||
            (ep.description && ep.description.toLowerCase().includes(q))
        )

        if (serviceMatches) return service
        if (matchedEndpoints.length > 0) {
          return { ...service, endpoints: matchedEndpoints }
        }
        return null
      })
      .filter(Boolean) as typeof apiServices
  }, [search])

  const activeTab = filteredServices.length > 0 ? filteredServices[0].slug : apiServices[0].slug

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search endpoints, paths, methods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue={activeTab} key={activeTab}>
        <TabsList variant="line" className="!flex !h-auto !w-full !flex-wrap !justify-start gap-1 bg-transparent p-0">
          {filteredServices.map((service) => (
            <TabsTrigger
              key={service.slug}
              value={service.slug}
              className="!flex-none shrink-0 rounded-md border px-2.5 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {service.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {filteredServices.map((service) => (
          <TabsContent key={service.slug} value={service.slug} className="mt-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold">{service.name}</h2>
              <p className="text-sm text-muted-foreground">{service.description}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Base: <code>{service.basePath}</code></span>
                <Badge variant="outline" className="text-[10px]">{service.auth}</Badge>
              </div>
            </div>

            {service.endpoints.map((endpoint, idx) => (
              <EndpointCard key={`${endpoint.method}-${endpoint.path}-${idx}`} endpoint={endpoint} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
