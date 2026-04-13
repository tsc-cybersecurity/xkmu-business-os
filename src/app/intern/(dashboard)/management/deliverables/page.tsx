'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Package } from 'lucide-react'
import { FRAMEWORK_CATEGORIES, getCategoryLabel } from '@/lib/constants/framework'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DeliverablesPage() {
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Einmalig Module laden fuer den Filter-Dropdown
  useEffect(() => {
    fetch('/api/v1/deliverables/modules')
      .then(r => r.json())
      .then(d => { if (d.success) setModules(d.data) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (moduleFilter !== 'all') params.set('module', moduleFilter)
    if (categoryFilter !== 'all') params.set('category', categoryFilter)
    const res = await fetch(`/api/v1/deliverables?${params}`)
    const d = await res.json()
    if (d.success) setDeliverables(d.data)
    setLoading(false)
  }, [moduleFilter, categoryFilter])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/intern/management">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />Deliverables
            </h1>
            <p className="text-muted-foreground mt-1">
              {deliverables.length} Deliverables in {modules.length} Modulen
            </p>
          </div>
        </div>
      </div>

      {/* Filter-Leiste */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Modul-Filter */}
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Alle Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Module ({modules.reduce((s, m) => s + (m.deliverableCount ?? 0), 0)})</SelectItem>
            {modules.map(m => (
              <SelectItem key={m.code} value={m.code}>
                {m.code} — {m.name} ({m.deliverableCount ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Kategorie-Filter aus framework.ts */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Alle Kategorien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {FRAMEWORK_CATEGORIES.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deliverable-Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : deliverables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Deliverables gefunden
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deliverables.map(d => (
            <Link key={d.id} href={`/intern/management/deliverables/${d.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    {/* Modul-Code-Badge (z.B. "A1") */}
                    <Badge variant="outline" className="text-xs font-mono">
                      {d.module?.code}
                    </Badge>
                    {/* Kategorie-Badge */}
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryLabel(d.category_code) || d.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2 leading-snug">{d.name}</CardTitle>
                  {d.description && (
                    <CardDescription className="line-clamp-2 text-xs">{d.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {d.format && <span className="truncate">{d.format}</span>}
                    <span className="shrink-0">v{d.version}</span>
                  </div>
                  {d.trigger && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      Trigger: {d.trigger}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
