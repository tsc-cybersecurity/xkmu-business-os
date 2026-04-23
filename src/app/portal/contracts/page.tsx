'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, FileText, ArrowRight } from 'lucide-react'

interface ContractRow {
  id: string
  number: string
  status: string | null
  contractStartDate: string | null
  contractEndDate: string | null
  total: string | null
}

const STATUS_UI: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Aktiv', variant: 'default' },
  draft: { label: 'Entwurf', variant: 'secondary' },
  expired: { label: 'Abgelaufen', variant: 'secondary' },
  cancelled: { label: 'Gekündigt', variant: 'destructive' },
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('de-DE') : '—'
}

function formatMoney(val: string | null): string {
  if (!val) return '—'
  const n = Number(val)
  if (Number.isNaN(n)) return val
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function PortalContractsListPage() {
  const [rows, setRows] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/portal/me/contracts')
      .then(r => r.json())
      .then(d => { if (d?.success) setRows(d.data || []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Verträge
        </h1>
        <p className="text-muted-foreground">Ihre aktiven und vergangenen Verträge</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Es liegen derzeit keine Verträge für Ihre Firma vor.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Laufzeit</TableHead>
                  <TableHead className="text-right">Gesamt</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const sc = (r.status && STATUS_UI[r.status]) ?? null
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.number}</TableCell>
                      <TableCell>
                        {sc ? (
                          <Badge variant={sc.variant}>{sc.label}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{r.status || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(r.contractStartDate)} – {formatDate(r.contractEndDate)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(r.total)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/portal/contracts/${r.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
