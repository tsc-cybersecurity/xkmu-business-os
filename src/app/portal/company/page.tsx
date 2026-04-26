'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Building2, Clock, History, Pencil, X } from 'lucide-react'

const EDITABLE_FIELDS = [
  'legalForm', 'street', 'houseNumber', 'postalCode', 'city', 'country',
  'phone', 'email', 'website', 'industry', 'vatId',
] as const
type Field = typeof EDITABLE_FIELDS[number]

const LABELS: Record<Field, string> = {
  legalForm: 'Rechtsform',
  street: 'Straße',
  houseNumber: 'Hausnummer',
  postalCode: 'PLZ',
  city: 'Ort',
  country: 'Land',
  phone: 'Telefon',
  email: 'E-Mail',
  website: 'Website',
  industry: 'Branche',
  vatId: 'USt-IdNr.',
}

type CompanyRecord = { id: string; name: string } & Record<Field, string | null>

interface PendingRequest {
  id: string
  status: string
  requestedAt: string
  proposedChanges: Record<string, unknown>
}

export default function PortalCompanyPage() {
  const router = useRouter()
  const [company, setCompany] = useState<CompanyRecord | null>(null)
  const [form, setForm] = useState<Record<Field, string>>({} as Record<Field, string>)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, rRes] = await Promise.all([
        fetch('/api/v1/portal/me/company'),
        fetch('/api/v1/portal/me/company/change-requests'),
      ])
      const [cData, rData] = await Promise.all([cRes.json(), rRes.json()])

      if (cData?.success) {
        const c = cData.data as CompanyRecord
        setCompany(c)
        const initial = {} as Record<Field, string>
        for (const f of EDITABLE_FIELDS) initial[f] = c[f] ?? ''
        setForm(initial)
      }
      if (rData?.success) {
        const rows = rData.data as PendingRequest[]
        const p = rows.find((r) => r.status === 'pending')
        setPending(p ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const startEdit = () => {
    if (!company) return
    const initial = {} as Record<Field, string>
    for (const f of EDITABLE_FIELDS) initial[f] = company[f] ?? ''
    setForm(initial)
    setMode('edit')
  }

  const cancelEdit = () => setMode('view')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    const proposedChanges: Record<string, string | null> = {}
    for (const f of EDITABLE_FIELDS) {
      const current = company[f] ?? ''
      const next = form[f] ?? ''
      if (next !== current) {
        proposedChanges[f] = next === '' ? null : next
      }
    }

    if (Object.keys(proposedChanges).length === 0) {
      toast.error('Keine Änderungen')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/portal/me/company/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedChanges }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Antrag eingereicht — Admin prüft in Kürze')
        router.push('/portal/company/requests')
      } else {
        toast.error(data.error?.message || 'Einreichen fehlgeschlagen')
      }
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelPending = async () => {
    if (!pending) return
    const res = await fetch(`/api/v1/portal/me/company/change-request/${pending.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      toast.success('Antrag storniert')
      loadAll()
    } else {
      toast.error(data.error?.message || 'Stornieren fehlgeschlagen')
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!company) return <p className="text-destructive">Firmendaten konnten nicht geladen werden.</p>

  const hasPending = !!pending
  const isEdit = mode === 'edit'

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Firmendaten
          </h1>
          {isEdit && (
            <p className="text-muted-foreground mt-1">
              Änderungen werden erst nach Genehmigung durch einen Administrator aktiv.
            </p>
          )}
        </div>
        {!isEdit && !hasPending && (
          <Button onClick={startEdit} variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Bearbeiten
          </Button>
        )}
      </div>

      {hasPending && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Offener Antrag
            </CardTitle>
            <CardDescription>
              Sie haben einen Antrag vom {new Date(pending!.requestedAt).toLocaleDateString('de-DE')} eingereicht.
              Werte werden nach Genehmigung übernommen. Eine erneute Bearbeitung ist erst nach Abschluss des Antrags möglich.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/portal/company/requests">
                <History className="h-4 w-4 mr-2" />Antrag ansehen
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelPending}>
              Antrag stornieren
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{company.name}</CardTitle>
          <CardDescription>
            Firmenname kann nicht über das Portal geändert werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEdit ? (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              {EDITABLE_FIELDS.map((f) => (
                <div key={f} className={f === 'street' || f === 'industry' ? 'sm:col-span-2' : ''}>
                  <Label htmlFor={f}>{LABELS[f]}</Label>
                  <Input
                    id={f}
                    value={form[f] ?? ''}
                    onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  />
                </div>
              ))}
              <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-4 border-t flex-wrap">
                <Button variant="ghost" type="button" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Antrag einreichen
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              {EDITABLE_FIELDS.map((f) => {
                const value = company[f]
                const wide = f === 'street' || f === 'industry'
                return (
                  <div key={f} className={wide ? 'sm:col-span-2' : ''}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{LABELS[f]}</dt>
                    <dd className="text-sm mt-0.5 break-words">
                      {value || <span className="text-muted-foreground italic">—</span>}
                    </dd>
                  </div>
                )
              })}
              <div className="sm:col-span-2 pt-3 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/portal/company/requests">
                    <History className="h-4 w-4 mr-2" />
                    Meine Anträge
                  </Link>
                </Button>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
