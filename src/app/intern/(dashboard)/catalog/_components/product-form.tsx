'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import {
  ProductGrunddaten,
  ProductPreisgestaltung,
  ProductWebSeo,
  ProductBilder,
  ProductLogistik,
  ProductTagsNotizen,
} from './product-form-sections'

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
  isPublic: boolean
  isHighlight: boolean
  shortDescription: string
  slug: string
  seoTitle: string
  seoDescription: string
  images: ProductImage[]
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
      type: productType, name: '', description: '', sku: '', categoryId: '',
      priceNet: '', vatRate: '19', unit: productType === 'service' ? 'Stunde' : 'Stück',
      status: 'active', tags: [], notes: '', isPublic: false, isHighlight: false,
      shortDescription: '', slug: '', seoTitle: '', seoDescription: '', images: [],
      weight: '', dimensionLength: '', dimensionWidth: '', dimensionHeight: '',
      dimensionUnit: 'cm', manufacturer: '', ean: '', minOrderQuantity: '1', deliveryTime: '',
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagInput, setTagInput] = useState('')

  const isService = productType === 'service'
  const entityLabel = isService ? 'Dienstleistung' : 'Produkt'
  const backPath = isService ? '/catalog/services' : '/catalog/products'

  useEffect(() => { fetchCategories() }, [])

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
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
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

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) { updateField('tags', [...formData.tags, tag]); setTagInput('') }
  }

  const removeTag = (tagToRemove: string) => {
    updateField('tags', formData.tags.filter((t) => t !== tagToRemove))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = `${entityLabel}-Name ist erforderlich`
    if (formData.priceNet && isNaN(parseFloat(formData.priceNet))) newErrors.priceNet = 'Ungültiger Preis'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) { toast.error('Bitte korrigieren Sie die Fehler im Formular'); return }
    setLoading(true)
    try {
      const hasDimensions = formData.dimensionLength || formData.dimensionWidth || formData.dimensionHeight
      const payload = {
        type: productType, name: formData.name, description: formData.description, sku: formData.sku,
        categoryId: formData.categoryId || null, priceNet: formData.priceNet ? parseFloat(formData.priceNet) : null,
        vatRate: parseFloat(formData.vatRate), unit: formData.unit, status: formData.status, tags: formData.tags,
        notes: formData.notes, isPublic: formData.isPublic, isHighlight: formData.isHighlight,
        shortDescription: formData.shortDescription, slug: formData.slug, seoTitle: formData.seoTitle,
        seoDescription: formData.seoDescription, images: formData.images.filter(img => img.url),
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: hasDimensions ? {
          length: formData.dimensionLength ? parseFloat(formData.dimensionLength) : undefined,
          width: formData.dimensionWidth ? parseFloat(formData.dimensionWidth) : undefined,
          height: formData.dimensionHeight ? parseFloat(formData.dimensionHeight) : undefined,
          unit: formData.dimensionUnit,
        } : null,
        manufacturer: formData.manufacturer, ean: formData.ean,
        minOrderQuantity: formData.minOrderQuantity ? parseInt(formData.minOrderQuantity) : 1,
        deliveryTime: formData.deliveryTime,
      }
      const url = mode === 'create' ? '/api/v1/products' : `/api/v1/products/${product?.id}`
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || 'Ein Fehler ist aufgetreten')
      toast.success(mode === 'create' ? `${entityLabel} erfolgreich erstellt` : `${entityLabel} erfolgreich aktualisiert`)
      if (onSaved) { onSaved() } else { router.push(`${backPath}/${result.data.id}`); router.refresh() }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ProductGrunddaten
        formData={formData} updateField={updateField} errors={errors}
        isService={isService} entityLabel={entityLabel} categories={categories}
      />
      <ProductPreisgestaltung formData={formData} updateField={updateField} errors={errors} />
      <ProductWebSeo formData={formData} updateField={updateField} />
      <ProductBilder formData={formData} updateField={updateField} onAddImage={addImage} onRemoveImage={removeImage} onUpdateImage={updateImage} />
      {!isService && <ProductLogistik formData={formData} updateField={updateField} />}
      <ProductTagsNotizen formData={formData} updateField={updateField} tagInput={tagInput} setTagInput={setTagInput} onAddTag={addTag} onRemoveTag={removeTag} />

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => onCancel ? onCancel() : router.back()} disabled={loading}>
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
