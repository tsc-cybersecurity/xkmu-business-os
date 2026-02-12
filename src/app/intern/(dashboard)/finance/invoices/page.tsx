'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, FileText } from 'lucide-react'
import { DocumentStatusBadge, invoiceStatuses } from '../_components/status-badge'

interface DocumentListItem {
  id: string
  type: string
  number: string
  status: string
  issueDate: string | null
  dueDate: string | null
  total: string
  customerName: string | null
  company: { id: string; name: string } | null
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

function formatCurrency(value: string | null): string {
  if (!value) return '0,00 €'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(parseFloat(value))
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('de-DE').format(new Date(dateStr))
}

export default function InvoicesPage() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setPage(1) }, [search, statusFilter])
  useEffect(() => { fetchDocuments() }, [search, statusFilter, page])

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams()
      params.set('type', 'invoice')
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      params.set('page', page.toString())

      const response = await fetch(`/api/v1/documents?${params}`)
      const data = await response.json()

      if (data.success) {
        setDocuments(data.data)
        setMeta(data.meta)
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rechnungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Rechnungen</p>
        </div>
        <Button asChild>
          <Link href="/intern/finance/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            Neue Rechnung
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Nummer oder Firma..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Alle Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                {invoiceStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Laden...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Rechnungen</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Erstellen Sie Ihre erste Rechnung, um loszulegen.
              </p>
              <Button asChild className="mt-4">
                <Link href="/intern/finance/invoices/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Erste Rechnung erstellen
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nummer</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Fällig am</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Link
                          href={`/intern/finance/invoices/${doc.id}`}
                          className="font-medium hover:underline"
                        >
                          {doc.number}
                        </Link>
                      </TableCell>
                      <TableCell>{doc.company?.name || doc.customerName || '-'}</TableCell>
                      <TableCell>{formatDate(doc.issueDate)}</TableCell>
                      <TableCell>{formatDate(doc.dueDate)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(doc.total)}</TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={doc.status || 'draft'} type="invoice" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">{meta.total} Rechnungen gesamt</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Zurück
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      Seite {meta.page} von {meta.totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                      Weiter
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
