'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/shared'
import { DocumentForm } from '../../_components/document-form'
import { DocumentStatusBadge } from '../../_components/status-badge'
import { LineItemsEditor } from '../../_components/line-items-editor'
import { toast } from 'sonner'
import { ArrowLeft,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react'
import { Can } from '@/hooks/use-permissions'
import { logger } from '@/lib/utils/logger'

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

interface DocumentDetail {
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
  createdAt: string
  updatedAt: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('de-DE').format(new Date(dateStr))
}

export default function OfferDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [document, setDocument] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [converting, setConverting] = useState(false)

  const docId = params.id as string

  useEffect(() => { fetchDocument() }, [docId])

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/v1/documents/${docId}`)
      const data = await response.json()

      if (data.success) {
        setDocument(data.data)
      } else {
        toast.error('Angebot nicht gefunden')
        router.push('/intern/finance/offers')
      }
    } catch (error) {
      logger.error('Failed to fetch offer', error, { module: 'FinanceOffersPage' })
      toast.error('Fehler beim Laden des Angebots')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/documents/${docId}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Angebot erfolgreich gelöscht')
        router.push('/intern/finance/offers')
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen')
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
      fetchDocument()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler')
    } finally {
      setStatusLoading(false)
    }
  }

  const handleConvertToInvoice = async () => {
    setConverting(true)
    try {
      const response = await fetch(`/api/v1/documents/${docId}/convert`, {
        method: 'POST',
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Umwandlung fehlgeschlagen')

      toast.success('Angebot erfolgreich in Rechnung umgewandelt')
      router.push(`/intern/finance/invoices/${data.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler bei der Umwandlung')
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!document) return null

  // Edit mode
  if (editing) {
    const formData = {
      id: document.id,
      type: document.type,
      number: document.number,
      companyId: document.companyId || '',
      contactPersonId: document.contactPersonId || '',
      issueDate: document.issueDate ? document.issueDate.split('T')[0] : '',
      dueDate: document.dueDate ? document.dueDate.split('T')[0] : '',
      validUntil: document.validUntil ? document.validUntil.split('T')[0] : '',
      notes: document.notes || '',
      paymentTerms: document.paymentTerms || '',
      customerName: document.customerName || '',
      customerStreet: document.customerStreet || '',
      customerHouseNumber: document.customerHouseNumber || '',
      customerPostalCode: document.customerPostalCode || '',
      customerCity: document.customerCity || '',
      customerCountry: document.customerCountry || 'DE',
      customerVatId: document.customerVatId || '',
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Angebot bearbeiten</h1>
          <p className="text-muted-foreground">{document.number}</p>
        </div>
        <DocumentForm
          mode="edit"
          documentType="offer"
          document={formData}
          onSaved={() => { setEditing(false); fetchDocument() }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  // View mode
  const status = document.status || 'draft'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Zurück" asChild>
            <Link href="/intern/finance/offers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{document.number}</h1>
              <DocumentStatusBadge status={status} type="offer" />
            </div>
            <p className="text-muted-foreground mt-1">
              {document.company?.name || document.customerName || 'Kein Kunde'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {status === 'draft' && (
            <>
              <Can module="documents" action="update">
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              </Can>
              <Can module="documents" action="delete">
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              </Can>
            </>
          )}
        </div>
      </div>

      {/* Status Actions */}
      <Can module="documents" action="update">
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              {status === 'draft' && (
                <Button onClick={() => handleStatusChange('sent')} disabled={statusLoading}>
                  <Send className="mr-2 h-4 w-4" />
                  Als versendet markieren
                </Button>
              )}
              {status === 'sent' && (
                <>
                  <Button onClick={() => handleStatusChange('accepted')} disabled={statusLoading} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Angenommen
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange('rejected')} disabled={statusLoading}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Abgelehnt
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange('expired')} disabled={statusLoading}>
                    <Clock className="mr-2 h-4 w-4" />
                    Abgelaufen
                  </Button>
                </>
              )}
              {(status === 'sent' || status === 'accepted') && (
                <Button onClick={handleConvertToInvoice} disabled={converting} variant="secondary">
                  <FileText className="mr-2 h-4 w-4" />
                  {converting ? 'Wird umgewandelt...' : 'In Rechnung umwandeln'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Can>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Angebotsdetails</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ausstellungsdatum</dt>
                <dd>{formatDate(document.issueDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Gültig bis</dt>
                <dd>{formatDate(document.validUntil)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Erstellt</dt>
                <dd className="text-sm">{formatDate(document.createdAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kundenadresse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {document.customerName && <p className="font-medium">{document.customerName}</p>}
              {(document.customerStreet || document.customerHouseNumber) && (
                <p>{document.customerStreet} {document.customerHouseNumber}</p>
              )}
              {(document.customerPostalCode || document.customerCity) && (
                <p>{document.customerPostalCode} {document.customerCity}</p>
              )}
              {document.customerVatId && (
                <p className="text-sm text-muted-foreground mt-2">USt-IdNr.: {document.customerVatId}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor
            documentId={document.id}
            items={document.items}
            readonly={status !== 'draft'}
            onItemsChanged={fetchDocument}
            subtotal={document.subtotal}
            taxTotal={document.taxTotal}
            total={document.total}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      {document.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{document.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Angebot löschen"
        description={`Möchten Sie Angebot "${document.number}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
