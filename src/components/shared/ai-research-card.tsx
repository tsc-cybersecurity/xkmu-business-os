'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, CheckCircle2, Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  crmFieldLabels,
  CrawlResultsDisplay,
  ProposedChangesPanel,
  ResearchResultDisplay,
} from './ai-research/research-sub-components'

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

interface AIResearchCardProps {
  entityType: 'company' | 'person'
  entityId: string
  entityLabel: string
  companyData?: CompanyData
  companyWebsite?: string
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

interface GlobalCrawlEntry {
  crawling: boolean
  crawlResult: CrawlRecord | null
  promise: Promise<void> | null
}

const globalCrawlStore = new Map<string, GlobalCrawlEntry>()

export function AIResearchCard({
  entityType, entityId, entityLabel, companyData, companyWebsite, onResearchComplete,
}: AIResearchCardProps) {
  const stateKey = `${entityType}-${entityId}`
  const globalEntry = globalResearchStore.get(stateKey)
  const globalCrawlEntry = globalCrawlStore.get(stateKey)

  const [researching, setResearching] = useState(globalEntry?.researching ?? false)
  const [result, setResult] = useState<Record<string, unknown> | null>(globalEntry?.result ?? null)
  const [updatedFields, setUpdatedFields] = useState<string[]>(globalEntry?.updatedFields ?? [])
  const [profileWritten, setProfileWritten] = useState(globalEntry?.profileWritten ?? false)
  const [researchId, setResearchId] = useState<string | null>(globalEntry?.researchId ?? null)
  const [proposedChanges, setProposedChanges] = useState<Record<string, unknown> | null>(globalEntry?.proposedChanges ?? null)
  const [applied, setApplied] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(!globalEntry?.result && !globalEntry?.researching)

  const [crawling, setCrawling] = useState(globalCrawlEntry?.crawling ?? false)
  const [crawls, setCrawls] = useState<CrawlRecord[]>([])

  const mountedRef = useRef(true)

  const apiPath = entityType === 'company'
    ? `/api/v1/companies/${entityId}/research`
    : `/api/v1/persons/${entityId}/research`

  const crawlApiPath = `/api/v1/companies/${entityId}/crawl`

  const loadExistingResearch = useCallback(async () => {
    setLoadingExisting(true)
    try {
      const response = await fetch(apiPath, { method: 'GET' })
      const data = await response.json()
      if (!mountedRef.current) return
      if (response.ok && data.success && data.data.hasResearch && data.data.research) {
        const researchData = data.data.research as Record<string, unknown>
        setResult(researchData)
        globalResearchStore.set(stateKey, { researching: false, result: researchData, updatedFields: [], profileWritten: false, researchId: null, proposedChanges: null, promise: null })
      }
    } catch (error) {
      logger.error('Failed to load existing research', error, { module: 'AiResearchCard' })
    } finally {
      if (mountedRef.current) setLoadingExisting(false)
    }
  }, [apiPath, stateKey])

  const loadExistingCrawls = useCallback(async () => {
    try {
      const response = await fetch(crawlApiPath, { method: 'GET' })
      const data = await response.json()
      if (!mountedRef.current) return
      if (response.ok && data.success && data.data.crawls) setCrawls(data.data.crawls as CrawlRecord[])
    } catch (error) {
      logger.error('Failed to load existing crawls', error, { module: 'AiResearchCard' })
    }
  }, [crawlApiPath])

  useEffect(() => {
    mountedRef.current = true
    const entry = globalResearchStore.get(stateKey)
    if (entry?.researching && entry.promise) {
      setResearching(true); setLoadingExisting(false)
      entry.promise.then(() => {
        if (!mountedRef.current) return
        const updated = globalResearchStore.get(stateKey)
        if (updated?.result) {
          setResult(updated.result); setUpdatedFields(updated.updatedFields); setProfileWritten(updated.profileWritten)
          setResearchId(updated.researchId); setProposedChanges(updated.proposedChanges); setResearching(false)
          onResearchComplete?.(updated.result)
        }
      })
    } else if (entry?.result) {
      setResult(entry.result); setUpdatedFields(entry.updatedFields); setProfileWritten(entry.profileWritten)
      setResearchId(entry.researchId); setProposedChanges(entry.proposedChanges); setResearching(false); setLoadingExisting(false)
    } else {
      loadExistingResearch()
    }
    const crawlEntry = globalCrawlStore.get(stateKey)
    if (crawlEntry?.crawling && crawlEntry.promise) {
      setCrawling(true)
      crawlEntry.promise.then(() => {
        if (!mountedRef.current) return
        const updatedCrawl = globalCrawlStore.get(stateKey)
        if (updatedCrawl?.crawlResult) { setCrawls(prev => [updatedCrawl.crawlResult!, ...prev]); setCrawling(false) }
      })
    }
    if (entityType === 'company') loadExistingCrawls()
    return () => { mountedRef.current = false }
  }, [entityId, entityType])

  const handleStartResearch = async () => {
    setResearching(true); setUpdatedFields([]); setProfileWritten(false); setResult(null)
    setResearchId(null); setProposedChanges(null); setApplied(false)
    const researchPromise = (async () => {
      try {
        const response = await fetch(apiPath, { method: 'POST' })
        const data = await response.json()
        if (response.ok && data.success) {
          const researchData = data.data.research as Record<string, unknown>
          const newUpdatedFields = (data.data.updatedFields as string[] | undefined) || []
          const newResearchId = data.data.researchId as string | null
          const newProposedChanges = (data.data.proposedChanges as Record<string, unknown> | undefined) || null
          globalResearchStore.set(stateKey, { researching: false, result: researchData, updatedFields: newUpdatedFields, profileWritten: false, researchId: newResearchId, proposedChanges: newProposedChanges, promise: null })
          if (mountedRef.current) {
            setResult(researchData); setUpdatedFields(newUpdatedFields); setResearchId(newResearchId)
            setProposedChanges(newProposedChanges); setResearching(false)
            toast.success('KI-Recherche abgeschlossen – bitte prüfen Sie die vorgeschlagenen Änderungen')
            onResearchComplete?.(researchData)
          }
        } else {
          const errorMsg = data.error?.message || 'Recherche fehlgeschlagen'
          globalResearchStore.set(stateKey, { researching: false, result: null, updatedFields: [], profileWritten: false, researchId: null, proposedChanges: null, promise: null })
          if (mountedRef.current) { setResearching(false); toast.error(errorMsg) }
        }
      } catch (error) {
        globalResearchStore.set(stateKey, { researching: false, result: globalResearchStore.get(stateKey)?.result ?? null, updatedFields: [], profileWritten: false, researchId: null, proposedChanges: null, promise: null })
        if (mountedRef.current) { setResearching(false); toast.error(error instanceof Error ? error.message : 'Fehler bei der KI-Recherche') }
      }
    })()
    globalResearchStore.set(stateKey, { researching: true, result: null, updatedFields: [], profileWritten: false, researchId: null, proposedChanges: null, promise: researchPromise })
  }

  const handleStartCrawl = async () => {
    logger.info('Starting crawl...', { module: 'AiResearchCard' })
    setCrawling(true)
    const crawlPromise = (async () => {
      try {
        const response = await fetch(crawlApiPath, { method: 'POST' })
        logger.info(`Crawl response status: ${response.status}`, { module: 'AiResearchCard' })
        const data = await response.json()
        logger.info('Crawl response received', { module: 'AiResearchCard' })
        if (response.ok && data.success) {
          const crawlResult = data.data.crawl as CrawlRecord
          globalCrawlStore.set(stateKey, { crawling: false, crawlResult, promise: null })
          if (mountedRef.current) { setCrawls(prev => [crawlResult, ...prev]); setCrawling(false); toast.success(`Website-Crawl abgeschlossen: ${data.data.pageCount} Seiten gescraped`) }
        } else {
          const errorMsg = data.error?.message || 'Website-Crawl fehlgeschlagen'
          logger.error('API error', errorMsg, { module: 'AiResearchCard' })
          globalCrawlStore.set(stateKey, { crawling: false, crawlResult: null, promise: null })
          if (mountedRef.current) { setCrawling(false); toast.error(errorMsg) }
        }
      } catch (error) {
        logger.error('Fetch error', error, { module: 'AiResearchCard' })
        globalCrawlStore.set(stateKey, { crawling: false, crawlResult: null, promise: null })
        if (mountedRef.current) { setCrawling(false); toast.error(error instanceof Error ? error.message : 'Fehler beim Website-Crawl') }
      }
    })()
    globalCrawlStore.set(stateKey, { crawling: true, crawlResult: null, promise: crawlPromise })
  }

  const handleApply = () => {
    setApplied(true); setProposedChanges(null); setProfileWritten(true)
    const entry = globalResearchStore.get(stateKey)
    if (entry) globalResearchStore.set(stateKey, { ...entry, proposedChanges: null, profileWritten: true })
    onResearchComplete?.(result || {})
  }

  const handleReject = () => {
    setProposedChanges(null)
    const entry = globalResearchStore.get(stateKey)
    if (entry) globalResearchStore.set(stateKey, { ...entry, proposedChanges: null })
  }

  const hasWebsite = !!(companyWebsite || companyData?.website)
  const hasCrawlData = crawls.length > 0

  return (
    <div className="space-y-6">
      {/* Card 1: Website Crawl */}
      {entityType === 'company' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Website Crawl</CardTitle>
            <CardDescription>
              Vollständiger Website-Crawl via Firecrawl – erfasst alle Unterseiten als Markdown.
              {hasCrawlData ? ' Die KI-Recherche nutzt diese Daten automatisch als Kontext.' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Button variant="outline" size="sm" onClick={handleStartCrawl} disabled={crawling || !hasWebsite} title={!hasWebsite ? 'Keine Website hinterlegt' : undefined}>
                {crawling ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Website wird gecrawlt...</>) : (<><Globe className="mr-2 h-4 w-4" />{hasCrawlData ? 'Erneut crawlen' : 'Website crawlen'}</>)}
              </Button>
              <Badge variant={crawling ? 'secondary' : hasCrawlData ? 'default' : 'outline'}>
                {crawling ? 'Crawl läuft' : hasCrawlData ? `${crawls[0].pageCount || 0} Seiten erfasst` : 'Nicht gecrawlt'}
              </Badge>
              {!hasWebsite ? <span className="text-xs text-muted-foreground">Keine Website hinterlegt</span> : null}
            </div>
            {crawling ? (
              <div className="p-4 border border-dashed rounded-lg text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Die Website wird vollständig gecrawlt (max. 20 Seiten). Dies kann bis zu 2 Minuten dauern...</p>
                <p className="text-xs text-muted-foreground mt-1">Sie können frei navigieren – der Crawl läuft im Hintergrund weiter.</p>
              </div>
            ) : null}
            {!crawling && hasCrawlData ? (
              <CrawlResultsDisplay crawls={crawls} />
            ) : !crawling && hasWebsite ? (
              <p className="text-muted-foreground text-sm">Klicken Sie auf &quot;Website crawlen&quot;, um die gesamte Website zu erfassen. Die Ergebnisse werden gespeichert und stehen der KI-Recherche als Kontext zur Verfügung.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Card 2: KI-Recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />KI-Recherche</CardTitle>
          <CardDescription>
            {entityType === 'company' ? `KI-gestützte Analyse und CRM-Datenvorschläge für ${entityLabel}` : `Automatische Analyse und Informationsrecherche für ${entityLabel}`}
            {entityType === 'company' && hasCrawlData ? ' – nutzt automatisch die gecrawlten Website-Daten.' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button variant="outline" size="sm" onClick={handleStartResearch} disabled={researching}>
              {researching ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />KI analysiert...</>) : (<><Brain className="mr-2 h-4 w-4" />{result ? 'Erneut recherchieren' : 'KI-Recherche starten'}</>)}
            </Button>
            <Badge variant={researching ? 'secondary' : result ? 'default' : 'outline'}>
              {researching ? 'Recherche läuft' : result ? 'Abgeschlossen' : 'Ausstehend'}
            </Badge>
          </div>
          {researching ? (
            <div className="mb-4 p-4 border border-dashed rounded-lg text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {entityType === 'company' ? 'Die KI analysiert die verfügbaren Daten. Dies kann bis zu 2 Minuten dauern...' : 'Informationen werden recherchiert. Dies kann bis zu 2 Minuten dauern...'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Sie können frei navigieren – die Recherche läuft im Hintergrund weiter.</p>
            </div>
          ) : null}
          {!researching && proposedChanges && researchId && entityType === 'company' ? (
            <ProposedChangesPanel proposedChanges={proposedChanges} companyData={companyData} researchId={researchId} entityId={entityId} onApply={handleApply} onReject={handleReject} />
          ) : null}
          {applied || profileWritten ? (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-800 dark:text-green-200">CRM-Datensatz aktualisiert</p>
                  {updatedFields.length > 0 ? (
                    <p className="text-green-700 dark:text-green-300 mt-1">Aktualisierte Felder: {updatedFields.map(f => crmFieldLabels[f] || f).join(', ')}</p>
                  ) : null}
                  <p className="text-green-700 dark:text-green-300 mt-1">Firmenprofil wurde in das Notizfeld geschrieben.</p>
                </div>
              </div>
            </div>
          ) : null}
          {loadingExisting && !researching ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" />Lade vorhandene Recherche-Ergebnisse...
            </div>
          ) : result && !researching ? (
            <ResearchResultDisplay data={result} />
          ) : !researching ? (
            <p className="text-muted-foreground text-sm">
              {entityType === 'company' ? 'Klicken Sie auf "KI-Recherche starten", um automatisch Firmendaten zu analysieren und CRM-Felder vorzuschlagen.' : `Klicken Sie auf "KI-Recherche starten", um automatisch Informationen über ${entityLabel} zu sammeln.`}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
