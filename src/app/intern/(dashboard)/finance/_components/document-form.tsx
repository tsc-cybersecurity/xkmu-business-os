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
import { Loader2, Save, Plus } from 'lucide-react'
import { QuickCreateCompanyDialog, QuickCreatePersonDialog } from '@/components/shared'
import { logger } from '@/lib/utils/logger'

interface Company {
  id: string
  name: string
  street: string | null
  houseNumber: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  vatId: string | null
}

interface Person {
  id: string
  firstName: string
  lastName: string
}

interface DocumentFormData {
  type: string
  number: string
  companyId: string
  contactPersonId: string
  issueDate: string
  dueDate: string
  validUntil: string
  notes: string
  paymentTerms: string
  customerName: string
  customerStreet: string
  customerHouseNumber: string
  customerPostalCode: string
  customerCity: string
  customerCountry: string
  customerVatId: string
}

interface DocumentFormProps {
  mode: 'create' | 'edit'
  documentType: 'invoice' | 'offer'
  document?: DocumentFormData & { id: string }
  onSaved?: () => void
  onCancel?: () => void
}

export function DocumentForm({ mode, documentType, document, onSaved, onCancel }: DocumentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [formData, setFormData] = useState<DocumentFormData>(
    document || {
      type: documentType,
      number: '',
      companyId: '',
      contactPersonId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: documentType === 'invoice'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : '',
      validUntil: documentType === 'offer'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : '',
      notes: '',
      paymentTerms: documentType === 'invoice' ? 'Zahlbar innerhalb von 30 Tagen' : '',
      customerName: '',
      customerStreet: '',
      customerHouseNumber: '',
      customerPostalCode: '',
      customerCity: '',
      customerCountry: 'DE',
      customerVatId: '',
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [showCreatePerson, setShowCreatePerson] = useState(false)

  const entityLabel = documentType === 'invoice' ? 'Rechnung' : 'Angebot'
  const basePath = documentType === 'invoice' ? '/intern/finance/invoices' : '/intern/finance/offers'

  useEffect(() => {
    fetchCompanies()
    if (mode === 'create') fetchNextNumber()
  }, [])

  useEffect(() => {
    if (formData.companyId) {
      fetchPersons(formData.companyId)
    } else {
      setPersons([])
    }
  }, [formData.companyId])

  const fetchNextNumber = async () => {
    try {
      const response = await fetch(`/api/v1/documents/next-number?type=${documentType}`)
      const data = await response.json()
      if (data.success && !formData.number) {
        setFormData(prev => ({ ...prev, number: data.data.number }))
      }
    } catch (error) {
      logger.error('Failed to fetch next number', error, { module: 'FinancePage' })
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/v1/companies?limit=100')
      const data = await response.json()
      if (data.success) setCompanies(data.data)
    } catch (error) {
      logger.error('Failed to fetch companies', error, { module: 'FinancePage' })
    }
  }

  const fetchPersons = async (companyId: string) => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}/persons`)
      const data = await response.json()
      if (data.success) setPersons(data.data)
    } catch (error) {
      logger.error('Failed to fetch persons', error, { module: 'FinancePage' })
    }
  }

  const updateField = (field: keyof DocumentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleCompanyChange = (companyId: string) => {
    updateField('companyId', companyId === 'none' ? '' : companyId)
    updateField('contactPersonId', '')

    // Auto-fill customer address from selected company
    if (companyId && companyId !== 'none') {
      const company = companies.find(c => c.id === companyId)
      if (company) {
        setFormData(prev => ({
          ...prev,
          companyId,
          contactPersonId: '',
          customerName: company.name || '',
          customerStreet: company.street || '',
          customerHouseNumber: company.houseNumber || '',
          customerPostalCode: company.postalCode || '',
          customerCity: company.city || '',
          customerCountry: company.country || 'DE',
          customerVatId: company.vatId || '',
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.number.trim()) {
      setErrors({ number: 'Nummer ist erforderlich' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        type: documentType,
        companyId: formData.companyId || null,
        contactPersonId: formData.contactPersonId || null,
      }

      const url = mode === 'create'
        ? '/api/v1/documents'
        : `/api/v1/documents/${document?.id}`

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
        router.push(basePath)
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stammdaten */}
      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={`${entityLabel}-Nr.`} htmlFor="number" required error={errors.number}>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => updateField('number', e.target.value)}
                placeholder={documentType === 'invoice' ? 'RE-2026-0001' : 'AN-2026-0001'}
              />
            </FormField>

            <FormField label="Ausstellungsdatum" htmlFor="issueDate">
              <Input
                id="issueDate"
                type="date"
                value={formData.issueDate}
                onChange={(e) => updateField('issueDate', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {documentType === 'invoice' ? (
              <FormField label="Fälligkeitsdatum" htmlFor="dueDate">
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => updateField('dueDate', e.target.value)}
                />
              </FormField>
            ) : (
              <FormField label="Gültig bis" htmlFor="validUntil">
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => updateField('validUntil', e.target.value)}
                />
              </FormField>
            )}

            {documentType === 'invoice' && (
              <FormField label="Zahlungsbedingungen" htmlFor="paymentTerms">
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => updateField('paymentTerms', e.target.value)}
                  placeholder="z.B. Zahlbar innerhalb von 30 Tagen"
                />
              </FormField>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kunde */}
      <Card>
        <CardHeader>
          <CardTitle>Kunde</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Firma" htmlFor="companyId">
              <Select value={formData.companyId || 'none'} onValueChange={handleCompanyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma wählen" />
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

            <FormField label="Ansprechpartner" htmlFor="contactPersonId">
              <Select
                value={formData.contactPersonId || 'none'}
                onValueChange={(v) => updateField('contactPersonId', v === 'none' ? '' : v)}
                disabled={!formData.companyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ansprechpartner wählen" />
                </SelectTrigger>
                <SelectContent>
                  {formData.companyId && (
                    <div className="p-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent cursor-pointer"
                        onMouseDown={(e) => { e.preventDefault(); setShowCreatePerson(true) }}
                      >
                        <Plus className="h-4 w-4" />
                        Neue Person anlegen
                      </button>
                    </div>
                  )}
                  <SelectItem value="none">Kein Ansprechpartner</SelectItem>
                  {persons.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Customer address (auto-filled, editable) */}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Kundenname" htmlFor="customerName">
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
              />
            </FormField>
            <FormField label="USt-IdNr." htmlFor="customerVatId">
              <Input
                id="customerVatId"
                value={formData.customerVatId}
                onChange={(e) => updateField('customerVatId', e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Straße" htmlFor="customerStreet">
              <Input
                id="customerStreet"
                value={formData.customerStreet}
                onChange={(e) => updateField('customerStreet', e.target.value)}
              />
            </FormField>
            <FormField label="Hausnr." htmlFor="customerHouseNumber">
              <Input
                id="customerHouseNumber"
                value={formData.customerHouseNumber}
                onChange={(e) => updateField('customerHouseNumber', e.target.value)}
              />
            </FormField>
            <FormField label="PLZ" htmlFor="customerPostalCode">
              <Input
                id="customerPostalCode"
                value={formData.customerPostalCode}
                onChange={(e) => updateField('customerPostalCode', e.target.value)}
              />
            </FormField>
            <FormField label="Ort" htmlFor="customerCity">
              <Input
                id="customerCity"
                value={formData.customerCity}
                onChange={(e) => updateField('customerCity', e.target.value)}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Notizen */}
      <Card>
        <CardHeader>
          <CardTitle>Notizen</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Notizen oder Bemerkungen..."
          />
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
      <QuickCreateCompanyDialog
        open={showCreateCompany}
        onOpenChange={setShowCreateCompany}
        onCreated={(company) => {
          fetchCompanies()
          handleCompanyChange(company.id)
        }}
      />
      <QuickCreatePersonDialog
        open={showCreatePerson}
        onOpenChange={setShowCreatePerson}
        preselectedCompanyId={formData.companyId}
        onCreated={(person) => {
          if (formData.companyId) fetchPersons(formData.companyId)
          updateField('contactPersonId', person.id)
        }}
      />
    </form>
  )
}
