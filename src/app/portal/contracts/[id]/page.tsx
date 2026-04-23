'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, ArrowLeft, FileText } from 'lucide-react'

interface ContractItem {
  id: string
  position: number | null
  name: string
  description: string | null
  quantity: string | null
  unit: string | null
  unitPrice: string | null
  vatRate: string | null
  lineTotal: string | null
}

interface ContractDetail {
  id: string
  number: string
  status: string | null
  contractStartDate: string | null
  contractEndDate: string | null
  contractRenewalType: string | null
  contractRenewalPeriod: string | null
  contractNoticePeriodDays: number | null
  subtotal: string | null
  taxTotal: string | null
  total: string | null
  notes: string | null
  paymentTerms: string | null
  contractBodyHtml: string | null
  items: ContractItem[]
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

export default function PortalContractDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/v1/portal/me/contracts/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.success) setData(d.data)
        else setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (notFound || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">Vertrag nicht gefunden.</p>
          <Button variant="outline" asChild>
            <Link href="/portal/contracts"><ArrowLeft className="h-4 w-4 mr-2" />Zur Liste</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const sc = (data.status && STATUS_UI[data.status]) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/contracts"><ArrowLeft className="h-4 w-4 mr-2" />Zurück</Link>
        </Button>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Vertrag {data.number}
        </h1>
        {sc && <Badge variant={sc.variant}>{sc.label}</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Eckdaten</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Laufzeit</dt><dd>{formatDate(data.contractStartDate)} – {formatDate(data.contractEndDate)}</dd></div>
            <div><dt className="text-muted-foreground">Verlängerung</dt><dd>{data.contractRenewalType || '—'} {data.contractRenewalPeriod ? `(${data.contractRenewalPeriod})` : ''}</dd></div>
            <div><dt className="text-muted-foreground">Kündigungsfrist</dt><dd>{data.contractNoticePeriodDays ? `${data.contractNoticePeriodDays} Tage` : '—'}</dd></div>
            <div><dt className="text-muted-foreground">Zahlungsbedingungen</dt><dd>{data.paymentTerms || '—'}</dd></div>
            <div><dt className="text-muted-foreground">Netto</dt><dd>{formatMoney(data.subtotal)}</dd></div>
            <div><dt className="text-muted-foreground">MwSt.</dt><dd>{formatMoney(data.taxTotal)}</dd></div>
            <div className="md:col-span-2"><dt className="text-muted-foreground">Gesamt</dt><dd className="text-lg font-semibold">{formatMoney(data.total)}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {data.items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Positionen</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead className="text-right">Menge</TableHead>
                  <TableHead className="text-right">Einzelpreis</TableHead>
                  <TableHead className="text-right">MwSt%</TableHead>
                  <TableHead className="text-right">Summe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">{it.name}</div>
                      {it.description && <div className="text-xs text-muted-foreground mt-0.5">{it.description}</div>}
                    </TableCell>
                    <TableCell className="text-right">{it.quantity ?? '—'} {it.unit || ''}</TableCell>
                    <TableCell className="text-right">{formatMoney(it.unitPrice)}</TableCell>
                    <TableCell className="text-right">{it.vatRate ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(it.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data.contractBodyHtml && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vertragstext</CardTitle></CardHeader>
          <CardContent>
            {/* HTML is server-side sanitized via sanitizeHtml (isomorphic-dompurify)
                in src/app/api/v1/portal/me/contracts/[id]/route.ts. See P3-1 / sanitize.ts. */}
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: data.contractBodyHtml }}
            />
          </CardContent>
        </Card>
      )}

      {data.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Anmerkungen</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{data.notes}</CardContent>
        </Card>
      )}
    </div>
  )
}
