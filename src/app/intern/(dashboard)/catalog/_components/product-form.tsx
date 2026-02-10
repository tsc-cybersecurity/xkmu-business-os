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
import { Loader2, Save, X } from 'lucide-react'

interface Category {
  id: string
  name: string
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
      console.error('Failed to fetch categories:', error)
    }
  }

  const updateField = (field: keyof ProductFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
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
      const payload = {
        ...formData,
        type: productType,
        categoryId: formData.categoryId || null,
        priceNet: formData.priceNet ? parseFloat(formData.priceNet) : null,
        vatRate: parseFloat(formData.vatRate),
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
