'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Building2, FileText, Briefcase, ShoppingCart, MessageCircle } from 'lucide-react'

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

export default function PortalDashboard() {
  const [company, setCompany] = useState<PortalCompany | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/portal/me/company')
      .then(r => r.json())
      .then(d => { if (d?.success) setCompany(d.data) })
      .finally(() => setLoading(false))
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Meine Firmendaten
          </CardTitle>
          <Button variant="outline" size="sm" disabled>
            Bearbeiten (kommt in Kürze)
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
        {[
          { icon: FileText, title: 'Verträge', hint: 'kommt in Kürze' },
          { icon: Briefcase, title: 'Projekte', hint: 'kommt in Kürze' },
          { icon: ShoppingCart, title: 'Aufträge', hint: 'kommt in Kürze' },
          { icon: MessageCircle, title: 'Chat', hint: 'kommt in Kürze' },
        ].map(({ icon: Icon, title, hint }) => (
          <Card key={title} className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
