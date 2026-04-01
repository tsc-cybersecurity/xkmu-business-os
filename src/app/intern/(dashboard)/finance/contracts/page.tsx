'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, FileSignature, BookTemplate, Blocks } from 'lucide-react'
import { DocumentStatusBadge, contractStatuses } from '../_components/status-badge'
import { Can } from '@/hooks/use-permissions'
import { Loader2 } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)

  useEffect(() => { setPage(1) }, [search, statusFilter])

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ type: 'contract' })
        if (search) params.set('search', search)
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
        params.set('page', page.toString())

        const res = await fetch(`/api/v1/documents?${params}`)
        const json = await res.json()
        if (json.success) {
          setContracts(json.data?.items || json.data || [])
          setMeta(json.meta || json.data?.meta || null)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
  }, [search, statusFilter, page])

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('de-DE') : '\u2014'
  const formatEur = (v: string | null) => v ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(v)) : '\u2014'

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="h-6 w-6" />
            Vertraege
          </h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} Vertraege` : 'Laden...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/intern/finance/contracts/clauses">
            <Button variant="outline" size="sm">
              <Blocks className="mr-1 h-4 w-4" />
              Bausteine
            </Button>
          </Link>
          <Link href="/intern/finance/contracts/templates">
            <Button variant="outline" size="sm">
              <BookTemplate className="mr-1 h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Can module="documents" action="create">
            <Link href="/intern/finance/contracts/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Neuer Vertrag
              </Button>
            </Link>
          </Can>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {contractStatuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Keine Vertraege gefunden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Laufzeit</TableHead>
                  <TableHead className="text-right">Wert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/intern/finance/contracts/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.number}
                      </Link>
                    </TableCell>
                    <TableCell>{c.company?.name || c.customerName || '\u2014'}</TableCell>
                    <TableCell><DocumentStatusBadge status={c.status} type="contract" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(c.contractStartDate)}
                      {c.contractEndDate ? ` \u2013 ${formatDate(c.contractEndDate)}` : ' \u2013 unbefristet'}
                    </TableCell>
                    <TableCell className="text-right">{formatEur(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Seite {meta.page} von {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Zurueck</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages}>Weiter</Button>
          </div>
        </div>
      )}
    </div>
  )
}
