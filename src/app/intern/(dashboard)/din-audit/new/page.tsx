'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface Company {
  id: string
  name: string
  city: string | null
  employeeCount: number | null
}

export default function NewDinAuditPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
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
        logger.error('Failed to fetch companies', error, { module: 'DinAuditNewPage' })
      } finally {
        setLoading(false)
      }
    }
    fetchCompanies()
  }, [])

  const handleCreate = async () => {
    if (!selectedCompanyId) return
    setCreating(true)
    try {
      const response = await fetch('/api/v1/din/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientCompanyId: selectedCompanyId }),
      })
      const data = await response.json()
      if (data.success) {
        router.push(`/intern/din-audit/${data.data.id}`)
      }
    } catch (error) {
      logger.error('Failed to create audit', error, { module: 'DinAuditNewPage' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/din-audit">
          <Button variant="ghost" size="icon" aria-label="Zurück">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neues Audit erstellen</h1>
          <p className="text-muted-foreground">
            IT-Sicherheitsaudit nach DIN SPEC 27076
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Unternehmen auswaehlen</CardTitle>
          <CardDescription>
            Waehlen Sie das Unternehmen aus, für das das Audit durchgefuehrt werden soll.
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
                <label className="text-sm font-medium mb-2 block">Firma</label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Firma auswählen..." />
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

              <Button
                onClick={handleCreate}
                disabled={!selectedCompanyId || creating}
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
