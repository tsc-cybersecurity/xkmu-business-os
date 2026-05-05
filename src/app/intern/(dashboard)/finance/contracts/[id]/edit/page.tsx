'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { logger } from '@/lib/utils/logger'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Company {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  // Already a date-only string?
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  try {
    return new Date(value).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export default function EditContractPage() {
  const params = useParams()
  const router = useRouter()
  const docId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  // Form state
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

  const loadData = useCallback(async () => {
    try {
      const [contractRes, companiesRes, projectsRes] = await Promise.all([
        fetch(`/api/v1/documents/${docId}`),
        fetch('/api/v1/companies?limit=100'),
        fetch('/api/v1/projects?limit=100'),
      ])

      const contractJson = await contractRes.json()
      if (!contractJson.success || !contractJson.data) {
        setError('Vertrag nicht gefunden')
        return
      }
      const c = contractJson.data

      if (c.status !== 'draft') {
        setError('Nur Vertraege im Status "Entwurf" koennen bearbeitet werden.')
        return
      }

      setCompanyId(c.companyId || '')
      setProjectId(c.projectId || '')
      setContractStartDate(toDateInput(c.contractStartDate))
      setContractEndDate(toDateInput(c.contractEndDate))
      setContractRenewalType(c.contractRenewalType || 'none')
      setContractRenewalPeriod(c.contractRenewalPeriod || 'monthly')
      setContractNoticePeriodDays(
        c.contractNoticePeriodDays != null ? String(c.contractNoticePeriodDays) : ''
      )
      setPaymentTerms(c.paymentTerms || '')
      setNotes(c.notes || '')
      setContractBodyHtml(c.contractBodyHtml || '')

      const companiesJson = await companiesRes.json()
      if (companiesJson.success) {
        setCompanies(companiesJson.data?.items || companiesJson.data || [])
      }

      const projectsJson = await projectsRes.json()
      if (projectsJson.success) {
        setProjects(projectsJson.data?.items || projectsJson.data || [])
      }
    } catch (err) {
      logger.error('Failed to load contract for edit', err, { module: 'EditContractPage' })
      setError('Fehler beim Laden des Vertrags')
    } finally {
      setLoading(false)
    }
  }, [docId])

  useEffect(() => {
    loadData()
  }, [loadData])

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
        companyId,
        projectId: projectId || null,
        contractStartDate,
        contractEndDate: contractEndDate || null,
        contractRenewalType,
        contractRenewalPeriod: contractRenewalType !== 'none' ? contractRenewalPeriod : null,
        contractNoticePeriodDays: contractNoticePeriodDays ? Number(contractNoticePeriodDays) : null,
        paymentTerms: paymentTerms || '',
        notes: notes || '',
        contractBodyHtml: contractBodyHtml || '',
      }

      const res = await fetch(`/api/v1/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message || 'Speichern fehlgeschlagen')
      }

      toast.success('Vertrag gespeichert')
      router.push(`/intern/finance/contracts/${docId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Zurueck" asChild>
            <Link href={`/intern/finance/contracts/${docId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Vertrag bearbeiten</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button variant="outline" asChild>
              <Link href={`/intern/finance/contracts/${docId}`}>
                Zurueck zum Vertrag
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Zurueck" asChild>
          <Link href={`/intern/finance/contracts/${docId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="h-6 w-6" />
            Vertrag bearbeiten
          </h1>
          <p className="text-sm text-muted-foreground">
            Stammdaten und Vertragstext aktualisieren
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
              <div className="space-y-2">
                <Label htmlFor="companyId">Unternehmen *</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectId">Projekt</Label>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vertragslaufzeit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractStartDate">Vertragsbeginn *</Label>
                <Input
                  id="contractStartDate"
                  type="date"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractEndDate">Vertragsende</Label>
                <Input
                  id="contractEndDate"
                  type="date"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                />
              </div>

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
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Zahlungsbedingungen</Label>
                <Input
                  id="paymentTerms"
                  placeholder="z.B. 30 Tage netto"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </div>

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

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={`/intern/finance/contracts/${docId}`}>
            Abbrechen
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>
    </div>
  )
}
