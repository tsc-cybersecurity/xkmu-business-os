'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/shared'
import { toast } from 'sonner'
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/utils/logger'

interface Category {
  id: string
  name: string
}

interface ProductImage {
  url: string
  alt: string
  sortOrder: number
}

interface ProductFormData {
  type: string
  name: string
  description: string
  sku: string
  categoryId: string
  priceNet: string
  vatRate: string
  unit: string
  status: string
  tags: string[]
  notes: string
  // Web & SEO
  isPublic: boolean
  isHighlight: boolean
  shortDescription: string
  slug: string
  seoTitle: string
  seoDescription: string
  // Media
  images: ProductImage[]
  // Logistics
  weight: string
  dimensionLength: string
  dimensionWidth: string
  dimensionHeight: string
  dimensionUnit: string
  manufacturer: string
  ean: string
  minOrderQuantity: string
  deliveryTime: string
}

const statusOptions = [
  { value: 'active', label: 'Aktiv' },
  { value: 'inactive', label: 'Inaktiv' },
  { value: 'draft', label: 'Entwurf' },
]

const unitOptions = [
  { value: 'Stück', label: 'Stück' },
  { value: 'Stunde', label: 'Stunde' },
  { value: 'Tag', label: 'Tag' },
  { value: 'Monat', label: 'Monat' },
  { value: 'Pauschal', label: 'Pauschal' },
  { value: 'kg', label: 'kg' },
  { value: 'Liter', label: 'Liter' },
  { value: 'm', label: 'Meter' },
  { value: 'm²', label: 'Quadratmeter' },
]

const vatRateOptions = [
  { value: '19', label: '19% (Standard)' },
  { value: '7', label: '7% (Ermäßigt)' },
  { value: '0', label: '0% (Steuerfrei)' },
]

interface ProductFormProps {
  product?: ProductFormData & { id: string }
  mode: 'create' | 'edit'
  productType: 'product' | 'service'
  onSaved?: () => void
  onCancel?: () => void
}

