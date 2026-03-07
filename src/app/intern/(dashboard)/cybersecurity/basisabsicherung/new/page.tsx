'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewAssessmentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/wiba/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Assessment erstellt')
        router.push(`/intern/cybersecurity/basisabsicherung/${data.data.id}`)
      } else {
        toast.error(data.error?.message || 'Fehler beim Erstellen')
      }
    } catch (error) {
      console.error('Failed to create assessment:', error)
      toast.error('Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/cybersecurity/basisabsicherung">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neues Assessment</h1>
          <p className="text-muted-foreground">
            Basisabsicherung nach BSI WiBA
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Assessment-Details</CardTitle>
          <CardDescription>
            Geben Sie einen Namen fuer Ihr neues Basisabsicherungs-Assessment ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium mb-2 block">Name *</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Basisabsicherung 2026"
              maxLength={255}
            />
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium mb-2 block">Beschreibung (optional)</label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung oder Anmerkungen..."
              rows={3}
              maxLength={1000}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full"
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assessment erstellen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
