'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { logger } from '@/lib/utils/logger'

interface Company {
  id: string
  name: string
  city: string | null
}

export default function NewGrundschutzAuditPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [title, setTitle] = useState(`Grundschutz++ Audit ${new Date().toLocaleDateString('de-DE')}`)
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
        logger.error('Failed to fetch companies', error, { module: 'GrundschutzNewAuditPage' })
      } finally {
        setLoading(false)
      }
    }
    fetchCompanies()
  }, [])

  const handleCreate = async () => {
    if (!selectedCompanyId || !title.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/grundschutz/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          clientCompanyId: selectedCompanyId,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Audit erstellt')
        router.push(`/intern/cybersecurity/grundschutz/audit/${data.data.id}`)
      } else {
        toast.error(data.error?.message || 'Fehler beim Erstellen')
      }
    } catch (error) {
      logger.error('Failed to create audit', error, { module: 'GrundschutzNewAuditPage' })
      toast.error('Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/cybersecurity/grundschutz">
          <Button variant="ghost" size="icon" aria-label="Zurueck">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neues Audit</h1>
          <p className="text-muted-foreground">
            Grundschutz++ nach BSI OSCAL
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Audit-Details</CardTitle>
          <CardDescription>
            Waehlen Sie die Firma und geben Sie einen Titel fuer das Audit ein.
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
                <label htmlFor="title" className="text-sm font-medium mb-2 block">Titel *</label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Grundschutz++ Audit 2026"
                  maxLength={255}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!selectedCompanyId || !title.trim() || creating}
                className="w-full"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Audit erstellen
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
