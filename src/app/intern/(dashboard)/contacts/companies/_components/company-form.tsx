'use client'

import { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormField } from '@/components/shared'
import { toast } from 'sonner'
import { Loader2, Save, X } from 'lucide-react'

interface CompanyFormData {
  name: string
  legalForm: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  industry: string
  employeeCount: string
  annualRevenue: string
  vatId: string
  status: string
  tags: string[]
  notes: string
}

const initialData: CompanyFormData = {
  name: '',
  legalForm: '',
  street: '',
  houseNumber: '',
  postalCode: '',
  city: '',
  country: 'DE',
  phone: '',
  email: '',
  website: '',
  industry: '',
  employeeCount: '',
  annualRevenue: '',
  vatId: '',
  status: 'prospect',
  tags: [],
  notes: '',
}

const statusOptions = [
  { value: 'prospect', label: 'Interessent' },
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Kunde' },
  { value: 'partner', label: 'Partner' },
  { value: 'churned', label: 'Verloren' },
  { value: 'inactive', label: 'Inaktiv' },
]

const legalFormOptions = [
  { value: '', label: 'Keine Angabe' },
  { value: 'GmbH', label: 'GmbH' },
  { value: 'UG', label: 'UG (haftungsbeschränkt)' },
  { value: 'AG', label: 'AG' },
  { value: 'KG', label: 'KG' },
  { value: 'OHG', label: 'OHG' },
  { value: 'GbR', label: 'GbR' },
  { value: 'e.K.', label: 'e.K. (Einzelkaufmann)' },
  { value: 'Freiberufler', label: 'Freiberufler' },
  { value: 'eV', label: 'e.V.' },
  { value: 'Sonstige', label: 'Sonstige' },
]

const countryOptions = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'CH', label: 'Schweiz' },
]

interface CompanyFormProps {
  company?: CompanyFormData & { id: string }
  mode: 'create' | 'edit'
}

export function CompanyForm({ company, mode }: CompanyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CompanyFormData>(
    company || initialData
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagInput, setTagInput] = useState('')

  const updateField = (field: keyof CompanyFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Firmenname ist erforderlich'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse'
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'URL muss mit http:// oder https:// beginnen'
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
        legalForm: formData.legalForm === 'none' ? '' : formData.legalForm,
        employeeCount: formData.employeeCount
          ? parseInt(formData.employeeCount, 10)
          : null,
        annualRevenue: formData.annualRevenue
          ? parseFloat(formData.annualRevenue)
          : null,
      }

      const url =
        mode === 'create'
          ? '/api/v1/companies'
          : `/api/v1/companies/${company?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ein Fehler ist aufgetreten')
      }

      toast.success(
        mode === 'create'
          ? 'Firma erfolgreich erstellt'
          : 'Firma erfolgreich aktualisiert'
      )

      router.push(`/contacts/companies/${result.data.id}`)
      router.refresh()
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
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Allgemein</TabsTrigger>
          <TabsTrigger value="address">Adresse</TabsTrigger>
          <TabsTrigger value="contact">Kontakt</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        {/* Allgemein */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Allgemeine Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Firmenname"
                  htmlFor="name"
                  required
                  error={errors.name}
                >
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Muster GmbH"
                  />
                </FormField>

                <FormField label="Rechtsform" htmlFor="legalForm">
                  <Select
                    value={formData.legalForm}
                    onValueChange={(v) => updateField('legalForm', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Rechtsform wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {legalFormOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value || 'none'}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <FormField label="Status" htmlFor="status">
                <Select
                  value={formData.status}
                  onValueChange={(v) => updateField('status', v)}
                >
                  <SelectTrigger className="w-[250px]">
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
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Interne Notizen zur Firma..."
                />
              </FormField>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adresse */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <FormField
                  label="Straße"
                  htmlFor="street"
                  className="md:col-span-3"
                >
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => updateField('street', e.target.value)}
                    placeholder="Musterstraße"
                  />
                </FormField>

                <FormField label="Hausnummer" htmlFor="houseNumber">
                  <Input
                    id="houseNumber"
                    value={formData.houseNumber}
                    onChange={(e) => updateField('houseNumber', e.target.value)}
                    placeholder="123"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="PLZ" htmlFor="postalCode">
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    placeholder="12345"
                  />
                </FormField>

                <FormField label="Stadt" htmlFor="city">
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Berlin"
                  />
                </FormField>

                <FormField label="Land" htmlFor="country">
                  <Select
                    value={formData.country}
                    onValueChange={(v) => updateField('country', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((opt) => (
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
        </TabsContent>

        {/* Kontakt */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Kontaktdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Telefon" htmlFor="phone">
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+49 30 123456"
                  />
                </FormField>

                <FormField
                  label="E-Mail"
                  htmlFor="email"
                  error={errors.email}
                >
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="info@firma.de"
                  />
                </FormField>
              </div>

              <FormField
                label="Website"
                htmlFor="website"
                error={errors.website}
              >
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://www.firma.de"
                />
              </FormField>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business-Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Branche" htmlFor="industry">
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder="IT & Software"
                  />
                </FormField>

                <FormField label="Mitarbeiteranzahl" htmlFor="employeeCount">
                  <Input
                    id="employeeCount"
                    type="number"
                    value={formData.employeeCount}
                    onChange={(e) =>
                      updateField('employeeCount', e.target.value)
                    }
                    placeholder="50"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Jahresumsatz (EUR)" htmlFor="annualRevenue">
                  <Input
                    id="annualRevenue"
                    type="number"
                    step="0.01"
                    value={formData.annualRevenue}
                    onChange={(e) =>
                      updateField('annualRevenue', e.target.value)
                    }
                    placeholder="1000000"
                  />
                </FormField>

                <FormField label="USt-IdNr." htmlFor="vatId">
                  <Input
                    id="vatId"
                    value={formData.vatId}
                    onChange={(e) => updateField('vatId', e.target.value)}
                    placeholder="DE123456789"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
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
