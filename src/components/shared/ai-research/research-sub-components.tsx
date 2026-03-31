'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2, ChevronDown, ChevronRight, ExternalLink,
  Loader2, MapPin, Sparkles, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Field labels & display helpers
// ============================================
export const fieldLabels: Record<string, string> = {
  description: 'Beschreibung', industry: 'Branche', employeeCount: 'Mitarbeiter',
  foundedYear: 'Gründungsjahr', headquarters: 'Hauptsitz', website: 'Website',
  products: 'Produkte', services: 'Dienstleistungen', targetMarket: 'Zielmarkt',
  competitors: 'Wettbewerber', strengths: 'Stärken/USP', recentDevelopments: 'Aktuelle Entwicklungen',
  technologies: 'Technologien', certifications: 'Zertifizierungen', estimatedRevenue: 'Geschätzter Umsatz',
  growthTrend: 'Wachstumstrend', fundingStatus: 'Finanzierung', fullName: 'Vollständiger Name',
  jobTitle: 'Position', company: 'Unternehmen', department: 'Abteilung', bio: 'Biografie',
  expertise: 'Fachgebiete', education: 'Ausbildung', careerHistory: 'Karriereverlauf',
  languages: 'Sprachen', communicationStyle: 'Kommunikationsstil', decisionMakerLevel: 'Entscheidungsebene',
  interests: 'Interessen', recommendedApproach: 'Empfohlene Ansprache', summary: 'Zusammenfassung',
  linkedin: 'LinkedIn', xing: 'Xing', twitter: 'Twitter/X', facebook: 'Facebook',
  instagram: 'Instagram', name: 'Name', companyProfile: 'Firmenprofil', addresses: 'Standorte',
}

export const skipFields = ['researchedAt', 'socialMedia', 'financials', 'addresses', 'companyProfile', 'lastResearchedAt']

export const crmFieldLabels: Record<string, string> = {
  street: 'Straße', houseNumber: 'Hausnummer', postalCode: 'Postleitzahl', city: 'Stadt',
  country: 'Land', phone: 'Telefon', email: 'E-Mail', website: 'Website',
  industry: 'Branche', employeeCount: 'Mitarbeiter', notes: 'Notizen/Firmenprofil',
}

export function renderValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '' || value === 'null' || value === 'Nicht ermittelbar') return null
  if (Array.isArray(value)) {
    const filtered = value.filter(v => v && v !== 'null' && v !== 'Nicht ermittelbar')
    return filtered.length > 0 ? filtered.join(', ') : null
  }
  return String(value)
}

// ============================================
// AddressesDisplay
// ============================================
export function AddressesDisplay({ addresses }: { addresses: unknown }) {
  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) return null
  const addrs = addresses as Array<Record<string, string>>
  return (
    <div className="p-3 bg-muted rounded-lg">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
        <MapPin className="h-3 w-3" />Standorte
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
              {contactParts.length > 0 && <span className="text-muted-foreground"> ({contactParts.join(', ')})</span>}
            </div>
          )
        })}
      </dd>
    </div>
  )
}

// ============================================
// ResearchResultDisplay
// ============================================
export function ResearchResultDisplay({ data }: { data: Record<string, unknown> }) {
  const socialMedia = data.socialMedia as Record<string, string> | undefined
  const financials = data.financials as Record<string, string> | undefined
  const mainFields = Object.entries(data).filter(([key]) => !skipFields.includes(key) && typeof data[key] !== 'object')
  const arrayFields = Object.entries(data).filter(([key]) => !skipFields.includes(key) && Array.isArray(data[key]))
  return (
    <div className="space-y-4">
      {data.summary ? (
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" />Zusammenfassung</h4>
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
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{fieldLabels[key] || key}</dt>
              <dd className="text-sm mt-1">{rendered}</dd>
            </div>
          )
        })}
      </div>
      {arrayFields.map(([key, value]) => {
        const items = (value as string[]).filter(v => v && v !== 'null' && v !== 'Nicht ermittelbar')
        if (items.length === 0) return null
        return (
          <div key={key} className="p-3 bg-muted rounded-lg">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{fieldLabels[key] || key}</dt>
            <dd><div className="flex flex-wrap gap-1.5">{items.map((item, i) => (<Badge key={i} variant="secondary" className="text-xs">{item}</Badge>))}</div></dd>
          </div>
        )
      })}
      {socialMedia && Object.values(socialMedia).some(v => v && v !== 'null') ? (
        <div className="p-3 bg-muted rounded-lg">
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Social Media</dt>
          <dd className="flex flex-wrap gap-2">
            {Object.entries(socialMedia).map(([platform, url]) => {
              if (!url || url === 'null') return null
              return (<Badge key={platform} variant="outline" className="text-xs">{fieldLabels[platform] || platform}: {url}</Badge>)
            })}
          </dd>
        </div>
      ) : null}
      {financials && Object.values(financials).some(v => v && v !== 'null' && v !== 'Nicht ermittelbar') ? (
        <div className="p-3 bg-muted rounded-lg">
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Finanzen</dt>
          <dd className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Object.entries(financials).map(([key, value]) => {
              if (!value || value === 'null' || value === 'Nicht ermittelbar') return null
              return (<div key={key}><p className="text-xs text-muted-foreground">{fieldLabels[key] || key}</p><p className="text-sm font-medium">{value}</p></div>)
            })}
          </dd>
        </div>
      ) : null}
      <AddressesDisplay addresses={data.addresses} />
      {data.companyProfile && String(data.companyProfile) !== 'Nicht ermittelbar' ? (
        <div className="p-4 bg-muted/50 border rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Firmenprofil</h4>
          <p className="text-sm whitespace-pre-wrap">{String(data.companyProfile)}</p>
        </div>
      ) : null}
      {data.researchedAt ? (
        <p className="text-xs text-muted-foreground">
          Recherche durchgeführt am:{' '}
          {new Date(String(data.researchedAt)).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      ) : null}
    </div>
  )
}

