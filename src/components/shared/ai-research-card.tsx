'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, CheckCircle2, Loader2, MapPin, Sparkles, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CompanyData {
  street?: string | null
  houseNumber?: string | null
  postalCode?: string | null
  city?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  industry?: string | null
  employeeCount?: number | null
  notes?: string | null
}

interface AIResearchCardProps {
  entityType: 'company' | 'person'
  entityId: string
  entityLabel: string
  companyData?: CompanyData
  onResearchComplete?: (result: Record<string, unknown>) => void
}

// ============================================
// Global research tracker (module-scope, survives unmount AND route changes)
// ============================================
interface GlobalResearchEntry {
  researching: boolean
  result: Record<string, unknown> | null
  updatedFields: string[]
  profileWritten: boolean
  researchId: string | null
  proposedChanges: Record<string, unknown> | null
  promise: Promise<void> | null
}

const globalResearchStore = new Map<string, GlobalResearchEntry>()

// ============================================
// Field labels & display helpers
// ============================================
const fieldLabels: Record<string, string> = {
  description: 'Beschreibung',
  industry: 'Branche',
  employeeCount: 'Mitarbeiter',
  foundedYear: 'Gründungsjahr',
  headquarters: 'Hauptsitz',
  website: 'Website',
  products: 'Produkte',
  services: 'Dienstleistungen',
  targetMarket: 'Zielmarkt',
  competitors: 'Wettbewerber',
  strengths: 'Stärken/USP',
  recentDevelopments: 'Aktuelle Entwicklungen',
  technologies: 'Technologien',
  certifications: 'Zertifizierungen',
  estimatedRevenue: 'Geschätzter Umsatz',
  growthTrend: 'Wachstumstrend',
  fundingStatus: 'Finanzierung',
  fullName: 'Vollständiger Name',
  jobTitle: 'Position',
  company: 'Unternehmen',
  department: 'Abteilung',
  bio: 'Biografie',
  expertise: 'Fachgebiete',
  education: 'Ausbildung',
  careerHistory: 'Karriereverlauf',
  languages: 'Sprachen',
  communicationStyle: 'Kommunikationsstil',
  decisionMakerLevel: 'Entscheidungsebene',
  interests: 'Interessen',
  recommendedApproach: 'Empfohlene Ansprache',
  summary: 'Zusammenfassung',
  linkedin: 'LinkedIn',
  xing: 'Xing',
  twitter: 'Twitter/X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  name: 'Name',
  companyProfile: 'Firmenprofil',
  addresses: 'Standorte',
}

const skipFields = ['researchedAt', 'socialMedia', 'financials', 'addresses', 'companyProfile', 'lastResearchedAt']

const crmFieldLabels: Record<string, string> = {
  street: 'Straße',
  houseNumber: 'Hausnummer',
  postalCode: 'Postleitzahl',
  city: 'Stadt',
  country: 'Land',
  phone: 'Telefon',
  email: 'E-Mail',
  website: 'Website',
  industry: 'Branche',
  employeeCount: 'Mitarbeiter',
  notes: 'Notizen/Firmenprofil',
}

function renderValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '' || value === 'null' || value === 'Nicht ermittelbar') return null
  if (Array.isArray(value)) {
    const filtered = value.filter(v => v && v !== 'null' && v !== 'Nicht ermittelbar')
    return filtered.length > 0 ? filtered.join(', ') : null
  }
  return String(value)
}

// ============================================
// Sub-components
// ============================================
function AddressesDisplay({ addresses }: { addresses: unknown }) {
  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) return null
  const addrs = addresses as Array<Record<string, string>>
  return (
    <div className="p-3 bg-muted rounded-lg">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        Standorte
      </dt>
      <dd className="space-y-2">
        {addrs.map((addr, i) => {
          const parts: string[] = []
          if (addr.street) parts.push(`${addr.street} ${addr.houseNumber || ''}`.trim())
          if (addr.postalCode || addr.city) parts.push(`${addr.postalCode || ''} ${addr.city || ''}`.trim())
          if (addr.country && addr.country !== 'DE') parts.push(addr.country)
          const contactParts: string[] = []
          if (addr.phone) contactParts.push(`Tel: ${addr.phone}`)
          if (addr.email) contactParts.push(`E-Mail: ${addr.email}`)
          return (
            <div key={i} className="text-sm">
              <span className="font-medium">{addr.label || `Standort ${i + 1}`}:</span>{' '}
              {parts.join(', ')}
              {contactParts.length > 0 ? (
                <span className="text-muted-foreground"> ({contactParts.join(', ')})</span>
              ) : null}
            </div>
          )
        })}
      </dd>
    </div>
  )
}

