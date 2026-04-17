'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, FileSignature, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

/* eslint-disable @typescript-eslint/no-explicit-any */

const categoryLabels: Record<string, string> = {
  it_service: 'IT-Dienstleistung',
  consulting: 'Beratung',
  software_dev: 'Softwareentwicklung',
  hosting_saas: 'Hosting/SaaS',
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string
  bodyHtml: string | null
}

interface Company {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

export default function NewContractPage() {
  const router = useRouter()

  // Step state
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1: Templates
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Step 2: Form data
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [companyId, setCompanyId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [contractStartDate, setContractStartDate] = useState('')
  const [contractEndDate, setContractEndDate] = useState('')
  const [contractRenewalType, setContractRenewalType] = useState('none')
  const [contractRenewalPeriod, setContractRenewalPeriod] = useState('monthly')
  const [contractNoticePeriodDays, setContractNoticePeriodDays] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [contractBodyHtml, setContractBodyHtml] = useState('')

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/v1/contract-templates')
        const json = await res.json()
        if (json.success) {
          setTemplates(json.data || [])
        }
      } catch {
        toast.error('Fehler beim Laden der Vorlagen')
      } finally {
        setTemplatesLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  // Fetch companies and projects when entering step 2
  useEffect(() => {
    if (step !== 2) return

    const fetchCompanies = async () => {
      setCompaniesLoading(true)
      try {
        const res = await fetch('/api/v1/companies?limit=100')
        const json = await res.json()
        if (json.success) {
          setCompanies(json.data?.items || json.data || [])
        }
      } catch {
        // ignore
      } finally {
        setCompaniesLoading(false)
      }
    }

    const fetchProjects = async () => {
      setProjectsLoading(true)
      try {
        const res = await fetch('/api/v1/projects?limit=100')
        const json = await res.json()
        if (json.success) {
          setProjects(json.data?.items || json.data || [])
        }
      } catch {
        // ignore
      } finally {
        setProjectsLoading(false)
      }
    }

    fetchCompanies()
    fetchProjects()
  }, [step])

  const handleSelectTemplate = (template: Template | null) => {
    setSelectedTemplate(template)
    setContractBodyHtml(template?.bodyHtml || '')
    setStep(2)
  }

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Bitte waehlen Sie ein Unternehmen aus')
      return
    }
    if (!contractStartDate) {
      toast.error('Bitte geben Sie ein Startdatum ein')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, any> = {
        type: 'contract',
        companyId,
        contractStartDate,
        contractRenewalType,
        contractBodyHtml: contractBodyHtml || undefined,
        paymentTerms: paymentTerms || undefined,
        notes: notes || undefined,
      }

      if (projectId) payload.projectId = projectId
      if (contractEndDate) payload.contractEndDate = contractEndDate
      if (contractRenewalType !== 'none') payload.contractRenewalPeriod = contractRenewalPeriod
      if (contractNoticePeriodDays) payload.contractNoticePeriodDays = Number(contractNoticePeriodDays)
      if (selectedTemplate) payload.contractTemplateId = selectedTemplate.id

      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message || 'Erstellen fehlgeschlagen')
      }

      toast.success('Vertrag erfolgreich erstellt')
      router.push(`/intern/finance/contracts/${json.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen des Vertrags')
    } finally {
      setSaving(false)
    }
  }

  // Group templates by category
  const groupedTemplates = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  // ── Step 1: Template Selection ──
  if (step === 1) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Zurueck" asChild>
            <Link href="/intern/finance/contracts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="h-6 w-6" />
              Neuer Vertrag
            </h1>
            <p className="text-sm text-muted-foreground">
              Waehlen Sie eine Vorlage oder starten Sie mit einem leeren Vertrag
            </p>
          </div>
        </div>

        {templatesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Empty contract option */}
            <div>
              <Card
                className="cursor-pointer border-dashed hover:border-primary hover:bg-muted/50 transition-colors"
                onClick={() => handleSelectTemplate(null)}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <FileSignature className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Leerer Vertrag</p>
                    <p className="text-sm text-muted-foreground">
                      Ohne Vorlage starten und den Vertragstext selbst verfassen
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grouped templates */}
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category} className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {categoryLabels[category] || category}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardContent className="p-5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{template.name}</p>
                          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                            {categoryLabels[template.category] || template.category}
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Step 2: Contract Form ──
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Zurueck" onClick={() => setStep(1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="h-6 w-6" />
            Neuer Vertrag
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedTemplate
              ? `Vorlage: ${selectedTemplate.name}`
              : 'Leerer Vertrag'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Core fields */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stammdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company */}
              <div className="space-y-2">
                <Label htmlFor="companyId">Unternehmen *</Label>
                {companiesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Laden...
                  </div>
                ) : (
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger id="companyId">
                      <SelectValue placeholder="Unternehmen waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label htmlFor="projectId">Projekt</Label>
                {projectsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Laden...
                  </div>
                ) : (
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger id="projectId">
                      <SelectValue placeholder="Projekt waehlen (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vertragslaufzeit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Start date */}
              <div className="space-y-2">
                <Label htmlFor="contractStartDate">Vertragsbeginn *</Label>
                <Input
                  id="contractStartDate"
                  type="date"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                />
              </div>

              {/* End date */}
              <div className="space-y-2">
                <Label htmlFor="contractEndDate">Vertragsende</Label>
                <Input
                  id="contractEndDate"
                  type="date"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                />
              </div>

              {/* Renewal type */}
              <div className="space-y-2">
                <Label htmlFor="renewalType">Erneuerungstyp</Label>
                <Select value={contractRenewalType} onValueChange={setContractRenewalType}>
                  <SelectTrigger id="renewalType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine</SelectItem>
                    <SelectItem value="manual">Manuell</SelectItem>
                    <SelectItem value="auto">Automatisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Renewal period - only shown if renewal type != none */}
              {contractRenewalType !== 'none' && (
                <div className="space-y-2">
                  <Label htmlFor="renewalPeriod">Erneuerungszeitraum</Label>
                  <Select value={contractRenewalPeriod} onValueChange={setContractRenewalPeriod}>
                    <SelectTrigger id="renewalPeriod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monatlich</SelectItem>
                      <SelectItem value="quarterly">Quartalsweise</SelectItem>
                      <SelectItem value="yearly">Jaehrlich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notice period */}
              <div className="space-y-2">
                <Label htmlFor="noticePeriod">Kuendigungsfrist (Tage)</Label>
                <Input
                  id="noticePeriod"
                  type="number"
                  min={0}
                  placeholder="z.B. 30"
                  value={contractNoticePeriodDays}
                  onChange={(e) => setContractNoticePeriodDays(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weitere Angaben</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment terms */}
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Zahlungsbedingungen</Label>
                <Input
                  id="paymentTerms"
                  placeholder="z.B. 30 Tage netto"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  placeholder="Interne Notizen zum Vertrag..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Contract body */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vertragstext</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[500px] font-mono text-sm"
                placeholder="HTML-Vertragstext eingeben..."
                value={contractBodyHtml}
                onChange={(e) => setContractBodyHtml(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setStep(1)}>
          Zurueck
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Vertrag erstellen
        </Button>
      </div>
    </div>
  )
}
