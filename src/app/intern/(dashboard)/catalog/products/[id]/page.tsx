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
import { ArrowLeft,
  Edit,
  Package,
  Trash2,
} from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Product {
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
  weight: string | null
  dimensions: unknown
  manufacturer: string | null
  ean: string | null
  minOrderQuantity: number
  deliveryTime: string | null
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

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const productId = params.id as string

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/v1/products/${productId}`)
      const data = await response.json()

      if (data.success) {
        setProduct(data.data)
      } else {
        toast.error('Produkt nicht gefunden')
        router.push('/intern/catalog/products')
      }
    } catch (error) {
      logger.error('Failed to fetch product', error, { module: 'CatalogProductsPage' })
      toast.error('Fehler beim Laden des Produkts')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/products/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Produkt erfolgreich gelöscht')
        router.push('/intern/catalog/products')
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

  if (!product) return null

  // Edit mode - show the form
  if (editing) {
    const dims = product.dimensions as { length?: number; width?: number; height?: number; unit?: string } | null
    const imgs = (product.images || []) as Array<{ url: string; alt: string; sortOrder: number }>
    const formData = {
      id: product.id,
      type: product.type,
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      categoryId: product.category?.id || '',
      priceNet: product.priceNet || '',
      vatRate: product.vatRate || '19',
      unit: product.unit || 'Stück',
      status: product.status || 'active',
      tags: product.tags || [],
      notes: product.notes || '',
      isPublic: product.isPublic ?? false,
      isHighlight: product.isHighlight ?? false,
      shortDescription: product.shortDescription || '',
      slug: product.slug || '',
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
      images: imgs,
      weight: product.weight || '',
      dimensionLength: dims?.length?.toString() || '',
      dimensionWidth: dims?.width?.toString() || '',
      dimensionHeight: dims?.height?.toString() || '',
      dimensionUnit: dims?.unit || 'cm',
      manufacturer: product.manufacturer || '',
      ean: product.ean || '',
      minOrderQuantity: (product.minOrderQuantity ?? 1).toString(),
      deliveryTime: product.deliveryTime || '',
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Produkt bearbeiten</h1>
          <p className="text-muted-foreground">{product.name}</p>
        </div>
        <ProductForm
          mode="edit"
          productType="product"
          product={formData}
          onSaved={() => {
            setEditing(false)
            fetchProduct()
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  // View mode
  const grossPrice =
    product.priceNet
      ? parseFloat(product.priceNet) * (1 + parseFloat(product.vatRate) / 100)
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Zurück" asChild>
            <Link href="/intern/catalog/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{product.name}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[product.status]}>
                {statusLabels[product.status] || product.status}
              </Badge>
              {product.category && (
                <Badge variant="outline">{product.category.name}</Badge>
              )}
              {product.tags?.map((tag) => (
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
                <dd>{product.sku || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kategorie</dt>
                <dd>{product.category?.name || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Einheit</dt>
                <dd>{product.unit}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge className={statusColors[product.status]}>
                    {statusLabels[product.status] || product.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Erstellt</dt>
                <dd className="text-sm">{formatDate(product.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Aktualisiert</dt>
                <dd className="text-sm">{formatDate(product.updatedAt)}</dd>
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
                  {formatPrice(product.priceNet)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">MwSt-Satz</dt>
                <dd>{product.vatRate}%</dd>
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
      {product.description && (
        <Card>
          <CardHeader>
            <CardTitle>Beschreibung</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{product.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Notizen */}
      {product.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{product.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Produkt löschen"
        description={`Möchten Sie "${product.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