function ResearchResultDisplay({ data }: { data: Record<string, unknown> }) {
  const socialMedia = data.socialMedia as Record<string, string> | undefined
  const financials = data.financials as Record<string, string> | undefined

  const mainFields = Object.entries(data).filter(
    ([key]) => !skipFields.includes(key) && typeof data[key] !== 'object'
  )
  const arrayFields = Object.entries(data).filter(
    ([key]) => !skipFields.includes(key) && Array.isArray(data[key])
  )

  return (
    <div className="space-y-4">
      {data.summary ? (
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Zusammenfassung
          </h4>
          <p className="text-sm">{String(data.summary)}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {mainFields.map(([key, value]) => {
          if (key === 'summary') return null
          const rendered = renderValue(value)
          if (!rendered) return null
          return (
            <div key={key} className="p-3 bg-muted rounded-lg">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {fieldLabels[key] || key}
              </dt>
              <dd className="text-sm mt-1">{rendered}</dd>
            </div>
          )
        })}
      </div>

      {arrayFields.map(([key, value]) => {
        const rendered = renderValue(value)
        if (!rendered) return null
        const items = (value as string[]).filter(v => v && v !== 'null' && v !== 'Nicht ermittelbar')
        if (items.length === 0) return null
        return (
          <div key={key} className="p-3 bg-muted rounded-lg">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {fieldLabels[key] || key}
            </dt>
            <dd>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </dd>
          </div>
        )
      })}

      {socialMedia && Object.values(socialMedia).some(v => v && v !== 'null') ? (
        <div className="p-3 bg-muted rounded-lg">
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Social Media
          </dt>
          <dd className="flex flex-wrap gap-2">
            {Object.entries(socialMedia).map(([platform, url]) => {
              if (!url || url === 'null') return null
              return (
                <Badge key={platform} variant="outline" className="text-xs">
                  {fieldLabels[platform] || platform}: {url}
                </Badge>
              )
            })}
          </dd>
        </div>
      ) : null}

      {financials && Object.values(financials).some(v => v && v !== 'null' && v !== 'Nicht ermittelbar') ? (
        <div className="p-3 bg-muted rounded-lg">
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Finanzen
          </dt>
          <dd className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Object.entries(financials).map(([key, value]) => {
              if (!value || value === 'null' || value === 'Nicht ermittelbar') return null
              return (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{fieldLabels[key] || key}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              )
            })}
          </dd>
        </div>
      ) : null}

      <AddressesDisplay addresses={data.addresses} />

      {data.companyProfile && String(data.companyProfile) !== 'Nicht ermittelbar' ? (
        <div className="p-4 bg-muted/50 border rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Firmenprofil
          </h4>
          <p className="text-sm whitespace-pre-wrap">{String(data.companyProfile)}</p>
        </div>
      ) : null}

      {data.researchedAt ? (
        <p className="text-xs text-muted-foreground">
          Recherche durchgeführt am:{' '}
          {new Date(String(data.researchedAt)).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      ) : null}
    </div>
  )
}

// ============================================
// Proposed Changes Panel
// ============================================
function ProposedChangesPanel({
  proposedChanges,
  companyData,
  researchId,
  entityId,
  onApply,
  onReject,
}: {
  proposedChanges: Record<string, unknown>
  companyData?: CompanyData
  researchId: string
  entityId: string
  onApply: () => void
  onReject: () => void
}) {
  const [applying, setApplying] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const handleApply = async () => {
    setApplying(true)
    try {
      const response = await fetch(
        `/api/v1/companies/${entityId}/research/${researchId}/apply`,
        { method: 'POST' }
      )
      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Recherche-Ergebnisse erfolgreich übernommen')
        onApply()
      } else {
        toast.error(data.error?.message || 'Übernahme fehlgeschlagen')
      }
    } catch {
      toast.error('Fehler bei der Übernahme')
    } finally {
      setApplying(false)
    }
  }

  const handleReject = async () => {
    setRejecting(true)
    try {
      const response = await fetch(
        `/api/v1/companies/${entityId}/research/${researchId}/reject`,
        { method: 'POST' }
      )
      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Recherche-Ergebnisse verworfen')
        onReject()
      } else {
        toast.error(data.error?.message || 'Verwerfen fehlgeschlagen')
      }
    } catch {
      toast.error('Fehler beim Verwerfen')
    } finally {
      setRejecting(false)
    }
  }

  const changedFields = Object.entries(proposedChanges).filter(
    ([, value]) => value !== null && value !== undefined && value !== ''
  )

  if (changedFields.length === 0) return null

  return (
    <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-3">
        Vorgeschlagene Änderungen
      </h4>
      <div className="space-y-2 mb-4">
        {changedFields.map(([field, newValue]) => {
          const oldValue = companyData
            ? (companyData as Record<string, unknown>)[field]
            : undefined
          const displayOld = oldValue ? String(oldValue) : '(leer)'
          const displayNew = field === 'notes'
            ? '(Firmenprofil wird aktualisiert)'
            : String(newValue)

          return (
            <div key={field} className="grid grid-cols-3 gap-2 text-sm">
              <span className="font-medium text-amber-900 dark:text-amber-100">
                {crmFieldLabels[field] || field}
              </span>
              <span className="text-muted-foreground truncate" title={displayOld}>
                {displayOld}
              </span>
              <span className="text-amber-800 dark:text-amber-200 truncate" title={displayNew}>
                → {displayNew}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={applying || rejecting}
        >
          {applying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Übernehmen
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={applying || rejecting}
        >
          {rejecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Verwerfen
        </Button>
      </div>
    </div>
  )
}

// ============================================
// Main component
// ============================================
export function AIResearchCard({
  entityType,
  entityId,
  entityLabel,
  companyData,
  onResearchComplete,
}: AIResearchCardProps) {
  const stateKey = `${entityType}-${entityId}`
  const globalEntry = globalResearchStore.get(stateKey)

  // Initialize from global state (survives tab switch & route change)
  const [researching, setResearching] = useState(globalEntry?.researching ?? false)
  const [result, setResult] = useState<Record<string, unknown> | null>(globalEntry?.result ?? null)
  const [updatedFields, setUpdatedFields] = useState<string[]>(globalEntry?.updatedFields ?? [])
  const [profileWritten, setProfileWritten] = useState(globalEntry?.profileWritten ?? false)
  const [researchId, setResearchId] = useState<string | null>(globalEntry?.researchId ?? null)
  const [proposedChanges, setProposedChanges] = useState<Record<string, unknown> | null>(globalEntry?.proposedChanges ?? null)
  const [applied, setApplied] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(!globalEntry?.result && !globalEntry?.researching)

  const mountedRef = useRef(true)

  const apiPath = entityType === 'company'
    ? `/api/v1/companies/${entityId}/research`
    : `/api/v1/persons/${entityId}/research`

  // On mount: load existing research from server OR attach to running research
  useEffect(() => {
    mountedRef.current = true
    const entry = globalResearchStore.get(stateKey)

    if (entry?.researching && entry.promise) {
      setResearching(true)
      setLoadingExisting(false)
      entry.promise.then(() => {
        if (!mountedRef.current) return
        const updated = globalResearchStore.get(stateKey)
        if (updated?.result) {
          setResult(updated.result)
          setUpdatedFields(updated.updatedFields)
          setProfileWritten(updated.profileWritten)
          setResearchId(updated.researchId)
          setProposedChanges(updated.proposedChanges)
          setResearching(false)
          onResearchComplete?.(updated.result)
        }
      })
    } else if (entry?.result) {
      setResult(entry.result)
      setUpdatedFields(entry.updatedFields)
      setProfileWritten(entry.profileWritten)
      setResearchId(entry.researchId)
      setProposedChanges(entry.proposedChanges)
      setResearching(false)
      setLoadingExisting(false)
    } else {
      loadExistingResearch()
    }

    return () => {
      mountedRef.current = false
    }
  }, [entityId, entityType])

  const loadExistingResearch = useCallback(async () => {
    setLoadingExisting(true)
    try {
      const response = await fetch(apiPath, { method: 'GET' })
      const data = await response.json()

      if (!mountedRef.current) return

      if (response.ok && data.success && data.data.hasResearch && data.data.research) {
        const researchData = data.data.research as Record<string, unknown>
        setResult(researchData)
        globalResearchStore.set(stateKey, {
          researching: false,
          result: researchData,
          updatedFields: [],
          profileWritten: false,
          researchId: null,
          proposedChanges: null,
          promise: null,
        })
      }
    } catch (error) {
      console.error('Failed to load existing research:', error)
    } finally {
      if (mountedRef.current) {
        setLoadingExisting(false)
      }
    }
  }, [apiPath, stateKey])

  const handleStartResearch = async () => {
    setResearching(true)
    setUpdatedFields([])
    setProfileWritten(false)
    setResult(null)
    setResearchId(null)
    setProposedChanges(null)
    setApplied(false)

    const researchPromise = (async () => {
      try {
        const response = await fetch(apiPath, { method: 'POST' })
        const data = await response.json()

        if (response.ok && data.success) {
          const researchData = data.data.research as Record<string, unknown>
          const newUpdatedFields = (data.data.updatedFields as string[] | undefined) || []
          const newResearchId = data.data.researchId as string | null
          const newProposedChanges = (data.data.proposedChanges as Record<string, unknown> | undefined) || null

          globalResearchStore.set(stateKey, {
            researching: false,
            result: researchData,
            updatedFields: newUpdatedFields,
            profileWritten: false,
            researchId: newResearchId,
            proposedChanges: newProposedChanges,
            promise: null,
          })

          if (mountedRef.current) {
            setResult(researchData)
            setUpdatedFields(newUpdatedFields)
            setResearchId(newResearchId)
            setProposedChanges(newProposedChanges)
            setResearching(false)

            toast.success('KI-Recherche abgeschlossen – bitte prüfen Sie die vorgeschlagenen Änderungen')
            onResearchComplete?.(researchData)
          }
        } else {
          const errorMsg = data.error?.message || 'Recherche fehlgeschlagen'
          globalResearchStore.set(stateKey, {
            researching: false,
            result: null,
            updatedFields: [],
            profileWritten: false,
            researchId: null,
            proposedChanges: null,
            promise: null,
          })
          if (mountedRef.current) {
            setResearching(false)
            toast.error(errorMsg)
          }
        }
      } catch (error) {
        globalResearchStore.set(stateKey, {
          researching: false,
          result: globalResearchStore.get(stateKey)?.result ?? null,
          updatedFields: [],
          profileWritten: false,
          researchId: null,
          proposedChanges: null,
          promise: null,
        })
        if (mountedRef.current) {
          setResearching(false)
          toast.error(error instanceof Error ? error.message : 'Fehler bei der KI-Recherche')
        }
      }
    })()

    globalResearchStore.set(stateKey, {
      researching: true,
      result: null,
      updatedFields: [],
      profileWritten: false,
      researchId: null,
      proposedChanges: null,
      promise: researchPromise,
    })
  }

  const handleApply = () => {
    setApplied(true)
    setProposedChanges(null)
    setProfileWritten(true)
    // Update global store
    const entry = globalResearchStore.get(stateKey)
    if (entry) {
      globalResearchStore.set(stateKey, {
        ...entry,
        proposedChanges: null,
        profileWritten: true,
      })
    }
    onResearchComplete?.(result || {})
  }

  const handleReject = () => {
    setProposedChanges(null)
    // Update global store
    const entry = globalResearchStore.get(stateKey)
    if (entry) {
      globalResearchStore.set(stateKey, {
        ...entry,
        proposedChanges: null,
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          KI-Recherche
        </CardTitle>
        <CardDescription>
          {entityType === 'company'
            ? `Automatische Website-Analyse, Informationsrecherche und CRM-Update für ${entityLabel}`
            : `Automatische Analyse und Informationsrecherche für ${entityLabel}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Status bar */}
        <div className="flex items-center gap-4 mb-4">
          <Badge variant={researching ? 'secondary' : result ? 'default' : 'outline'}>
            {researching ? 'In Bearbeitung' : result ? 'Abgeschlossen' : 'Ausstehend'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartResearch}
            disabled={researching}
          >
            {researching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {entityType === 'company' ? 'Website wird analysiert...' : 'Recherche läuft...'}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {result ? 'Erneut recherchieren' : 'Recherche starten'}
              </>
            )}
          </Button>
        </div>

        {/* Progress indicator */}
        {researching ? (
          <div className="mb-4 p-4 border border-dashed rounded-lg text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {entityType === 'company'
                ? 'Die Website wird gescraped und analysiert. Dies kann bis zu 2 Minuten dauern...'
                : 'Informationen werden recherchiert. Dies kann bis zu 2 Minuten dauern...'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sie können frei navigieren – die Recherche läuft im Hintergrund weiter.
            </p>
          </div>
        ) : null}

        {/* Proposed Changes Panel (two-step flow) */}
        {!researching && proposedChanges && researchId && entityType === 'company' ? (
          <ProposedChangesPanel
            proposedChanges={proposedChanges}
            companyData={companyData}
            researchId={researchId}
            entityId={entityId}
            onApply={handleApply}
            onReject={handleReject}
          />
        ) : null}

        {/* CRM Update Info Banner (shown after apply) */}
        {applied || profileWritten ? (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-green-200">
                  CRM-Datensatz aktualisiert
                </p>
                {updatedFields.length > 0 ? (
                  <p className="text-green-700 dark:text-green-300 mt-1">
                    Aktualisierte Felder: {updatedFields.map(f => crmFieldLabels[f] || f).join(', ')}
                  </p>
                ) : null}
                <p className="text-green-700 dark:text-green-300 mt-1">
                  Firmenprofil wurde in das Notizfeld geschrieben.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Content area */}
        {loadingExisting && !researching ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade vorhandene Recherche-Ergebnisse...
          </div>
        ) : result && !researching ? (
          <ResearchResultDisplay data={result} />
        ) : !researching ? (
          <p className="text-muted-foreground text-sm">
            {entityType === 'company'
              ? 'Klicken Sie auf "Recherche starten", um die Website zu analysieren und automatisch Firmendaten zu ergänzen.'
              : `Klicken Sie auf "Recherche starten", um automatisch Informationen über ${entityLabel} zu sammeln.`
            }
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
