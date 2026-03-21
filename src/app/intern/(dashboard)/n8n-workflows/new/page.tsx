'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Sparkles, Rocket, ArrowLeft, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewN8nWorkflowPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [workflowJson, setWorkflowJson] = useState<Record<string, unknown> | null>(null)
  const [logId, setLogId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('Bitte beschreiben Sie den gewünschten Workflow')
      return
    }

    setGenerating(true)
    setWorkflowJson(null)
    try {
      const res = await fetch('/api/v1/n8n/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setWorkflowJson(json.data.workflowJson)
        setLogId(json.data.logId)
        toast.success('Workflow-JSON generiert')
      } else {
        toast.error(json.error?.message || 'Fehler bei der Generierung')
      }
    } catch {
      toast.error('Fehler bei der Generierung')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeploy() {
    if (!workflowJson) return

    setDeploying(true)
    try {
      const res = await fetch('/api/v1/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowJson),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Workflow auf n8n deployt')
        router.push('/intern/n8n-workflows')
      } else {
        toast.error(json.error?.message || 'Fehler beim Deploy')
      }
    } catch {
      toast.error('Fehler beim Deploy')
    } finally {
      setDeploying(false)
    }
  }

  async function handleGenerateAndDeploy() {
    if (!prompt.trim()) {
      toast.error('Bitte beschreiben Sie den gewünschten Workflow')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/v1/n8n/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), autoDeploy: true }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Workflow generiert und deployt')
        router.push('/intern/n8n-workflows')
      } else {
        toast.error(json.error?.message || 'Fehler')
      }
    } catch {
      toast.error('Fehler bei der Generierung')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopyJson() {
    if (!workflowJson) return
    navigator.clipboard.writeText(JSON.stringify(workflowJson, null, 2))
    setCopied(true)
    toast.success('JSON kopiert')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/n8n-workflows">
          <Button variant="ghost" size="icon" aria-label="Zurück">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Workflow erstellen</h1>
          <p className="text-muted-foreground">
            Beschreiben Sie Ihren Workflow in natürlicher Sprache
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow-Beschreibung</CardTitle>
          <CardDescription>
            Beschreiben Sie, was der Workflow tun soll. Die KI erstellt daraus ein n8n-kompatibles Workflow-JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Beschreibung</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="z.B.: Erstelle einen Workflow, der aus einem Produktfoto über die kie.ai API einen cinematic Video-Spot generiert. Der Workflow soll das Bild per HTTP Request senden, dann in einer Polling-Schleife den Status abfragen, und das fertige Video an eine Google Drive URL hochladen."
              rows={6}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generieren (Preview)
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateAndDeploy}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Generieren &amp; Deployen
            </Button>
          </div>
        </CardContent>
      </Card>

      {workflowJson && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generiertes Workflow-JSON</CardTitle>
                <CardDescription>
                  Prüfen Sie das JSON und deployen Sie den Workflow auf Ihre n8n-Instanz
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyJson}>
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? 'Kopiert' : 'Kopieren'}
                </Button>
                <Button size="sm" onClick={handleDeploy} disabled={deploying}>
                  {deploying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="mr-2 h-4 w-4" />
                  )}
                  Auf n8n deployen
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[500px] overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(workflowJson, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
