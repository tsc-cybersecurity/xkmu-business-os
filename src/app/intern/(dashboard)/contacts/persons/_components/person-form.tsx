'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Checkbox } from '@/components/ui/checkbox'
import { FormField, QuickCreateCompanyDialog } from '@/components/shared'
import { toast } from 'sonner'
import { Loader2, Save, X, Plus } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface PersonFormData {
  salutation: string
  firstName: string
  lastName: string
  email: string
  phone: string
  mobile: string
  jobTitle: string
  department: string
  companyId: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
  status: string
  isPrimaryContact: boolean
  tags: string[]
  notes: string
}

interface Company {
  id: string
  name: string
}

const initialData: PersonFormData = {
  salutation: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  mobile: '',
  jobTitle: '',
  department: '',
  companyId: '',
  street: '',
  houseNumber: '',
  postalCode: '',
  city: '',
  country: 'DE',
  status: 'active',
  isPrimaryContact: false,
  tags: [],
  notes: '',
}

const salutationOptions = [
  { value: '', label: 'Keine Angabe' },
  { value: 'Herr', label: 'Herr' },
  { value: 'Frau', label: 'Frau' },
  { value: 'Divers', label: 'Divers' },
]

const statusOptions = [
  { value: 'active', label: 'Aktiv' },
  { value: 'inactive', label: 'Inaktiv' },
  { value: 'do_not_contact', label: 'Nicht kontaktieren' },
]

const countryOptions = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'CH', label: 'Schweiz' },
]

interface PersonFormProps {
  person?: PersonFormData & { id: string }
  mode: 'create' | 'edit'
}

export function PersonForm({ person, mode }: PersonFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [formData, setFormData] = useState<PersonFormData>(() => {
    if (person) return person
    // Check for companyId in URL params
    const companyId = searchParams.get('companyId')
    return { ...initialData, companyId: companyId || '' }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagInput, setTagInput] = useState('')
  const [showCreateCompany, setShowCreateCompany] = useState(false)

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/v1/companies?limit=1000')
      const data = await response.json()
      if (data.success) {
        setCompanies(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch companies', error, { module: 'ContactsPersonsPage' })
    }
  }

  const updateField = (
    field: keyof PersonFormData,
    value: string | string[] | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Vorname ist erforderlich'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Nachname ist erforderlich'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse'
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
        companyId: formData.companyId || null,
      }

      const url =
        mode === 'create'
          ? '/api/v1/persons'
          : `/api/v1/persons/${person?.id}`

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
          ? 'Person erfolgreich erstellt'
          : 'Person erfolgreich aktualisiert'
      )

      router.push(`/intern/contacts/persons/${result.data.id}`)
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
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="basic">Allgemein</TabsTrigger>
          <TabsTrigger value="contact">Kontakt</TabsTrigger>
          <TabsTrigger value="address">Adresse</TabsTrigger>
        </TabsList>

        {/* Allgemein */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Allgemeine Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <FormField label="Anrede" htmlFor="salutation">
                  <Select
                    value={formData.salutation}
                    onValueChange={(v) => updateField('salutation', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Anrede wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {salutationOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value || 'none'}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Vorname"
                  htmlFor="firstName"
                  required
                  error={errors.firstName}
                  className="md:col-span-1"
                >
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="Max"
                  />
                </FormField>

                <FormField
                  label="Nachname"
                  htmlFor="lastName"
                  required
                  error={errors.lastName}
                  className="md:col-span-2"
                >
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Mustermann"
                  />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Position" htmlFor="jobTitle">
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => updateField('jobTitle', e.target.value)}
                    placeholder="Geschäftsführer"
                  />
                </FormField>

                <FormField label="Abteilung" htmlFor="department">
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => updateField('department', e.target.value)}
                    placeholder="Vertrieb"
                  />
                </FormField>
              </div>

              <FormField label="Firma" htmlFor="companyId">
                <Select
                  value={formData.companyId}
                  onValueChange={(v) =>
                    updateField('companyId', v === 'none' ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Firma wählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent cursor-pointer"
                        onMouseDown={(e) => { e.preventDefault(); setShowCreateCompany(true) }}
                      >
                        <Plus className="h-4 w-4" />
                        Neue Firma anlegen
                      </button>
                    </div>
                    <SelectItem value="none">Keine Firma</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
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

                <div className="flex items-end pb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isPrimaryContact"
                      checked={formData.isPrimaryContact}
                      onCheckedChange={(checked) =>
                        updateField('isPrimaryContact', checked === true)
                      }
                    />
                    <label
                      htmlFor="isPrimaryContact"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Hauptansprechpartner
                    </label>
                  </div>
                </div>
              </div>

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
                  placeholder="Interne Notizen zur Person..."
                />
              </FormField>
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
                  placeholder="max.mustermann@firma.de"
                />
              </FormField>

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

                <FormField label="Mobil" htmlFor="mobile">
                  <Input
                    id="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => updateField('mobile', e.target.value)}
                    placeholder="+49 171 123456"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adresse (Privatadresse) */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>Privatadresse</CardTitle>
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

      <QuickCreateCompanyDialog
        open={showCreateCompany}
        onOpenChange={setShowCreateCompany}
        onCreated={(company) => {
          setCompanies((prev) => [company, ...prev])
          updateField('companyId', company.id)
        }}
      />
    </form>
  )
}
