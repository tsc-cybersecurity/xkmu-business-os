'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Sparkles, Loader2, Save, AlertTriangle } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

const categoryOptions = [
  { value: 'it_service', label: 'IT-Dienstleistung' },
  { value: 'consulting', label: 'Beratung' },
  { value: 'software_dev', label: 'Softwareentwicklung' },
  { value: 'hosting_saas', label: 'Hosting/SaaS' },
]

export default function NewContractTemplatePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1 state
  const [category, setCategory] = useState('consulting')
  const [goal, setGoal] = useState('')

  // Step 2/3 state
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Step 3 state (editable preview)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [placeholders, setPlaceholders] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const handleGenerate = async () => {
    setStep(2)
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/v1/contract-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, category }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setName(json.data.name || 'Neues Template')
        setDescription(json.data.description || '')
        setBodyHtml(json.data.bodyHtml || json.data.raw || '')
        setPlaceholders(json.data.placeholders || [])
        setStep(3)
      } else {
        setGenError(json.error?.message || 'Generierung fehlgeschlagen')
        setStep(1)
      }
    } catch {
      setGenError('Verbindungsfehler bei der Generierung')
      setStep(1)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/contract-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          category,
          body_html: bodyHtml,
          placeholders,
          is_system: false,
        }),
      })
      const json = await res.json()
      if (json.success) {
        router.push('/intern/finance/contracts/templates')
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Neues Template erstellen
          </h1>
          <p className="text-sm text-muted-foreground">
            KI-gestuetzter Vertragsvorlagen-Assistent
          </p>
        </div>
        <Link href="/intern/finance/contracts/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurueck
          </Button>
        </Link>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step >= 1 ? 'default' : 'outline'}>1. Eingabe</Badge>
        <span className="text-muted-foreground">-</span>
        <Badge variant={step >= 2 ? 'default' : 'outline'}>2. Generierung</Badge>
        <span className="text-muted-foreground">-</span>
        <Badge variant={step >= 3 ? 'default' : 'outline'}>3. Vorschau</Badge>
      </div>

      {/* Step 1: Input */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Vertragsziel beschreiben</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200 flex gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>
                KI-generierte Vertraege ersetzen keine Rechtsberatung. Lassen Sie generierte Vorlagen immer von einem Juristen pruefen.
              </span>
            </div>

            {genError && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                {genError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Kategorie</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Was soll der Vertrag regeln?</label>
              <Textarea
                placeholder="z.B. IT-Wartungsvertrag fuer monatliche Serverbetreuung inkl. Monitoring, Backup und Notfall-Support..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={5}
              />
            </div>

            <Button onClick={handleGenerate} disabled={!goal.trim()}>
              <Sparkles className="mr-1 h-4 w-4" />
              Generieren
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Loading */}
      {step === 2 && generating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              KI generiert Vertragsvorlage... Dies kann einige Sekunden dauern.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Edit */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vorschau & Bearbeitung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Beschreibung</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vertragstext (HTML)</label>
                <Textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>

              {/* HTML Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Vorschau</label>
                <div
                  className="rounded-md border p-4 prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              </div>

              {/* Placeholders */}
              {placeholders.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platzhalter</label>
                  <div className="flex flex-wrap gap-2">
                    {placeholders.map((p: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {`{{${p.key}}}`} - {p.label}
                        {p.required && <span className="ml-1 text-red-500">*</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Zurueck
                </Button>
                <Button onClick={handleSave} disabled={saving || !name.trim()}>
                  {saving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
