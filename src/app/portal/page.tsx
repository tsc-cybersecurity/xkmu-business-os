'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Building2, FileText, Briefcase, ShoppingCart, MessageCircle, AlertTriangle } from 'lucide-react'

interface PortalCompany {
  id: string
  name: string
  street: string | null
  houseNumber: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
}

interface ChangeRequest {
  id: string
  status: string
}

export default function PortalDashboard() {
  const [company, setCompany] = useState<PortalCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPending, setHasPending] = useState(false)
  const [contractCount, setContractCount] = useState(0)
  const [projectCount, setProjectCount] = useState(0)
  const [openOrderCount, setOpenOrderCount] = useState(0)
  const [chatUnread, setChatUnread] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/portal/me/company').then(r => r.json()),
      fetch('/api/v1/portal/me/company/change-requests').then(r => r.json()),
      fetch('/api/v1/portal/me/contracts').then(r => r.json()),
      fetch('/api/v1/portal/me/projects').then(r => r.json()),
      fetch('/api/v1/portal/me/orders').then(r => r.json()),
      fetch('/api/v1/portal/me/chat/unread-count').then(r => r.json()),
    ]).then(([cData, rData, contractData, projectData, orderData, chatData]) => {
      if (cData?.success) setCompany(cData.data)
      if (rData?.success) {
        const rows = rData.data as ChangeRequest[]
        setHasPending(rows.some((r) => r.status === 'pending'))
      }
      if (contractData?.success) setContractCount(contractData.data?.length ?? 0)
      if (projectData?.success) setProjectCount(projectData.data?.length ?? 0)
      if (orderData?.success) {
        const orderRows = orderData.data as { status: string }[]
        setOpenOrderCount(orderRows.filter(o => ['pending', 'accepted', 'in_progress'].includes(o.status)).length)
      }
      if (chatData?.success) setChatUnread(chatData.data?.unread ?? 0)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Willkommen zurück</h1>
        {company && (
          <p className="text-muted-foreground">
            Angemeldet für: <strong>{company.name}</strong>
          </p>
        )}
      </div>

      {hasPending && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Ein Antrag läuft — Details unter{' '}
            <Link href="/portal/company/requests" className="underline underline-offset-2 font-medium">
              Meine Anträge
            </Link>
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Meine Firmendaten
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/portal/company">Bearbeiten</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {company ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Firmenname</dt>
                <dd>{company.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Adresse</dt>
                <dd>
                  {[company.street, company.houseNumber].filter(Boolean).join(' ')}
                  <br />
                  {[company.postalCode, company.city].filter(Boolean).join(' ')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Telefon</dt>
                <dd>{company.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">E-Mail</dt>
                <dd>{company.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Website</dt>
                <dd>{company.website || '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground">
              Firmendaten konnten nicht geladen werden.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/portal/contracts" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />Verträge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{contractCount}</p>
              <p className="text-sm text-muted-foreground">Verträge einsehen</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/projects" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />Projekte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{projectCount}</p>
              <p className="text-sm text-muted-foreground">Projekte einsehen</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/orders" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />Aufträge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{openOrderCount}</p>
              <p className="text-sm text-muted-foreground">laufende Anfragen</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/chat" className="block">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{chatUnread}</p>
              <p className="text-sm text-muted-foreground">ungelesene Nachrichten</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
