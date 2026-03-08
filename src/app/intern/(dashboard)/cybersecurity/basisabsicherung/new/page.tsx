'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  city: string | null
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const response = await fetch('/api/v1/companies?limit=100')
        const data = await response.json()
        if (data.success) {
          setCompanies(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCompanies()
  }, [])

  const handleCreate = async () => {
    if (!selectedCompanyId || !name.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/wiba/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          clientCompanyId: selectedCompanyId,
        }),
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
            Waehlen Sie die Firma und geben Sie einen Namen fuer das Assessment ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Firmen vorhanden. Bitte legen Sie zuerst eine Firma an.
            </p>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Firma *</label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Firma auswaehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                        {company.city ? ` (${company.city})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                disabled={!selectedCompanyId || !name.trim() || creating}
                className="w-full"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assessment erstellen
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
