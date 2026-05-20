'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Briefcase, Plus, Loader2, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { PlanCard, type BusinessPlanListItem } from './_components/plan-card'
import { CreatePlanModal } from './_components/create-plan-modal'

const POLL_INTERVAL_MS = 10_000

export default function BusinessPlansListPage() {
  const [plans, setPlans] = useState<BusinessPlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/business-plans?limit=50')
      const json = await response.json()
      if (json.success) {
        setPlans(Array.isArray(json.data) ? json.data : [])
      } else {
        toast.error(json.error?.message || 'Plans konnten nicht geladen werden')
      }
    } catch (err) {
      logger.error('Fetching business plans failed', err, { module: 'BusinessPlansListPage' })
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchPlans().finally(() => setLoading(false))
  }, [fetchPlans])

  // Polling solange mindestens ein Plan laeuft — sonst Idle
  useEffect(() => {
    const anyRunning = plans.some((p) => p.status === 'running')
    if (!anyRunning) return
    const interval = setInterval(fetchPlans, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [plans, fetchPlans])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="h-8 w-8" />
            Businessplan-KI
          </h1>
          <p className="text-muted-foreground mt-1">
            KI-gestützte Generierung &amp; iterative Optimierung mit Mirofish-Simulation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPlans} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Plan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg space-y-3">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium">Noch keine Businesspläne</p>
            <p className="text-sm text-muted-foreground">
              Lege einen neuen Plan an — KI generiert, Mirofish simuliert, der Score steuert die Iteration.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ersten Plan anlegen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}

      <CreatePlanModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
