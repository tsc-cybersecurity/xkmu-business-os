'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/shared'
import { DocumentStatusBadge } from '../../_components/status-badge'
import { toast } from 'sonner'
import { FileSignature,
  ArrowLeft,
  Trash2,
  FileDown,
  FileText,
  Receipt,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  Play,
  Ban,
  Clock,
  Pencil,
} from 'lucide-react'
import { Can } from '@/hooks/use-permissions'
import { logger } from '@/lib/utils/logger'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DocumentItem {
  id: string
  position: number
  productId: string | null
  name: string
  description: string | null
  quantity: string
  unit: string
  unitPrice: string
  vatRate: string
  discount: string | null
  discountType: string | null
  lineTotal: string
}

interface ContractDetail {
  id: string
  type: string
  number: string
  status: string
  issueDate: string | null
  dueDate: string | null
  validUntil: string | null
  subtotal: string
  taxTotal: string
  total: string
  notes: string | null
  paymentTerms: string | null
  customerName: string | null
  customerStreet: string | null
  customerHouseNumber: string | null
  customerPostalCode: string | null
  customerCity: string | null
  customerCountry: string | null
  customerVatId: string | null
  company: { id: string; name: string } | null
  contactPerson: { id: string; firstName: string; lastName: string } | null
  items: DocumentItem[]
  companyId: string | null
  contactPersonId: string | null
  projectId: string | null
  contractStartDate: string | null
  contractEndDate: string | null
  contractRenewalType: string | null
  contractRenewalPeriod: string | null
  contractNoticePeriodDays: number | null
  contractBodyHtml: string | null
  createdAt: string
  updatedAt: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('de-DE').format(new Date(dateStr))
}

function formatCurrency(value: string | null): string {
  if (!value) return '-'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value))
}