// ============================================
// CrawlPageItem & CrawlResultsDisplay
// ============================================
interface CrawlPage {
  url: string
  title: string
  markdown: string
  scrapedAt: string
}

interface CrawlRecord {
  id: string
  url: string
  status: string
  pageCount: number | null
  pages: CrawlPage[] | null
  error: string | null
  createdAt: string
}

function CrawlPageItem({ page }: { page: CrawlPage; index: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b last:border-b-0">
      <button type="button" className="w-full p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{page.title || page.url}</p>
            <p className="text-xs text-muted-foreground truncate">{page.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">{(page.markdown?.length || 0).toLocaleString('de-DE')} Zeichen</Badge>
          <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </button>
      {expanded && page.markdown ? (
        <div className="px-3 pb-3 pl-9">
          <div className="bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap break-words font-sans leading-relaxed">{page.markdown}</pre>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CrawlResultsDisplay({ crawls }: { crawls: CrawlRecord[] }) {
  if (crawls.length === 0) return null
  const latest = crawls[0]
  const pages = latest.pages || []
  return (
    <div className="space-y-3">
      <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">{latest.pageCount || pages.length} Seiten erfolgreich gecrawlt</span>
          </div>
          <span className="text-xs text-green-700 dark:text-green-300">
            {latest.createdAt ? new Date(latest.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
        <p className="text-xs text-green-700 dark:text-green-300 mt-1">Die KI-Recherche nutzt automatisch diese Daten als Kontext. Klicken Sie auf eine Seite, um den Inhalt anzuzeigen.</p>
      </div>
      {latest.status === 'completed' && pages.length > 0 ? (
        <div className="border rounded-lg max-h-[600px] overflow-y-auto">
          {pages.map((page, i) => (<CrawlPageItem key={i} page={page} index={i} />))}
        </div>
      ) : latest.status === 'failed' ? (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          Crawl fehlgeschlagen: {latest.error || 'Unbekannter Fehler'}
        </div>
      ) : (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          Crawl abgeschlossen, aber keine Seiten-Daten vorhanden (Status: {latest.status}, Pages: {pages.length})
        </div>
      )}
    </div>
  )
}

// ============================================
// ProposedChangesPanel
// ============================================
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

interface ProposedChangesPanelProps {
  proposedChanges: Record<string, unknown>
  companyData?: CompanyData
  researchId: string
  entityId: string
  onApply: () => void
  onReject: () => void
}

export function ProposedChangesPanel({ proposedChanges, companyData, researchId, entityId, onApply, onReject }: ProposedChangesPanelProps) {
  const [applying, setApplying] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const handleApply = async () => {
    setApplying(true)
    try {
      const response = await fetch(`/api/v1/companies/${entityId}/research/${researchId}/apply`, { method: 'POST' })
      const data = await response.json()
      if (response.ok && data.success) { toast.success('Recherche-Ergebnisse erfolgreich übernommen'); onApply() }
      else toast.error(data.error?.message || 'Übernahme fehlgeschlagen')
    } catch { toast.error('Fehler bei der Übernahme') }
    finally { setApplying(false) }
  }

  const handleReject = async () => {
    setRejecting(true)
    try {
      const response = await fetch(`/api/v1/companies/${entityId}/research/${researchId}/reject`, { method: 'POST' })
      const data = await response.json()
      if (response.ok && data.success) { toast.success('Recherche-Ergebnisse verworfen'); onReject() }
      else toast.error(data.error?.message || 'Verwerfen fehlgeschlagen')
    } catch { toast.error('Fehler beim Verwerfen') }
    finally { setRejecting(false) }
  }

  const changedFields = Object.entries(proposedChanges).filter(([, value]) => value !== null && value !== undefined && value !== '')
  if (changedFields.length === 0) return null

  return (
    <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-3">Vorgeschlagene Änderungen</h4>
      <div className="space-y-2 mb-4">
        {changedFields.map(([field, newValue]) => {
          const oldValue = companyData ? (companyData as Record<string, unknown>)[field] : undefined
          const displayOld = oldValue ? String(oldValue) : '(leer)'
          const displayNew = field === 'notes' ? '(Firmenprofil wird aktualisiert)' : String(newValue)
          return (
            <div key={field} className="grid grid-cols-3 gap-2 text-sm">
              <span className="font-medium text-amber-900 dark:text-amber-100">{crmFieldLabels[field] || field}</span>
              <span className="text-muted-foreground truncate" title={displayOld}>{displayOld}</span>
              <span className="text-amber-800 dark:text-amber-200 truncate" title={displayNew}>&rarr; {displayNew}</span>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleApply} disabled={applying || rejecting}>
          {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Übernehmen
        </Button>
        <Button size="sm" variant="outline" onClick={handleReject} disabled={applying || rejecting}>
          {rejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
          Verwerfen
        </Button>
      </div>
    </div>
  )
}
