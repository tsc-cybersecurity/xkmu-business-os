'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared'
import { ProductForm } from '../../_components/product-form'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Wrench,
} from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Service {
  id: string
  type: string
  name: string
  description: string | null
  sku: string | null
  priceNet: string | null
  vatRate: string
  unit: string
  status: string
  tags: string[]
  notes: string | null
  category: { id: string; name: string } | null
  isPublic: boolean
  isHighlight: boolean
  shortDescription: string | null
  slug: string | null
  seoTitle: string | null
  seoDescription: string | null
  images: unknown
  createdAt: string
  updatedAt: string
}

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  draft: 'Entwurf',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  draft: 'bg-yellow-500',
}

function formatPrice(priceNet: string | null): string {
  if (!priceNet) return '-'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(parseFloat(priceNet))
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const serviceId = params.id as string

  useEffect(() => {
    fetchService()
  }, [serviceId])

  const fetchService = async () => {
    try {
      const response = await fetch(`/api/v1/products/${serviceId}`)
      const data = await response.json()

      if (data.success) {
        setService(data.data)
      } else {
        toast.error('Dienstleistung nicht gefunden')
        router.push('/intern/catalog/services')
      }
    } catch (error) {
      logger.error('Failed to fetch service', error, { module: 'CatalogServicesPage' })
      toast.error('Fehler beim Laden der Dienstleistung')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/products/${serviceId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Dienstleistung erfolgreich gelöscht')
        router.push('/intern/catalog/services')
      } else {
        const data = await response.json()
        throw new Error(data.error?.message || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Fehler beim Löschen'
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!service) return null

  // Edit mode - show the form
  if (editing) {
    const imgs = (service.images || []) as Array<{ url: string; alt: string; sortOrder: number }>
    const formData = {
      id: service.id,
      type: service.type,
      name: service.name,
      description: service.description || '',
      sku: service.sku || '',
      categoryId: service.category?.id || '',
      priceNet: service.priceNet || '',
      vatRate: service.vatRate || '19',
      unit: service.unit || 'Stunde',
      status: service.status || 'active',
      tags: service.tags || [],
      notes: service.notes || '',
      isPublic: service.isPublic ?? false,
      isHighlight: service.isHighlight ?? false,
      shortDescription: service.shortDescription || '',
      slug: service.slug || '',
      seoTitle: service.seoTitle || '',
      seoDescription: service.seoDescription || '',
      images: imgs,
      weight: '',
      dimensionLength: '',
      dimensionWidth: '',
      dimensionHeight: '',
      dimensionUnit: 'cm',
      manufacturer: '',
      ean: '',
      minOrderQuantity: '1',
      deliveryTime: '',
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dienstleistung bearbeiten</h1>
          <p className="text-muted-foreground">{service.name}</p>
        </div>
        <ProductForm
          mode="edit"
          productType="service"
          product={formData}
          onSaved={() => {
            setEditing(false)
            fetchService()
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  // View mode
  const grossPrice =
    service.priceNet
      ? parseFloat(service.priceNet) * (1 + parseFloat(service.vatRate) / 100)
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/intern/catalog/services">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{service.name}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[service.status]}>
                {statusLabels[service.status] || service.status}
              </Badge>
              {service.category && (
                <Badge variant="outline">{service.category.name}</Badge>
              )}
              {service.tags?.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Stammdaten */}
        <Card>
          <CardHeader>
            <CardTitle>Stammdaten</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">SKU</dt>
                <dd>{service.sku || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kategorie</dt>
                <dd>{service.category?.name || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Einheit</dt>
                <dd>{service.unit}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge className={statusColors[service.status]}>
                    {statusLabels[service.status] || service.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Erstellt</dt>
                <dd className="text-sm">{formatDate(service.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Aktualisiert</dt>
                <dd className="text-sm">{formatDate(service.updatedAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Preisgestaltung */}
        <Card>
          <CardHeader>
            <CardTitle>Preisgestaltung</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Netto-Preis</dt>
                <dd className="font-mono text-lg font-medium">
                  {formatPrice(service.priceNet)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">MwSt-Satz</dt>
                <dd>{service.vatRate}%</dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="font-medium">Brutto-Preis</dt>
                <dd className="font-mono text-lg font-bold">
                  {grossPrice
                    ? new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(grossPrice)
                    : '-'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Beschreibung */}
      {service.description && (
        <Card>
          <CardHeader>
            <CardTitle>Beschreibung</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{service.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Notizen */}
      {service.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{service.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Dienstleistung löschen"
        description={`Möchten Sie "${service.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