function renewalTypeLabel(type: string | null): string {
  switch (type) {
    case 'auto': return 'Automatisch'
    case 'manual': return 'Manuell'
    case 'none': return 'Keine'
    default: return type || '-'
  }
}

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [editingBody, setEditingBody] = useState(false)
  const [bodyHtml, setBodyHtml] = useState('')

  const docId = params.id as string

  const fetchContract = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/documents/${docId}`)
      const data = await response.json()

      if (data.success) {
        setContract(data.data)
        setBodyHtml(data.data.contractBodyHtml || '')
      } else {
        toast.error('Vertrag nicht gefunden')
        router.push('/intern/finance/contracts')
      }
    } catch (error) {
      logger.error('Failed to fetch contract', error, { module: 'ContractDetailPage' })
      toast.error('Fehler beim Laden des Vertrags')
    } finally {
      setLoading(false)
    }
  }, [docId, router])

  useEffect(() => { fetchContract() }, [fetchContract])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/documents/${docId}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Vertrag erfolgreich geloescht')
        router.push('/intern/finance/contracts')
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Loeschen fehlgeschlagen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Loeschen')
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(true)
    try {
      const response = await fetch(`/api/v1/documents/${docId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Statuswechsel fehlgeschlagen')

      toast.success('Status aktualisiert')
      fetchContract()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler')
    } finally {
      setStatusLoading(false)
    }
  }

  const handleConvert = async (targetType: 'offer' | 'invoice') => {
    setConverting(targetType)
    try {
      const response = await fetch(`/api/v1/documents/${docId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Umwandlung fehlgeschlagen')

      const label = targetType === 'offer' ? 'Angebot' : 'Rechnung'
      toast.success(`${label} erfolgreich erstellt`)

      const route = targetType === 'offer' ? 'offers' : 'invoices'
      router.push(`/intern/finance/${route}/${data.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler bei der Umwandlung')
    } finally {
      setConverting(null)
    }
  }

  const handlePdfExport = async () => {
    setPdfLoading(true)
    try {
      const { generateContractPdf } = await import('@/lib/services/contract-pdf.service')
      const doc = generateContractPdf(contract!)
      doc.save(`${contract!.number}.pdf`)
      toast.success('PDF wurde heruntergeladen')
    } catch (error) {
      logger.error('PDF export failed', error, { module: 'ContractDetailPage' })
      toast.error('PDF-Export fehlgeschlagen. Der Service ist noch nicht verfuegbar.')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSaveBody = async () => {
    try {
      const response = await fetch(`/api/v1/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractBodyHtml: bodyHtml }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Speichern fehlgeschlagen')

      toast.success('Vertragstext gespeichert')
      setEditingBody(false)
      fetchContract()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contract) return null

  const status = contract.status || 'draft'

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Zurueck" asChild>
            <Link href="/intern/finance/contracts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <FileSignature className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{contract.number}</h1>
              <DocumentStatusBadge status={status} type="contract" />
            </div>
            <p className="text-muted-foreground mt-1">
              {contract.company?.name || contract.customerName || 'Kein Kunde'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={handlePdfExport} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            PDF Export
          </Button>
          <Can module="documents" action="create">
            <Button
              variant="outline"
              onClick={() => handleConvert('offer')}
              disabled={converting !== null}
            >
              {converting === 'offer'
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <FileText className="mr-2 h-4 w-4" />}
              Angebot erstellen
            </Button>
            <Button
              variant="outline"
              onClick={() => handleConvert('invoice')}
              disabled={converting !== null}
            >
              {converting === 'invoice'
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Receipt className="mr-2 h-4 w-4" />}
              Rechnung erstellen
            </Button>
          </Can>
          {/* Contracts editable in any status; delete still draft-only */}
          <Can module="documents" action="update">
            <Button variant="outline" asChild>
              <Link href={`/intern/finance/contracts/${contract.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Bearbeiten
              </Link>
            </Button>
          </Can>
          {status === 'draft' && (
            <Can module="documents" action="delete">
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Loeschen
              </Button>
            </Can>
          )}
        </div>
      </div>

      {/* Status Actions */}
      <Can module="documents" action="update">
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              {status === 'draft' && (
                <Button onClick={() => handleStatusChange('sent')} disabled={statusLoading}>
                  <Send className="mr-2 h-4 w-4" />
                  Als versendet markieren
                </Button>
              )}
              {status === 'sent' && (
                <>
                  <Button
                    onClick={() => handleStatusChange('signed')}
                    disabled={statusLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Unterschrieben
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange('rejected')} disabled={statusLoading}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Abgelehnt
                  </Button>
                </>
              )}
              {status === 'signed' && (
                <Button
                  onClick={() => handleStatusChange('active')}
                  disabled={statusLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Aktivieren
                </Button>
              )}
              {status === 'active' && (
                <>
                  <Button variant="outline" onClick={() => handleStatusChange('terminated')} disabled={statusLoading}>
                    <Ban className="mr-2 h-4 w-4" />
                    Kuendigen
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange('expired')} disabled={statusLoading}>
                    <Clock className="mr-2 h-4 w-4" />
                    Abgelaufen
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </Can>

      {/* Tabs */}
      <Tabs defaultValue="uebersicht">
        <TabsList>
          <TabsTrigger value="uebersicht">Uebersicht</TabsTrigger>
          <TabsTrigger value="vertrag">Vertrag</TabsTrigger>
          <TabsTrigger value="positionen">Positionen</TabsTrigger>
        </TabsList>

        {/* Tab: Uebersicht */}
        <TabsContent value="uebersicht" className="space-y-6 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Stammdaten */}
            <Card>
              <CardHeader>
                <CardTitle>Stammdaten</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Kunde</dt>
                    <dd>{contract.company?.name || contract.customerName || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Kontaktperson</dt>
                    <dd>
                      {contract.contactPerson
                        ? `${contract.contactPerson.firstName} ${contract.contactPerson.lastName}`
                        : '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Ausstellungsdatum</dt>
                    <dd>{formatDate(contract.issueDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Erstellt</dt>
                    <dd className="text-sm">{formatDate(contract.createdAt)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Vertragsdaten */}
            <Card>
              <CardHeader>
                <CardTitle>Vertragsdaten</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Laufzeit</dt>
                    <dd>
                      {formatDate(contract.contractStartDate)}
                      {' \u2013 '}
                      {contract.contractEndDate ? formatDate(contract.contractEndDate) : 'unbefristet'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Kuendigungsfrist</dt>
                    <dd>
                      {contract.contractNoticePeriodDays != null
                        ? `${contract.contractNoticePeriodDays} Tage`
                        : '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Erneuerungstyp</dt>
                    <dd>{renewalTypeLabel(contract.contractRenewalType)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Erneuerungszeitraum</dt>
                    <dd>{contract.contractRenewalPeriod || '-'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Projekt */}
            {contract.projectId && (
              <Card>
                <CardHeader>
                  <CardTitle>Projekt</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Verknuepftes Projekt:{' '}
                    <Link
                      href={`/intern/projects/${contract.projectId}`}
                      className="text-primary hover:underline"
                    >
                      Projekt anzeigen
                    </Link>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Finanzen */}
            <Card>
              <CardHeader>
                <CardTitle>Finanzen</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Netto</dt>
                    <dd className="font-medium">{formatCurrency(contract.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">MwSt</dt>
                    <dd>{formatCurrency(contract.taxTotal)}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <dt className="font-medium">Gesamt</dt>
                    <dd className="font-bold text-lg">{formatCurrency(contract.total)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {contract.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{contract.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Vertrag */}
        <TabsContent value="vertrag" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vertragstext</CardTitle>
              <Can module="documents" action="update">
                  {editingBody ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveBody}>Speichern</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingBody(false)
                          setBodyHtml(contract.contractBodyHtml || '')
                        }}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditingBody(true)}>
                      Bearbeiten
                    </Button>
                  )}
              </Can>
            </CardHeader>
            <CardContent>
              {editingBody ? (
                <textarea
                  className="w-full min-h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                />
              ) : contract.contractBodyHtml ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: contract.contractBodyHtml }}
                />
              ) : (
                <p className="text-muted-foreground text-sm">Kein Vertragstext vorhanden.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Positionen */}
        <TabsContent value="positionen" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Positionen</CardTitle>
              <Can module="documents" action="update">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/intern/finance/contracts/${contract.id}/edit`}>
                    Positionen bearbeiten
                  </Link>
                </Button>
              </Can>
            </CardHeader>
            <CardContent>
              {contract.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Positionen vorhanden.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Pos.</th>
                        <th className="pb-2 font-medium text-muted-foreground">Bezeichnung</th>
                        <th className="pb-2 font-medium text-muted-foreground text-right">Menge</th>
                        <th className="pb-2 font-medium text-muted-foreground">Einheit</th>
                        <th className="pb-2 font-medium text-muted-foreground text-right">Einzelpreis</th>
                        <th className="pb-2 font-medium text-muted-foreground text-right">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.items
                        .sort((a, b) => a.position - b.position)
                        .map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2 text-muted-foreground">{item.position}</td>
                            <td className="py-2">
                              <div>{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground">{item.description}</div>
                              )}
                            </td>
                            <td className="py-2 text-right">{Number(item.quantity).toLocaleString('de-DE')}</td>
                            <td className="py-2">{item.unit}</td>
                            <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td colSpan={5} className="pt-3 text-right text-muted-foreground">Netto</td>
                        <td className="pt-3 text-right font-medium">{formatCurrency(contract.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="py-1 text-right text-muted-foreground">MwSt</td>
                        <td className="py-1 text-right">{formatCurrency(contract.taxTotal)}</td>
                      </tr>
                      <tr className="border-t">
                        <td colSpan={5} className="pt-2 text-right font-bold">Gesamt</td>
                        <td className="pt-2 text-right font-bold text-lg">{formatCurrency(contract.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Vertrag loeschen"
        description={`Moechten Sie Vertrag "${contract.number}" wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.`}
        confirmLabel="Loeschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
