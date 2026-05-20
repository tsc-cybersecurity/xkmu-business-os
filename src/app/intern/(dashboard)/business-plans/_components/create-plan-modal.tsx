'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePlanModal({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'quick' | 'briefing'>('quick')
  const [mode, setMode] = useState<'canvas' | 'kfw' | 'both'>('both')
  const [maxIterations, setMaxIterations] = useState(5)
  const [scoreThreshold, setScoreThreshold] = useState(80)
  const [creating, setCreating] = useState(false)

  // Quick
  const [idea, setIdea] = useState('')
  // Briefing
  const [industry, setIndustry] = useState('')
  const [audience, setAudience] = useState('')
  const [usp, setUsp] = useState('')
  const [region, setRegion] = useState('')
  const [capital, setCapital] = useState('')

  const handleSubmit = async () => {
    let seedInput: Record<string, string>
    if (tab === 'quick') {
      if (idea.trim().length < 10) {
        toast.error('Bitte mindestens 10 Zeichen für die Idee.')
        return
      }
      seedInput = { idea: idea.trim() }
    } else {
      if (![industry, audience, usp, region, capital].every((v) => v.trim().length > 0)) {
        toast.error('Bitte alle Briefing-Felder ausfüllen.')
        return
      }
      seedInput = {
        industry: industry.trim(),
        audience: audience.trim(),
        usp: usp.trim(),
        region: region.trim(),
        capital: capital.trim(),
      }
    }

    setCreating(true)
    try {
      const response = await fetch('/api/v1/business-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          inputType: tab,
          seedInput,
          maxIterations,
          scoreThreshold,
        }),
      })
      const json = await response.json()
      if (response.ok && json.success) {
        toast.success('Plan angelegt — Pipeline läuft.')
        const id = json.data?.id
        onOpenChange(false)
        if (id) router.push(`/intern/business-plans/${id}`)
        else router.refresh()
      } else {
        toast.error(json.error?.message || 'Anlegen fehlgeschlagen')
      }
    } catch (err) {
      logger.error('Plan-Anlage fehlgeschlagen', err, { module: 'CreatePlanModal' })
      toast.error('Anlegen fehlgeschlagen')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Neuen Businessplan generieren
          </DialogTitle>
          <DialogDescription>
            KI generiert aus Deinem Input einen Plan, simuliert mit Mirofish und iteriert bis zur
            Score-Schwelle oder zur Iterations-Obergrenze.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'quick' | 'briefing')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">Quick-Idee</TabsTrigger>
            <TabsTrigger value="briefing">Detailliertes Briefing</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="idea">Deine Geschäftsidee</Label>
              <Textarea
                id="idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="z.B. KI-gestützte Buchhaltung für Handwerker in Thüringen — Zeitersparnis 80%, Pauschalpreis statt Stundenabrechnung."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                1-3 Sätze reichen. Die KI füllt den Rest.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="briefing" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="industry">Branche</Label>
                <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Handwerk" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="region">Region</Label>
                <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Thüringen + remote" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="audience">Zielgruppe</Label>
                <Input id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Handwerksbetriebe mit 5-20 MA, Inhaber 35-55" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="usp">USP</Label>
                <Input id="usp" value={usp} onChange={(e) => setUsp(e.target.value)} placeholder="80% Zeitersparnis, Pauschalpreis statt Stundenabrechnung" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="capital">Investitionsvolumen</Label>
                <Input id="capital" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="50 000 EUR Eigenkapital + 100 000 EUR KfW" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mode">Plan-Format</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as 'canvas' | 'kfw' | 'both')}>
                <SelectTrigger id="mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Beides (Canvas + KfW)</SelectItem>
                  <SelectItem value="canvas">Lean Canvas</SelectItem>
                  <SelectItem value="kfw">KfW-Langform</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-iter">Max. Iterationen</Label>
              <Input
                id="max-iter"
                type="number"
                min={1}
                max={10}
                value={maxIterations}
                onChange={(e) => setMaxIterations(Math.max(1, Math.min(10, Number(e.target.value) || 5)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score-threshold">Score-Schwelle</Label>
              <Input
                id="score-threshold"
                type="number"
                min={0}
                max={100}
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 80)))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Plan generieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