export function ProductForm({ product, mode, productType, onSaved, onCancel }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState<ProductFormData>(
    product || {
      type: productType,
      name: '',
      description: '',
      sku: '',
      categoryId: '',
      priceNet: '',
      vatRate: '19',
      unit: productType === 'service' ? 'Stunde' : 'Stück',
      status: 'active',
      tags: [],
      notes: '',
      isPublic: false,
      isHighlight: false,
      shortDescription: '',
      slug: '',
      seoTitle: '',
      seoDescription: '',
      images: [],
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
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagInput, setTagInput] = useState('')

  const isService = productType === 'service'
  const entityLabel = isService ? 'Dienstleistung' : 'Produkt'
  const backPath = isService ? '/catalog/services' : '/catalog/products'

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/v1/product-categories')
      const data = await response.json()
      if (data.success) setCategories(data.data)
    } catch (error) {
      logger.error('Failed to fetch categories', error, { module: 'CatalogPage' })
    }
  }

  const updateField = (field: keyof ProductFormData, value: string | string[] | boolean | ProductImage[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const addImage = () => {
    updateField('images', [...formData.images, { url: '', alt: '', sortOrder: formData.images.length }])
  }

  const removeImage = (index: number) => {
    updateField('images', formData.images.filter((_, i) => i !== index))
  }

  const updateImage = (index: number, field: keyof ProductImage, value: string) => {
    const updated = [...formData.images]
    updated[index] = { ...updated[index], [field]: value }
    updateField('images', updated)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = `${entityLabel}-Name ist erforderlich`
    }

    if (formData.priceNet && isNaN(parseFloat(formData.priceNet))) {
      newErrors.priceNet = 'Ungültiger Preis'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Bitte korrigieren Sie die Fehler im Formular')
      return
    }

    setLoading(true)

    try {
      const hasDimensions = formData.dimensionLength || formData.dimensionWidth || formData.dimensionHeight
      const payload = {
        type: productType,
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        categoryId: formData.categoryId || null,
        priceNet: formData.priceNet ? parseFloat(formData.priceNet) : null,
        vatRate: parseFloat(formData.vatRate),
        unit: formData.unit,
        status: formData.status,
        tags: formData.tags,
        notes: formData.notes,
        // Web & SEO
        isPublic: formData.isPublic,
        isHighlight: formData.isHighlight,
        shortDescription: formData.shortDescription,
        slug: formData.slug,
        seoTitle: formData.seoTitle,
        seoDescription: formData.seoDescription,
        // Media
        images: formData.images.filter(img => img.url),
        // Logistics
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: hasDimensions ? {
          length: formData.dimensionLength ? parseFloat(formData.dimensionLength) : undefined,
          width: formData.dimensionWidth ? parseFloat(formData.dimensionWidth) : undefined,
          height: formData.dimensionHeight ? parseFloat(formData.dimensionHeight) : undefined,
          unit: formData.dimensionUnit,
        } : null,
        manufacturer: formData.manufacturer,
        ean: formData.ean,
        minOrderQuantity: formData.minOrderQuantity ? parseInt(formData.minOrderQuantity) : 1,
        deliveryTime: formData.deliveryTime,
      }

      const url =
        mode === 'create'
          ? '/api/v1/products'
          : `/api/v1/products/${product?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Ein Fehler ist aufgetreten')
      }

      toast.success(
        mode === 'create'
          ? `${entityLabel} erfolgreich erstellt`
          : `${entityLabel} erfolgreich aktualisiert`
      )

      if (onSaved) {
        onSaved()
      } else {
        router.push(`${backPath}/${result.data.id}`)
        router.refresh()
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten'
      )
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      updateField('tags', [...formData.tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    updateField(
      'tags',
      formData.tags.filter((t) => t !== tagToRemove)
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Grunddaten */}
      <Card>
        <CardHeader>
          <CardTitle>Allgemeine Informationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label={`${entityLabel}-Name`}
              htmlFor="name"
              required
              error={errors.name}
            >
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={isService ? 'z.B. IT-Beratung' : 'z.B. Laptop Dell XPS 15'}
              />
            </FormField>

            <FormField label="SKU / Artikelnummer" htmlFor="sku">
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => updateField('sku', e.target.value)}
                placeholder={isService ? 'z.B. DL-001' : 'z.B. PROD-001'}
              />
            </FormField>
          </div>

          <FormField label="Beschreibung" htmlFor="description">
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={`Beschreibung der ${entityLabel}...`}
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Kategorie" htmlFor="categoryId">
              <Select
                value={formData.categoryId}
                onValueChange={(v) => updateField('categoryId', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Kategorie</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Status" htmlFor="status">
              <Select
                value={formData.status}
                onValueChange={(v) => updateField('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Preisgestaltung */}
      <Card>
        <CardHeader>
          <CardTitle>Preisgestaltung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              label="Netto-Preis (EUR)"
              htmlFor="priceNet"
              error={errors.priceNet}
            >
              <Input
                id="priceNet"
                type="number"
                step="0.01"
                min="0"
                value={formData.priceNet}
                onChange={(e) => updateField('priceNet', e.target.value)}
                placeholder="0.00"
              />
            </FormField>

            <FormField label="MwSt-Satz" htmlFor="vatRate">
              <Select
                value={formData.vatRate}
                onValueChange={(v) => updateField('vatRate', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vatRateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Einheit" htmlFor="unit">
              <Select
                value={formData.unit}
                onValueChange={(v) => updateField('unit', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {formData.priceNet && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Brutto-Preis: </span>
              <span className="font-medium">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(
                  parseFloat(formData.priceNet) *
                    (1 + parseFloat(formData.vatRate) / 100)
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webseite & SEO */}
      <Card>
        <CardHeader>
          <CardTitle>Webseite & SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => updateField('isPublic', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPublic">Öffentlich sichtbar</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isHighlight"
                checked={formData.isHighlight}
                onChange={(e) => updateField('isHighlight', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isHighlight">Hervorgehoben</Label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="URL-Slug" htmlFor="slug">
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                placeholder="wird-automatisch-generiert"
              />
            </FormField>

            <FormField label="Kurzteaser" htmlFor="shortDescription">
              <Input
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => updateField('shortDescription', e.target.value)}
                placeholder="Kurze Beschreibung für Listings"
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="SEO-Titel (max. 70 Zeichen)" htmlFor="seoTitle">
              <Input
                id="seoTitle"
                value={formData.seoTitle}
                onChange={(e) => updateField('seoTitle', e.target.value)}
                maxLength={70}
                placeholder="SEO-optimierter Titel"
              />
              <span className="text-xs text-muted-foreground">{formData.seoTitle.length}/70</span>
            </FormField>

            <FormField label="Meta-Description (max. 160 Zeichen)" htmlFor="seoDescription">
              <Input
                id="seoDescription"
                value={formData.seoDescription}
                onChange={(e) => updateField('seoDescription', e.target.value)}
                maxLength={160}
                placeholder="Meta-Description für Suchmaschinen"
              />
              <span className="text-xs text-muted-foreground">{formData.seoDescription.length}/160</span>
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Bilder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bilder</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addImage}>
              <Plus className="mr-2 h-4 w-4" />
              Bild hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.images.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Bilder hinzugefügt
            </p>
          ) : (
            <div className="space-y-3">
              {formData.images.map((img, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1 grid gap-2 md:grid-cols-2">
                    <Input
                      value={img.url}
                      onChange={(e) => updateImage(index, 'url', e.target.value)}
                      placeholder="Bild-URL"
                    />
                    <Input
                      value={img.alt}
                      onChange={(e) => updateImage(index, 'alt', e.target.value)}
                      placeholder="Alt-Text"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Löschen"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logistik (nur bei type='product') */}
      {!isService && (
        <Card>
          <CardHeader>
            <CardTitle>Logistik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Gewicht (kg)" htmlFor="weight">
                <Input
                  id="weight"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
                  placeholder="0.000"
                />
              </FormField>

              <FormField label="Hersteller" htmlFor="manufacturer">
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => updateField('manufacturer', e.target.value)}
                  placeholder="Herstellername"
                />
              </FormField>

              <FormField label="EAN / Barcode" htmlFor="ean">
                <Input
                  id="ean"
                  value={formData.ean}
                  onChange={(e) => updateField('ean', e.target.value)}
                  maxLength={13}
                  placeholder="4000000000000"
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <FormField label="Länge" htmlFor="dimensionLength">
                <Input
                  id="dimensionLength"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.dimensionLength}
                  onChange={(e) => updateField('dimensionLength', e.target.value)}
                />
              </FormField>
              <FormField label="Breite" htmlFor="dimensionWidth">
                <Input
                  id="dimensionWidth"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.dimensionWidth}
                  onChange={(e) => updateField('dimensionWidth', e.target.value)}
                />
              </FormField>
              <FormField label="Höhe" htmlFor="dimensionHeight">
                <Input
                  id="dimensionHeight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.dimensionHeight}
                  onChange={(e) => updateField('dimensionHeight', e.target.value)}
                />
              </FormField>
              <FormField label="Einheit" htmlFor="dimensionUnit">
                <Select
                  value={formData.dimensionUnit}
                  onValueChange={(v) => updateField('dimensionUnit', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="mm">mm</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Mindestbestellmenge" htmlFor="minOrderQuantity">
                <Input
                  id="minOrderQuantity"
                  type="number"
                  min="1"
                  value={formData.minOrderQuantity}
                  onChange={(e) => updateField('minOrderQuantity', e.target.value)}
                />
              </FormField>

              <FormField label="Lieferzeit" htmlFor="deliveryTime">
                <Input
                  id="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={(e) => updateField('deliveryTime', e.target.value)}
                  placeholder="z.B. 2-3 Werktage"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags & Notizen */}
      <Card>
        <CardHeader>
          <CardTitle>Zusätzliche Informationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            label="Tags"
            description="Tags helfen bei der Kategorisierung"
          >
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-secondary rounded-md"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Neuer Tag"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addTag}>
                Hinzufügen
              </Button>
            </div>
          </FormField>

          <FormField label="Notizen" htmlFor="notes">
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Interne Notizen..."
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onCancel ? onCancel() : router.back()}
          disabled={loading}
        >
          Abbrechen
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {mode === 'create' ? 'Erstellen' : 'Speichern'}
        </Button>
      </div>
    </form>
  )
}
