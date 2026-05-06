'use client'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const PROVIDERS: Array<{
  key: 'facebook' | 'instagram' | 'x' | 'linkedin'
  label: string
  available: boolean
  connectHref?: string
}> = [
  { key: 'facebook', label: 'Facebook', available: true, connectHref: '/api/social/meta/oauth/start' },
  { key: 'instagram', label: 'Instagram', available: true, connectHref: '/api/social/meta/oauth/start' },
  { key: 'x', label: 'X', available: false },
  { key: 'linkedin', label: 'LinkedIn', available: false },
]

const ERROR_LABELS: Record<string, string> = {
  user_denied: 'Du hast die Verknüpfung abgelehnt.',
  no_pages_found: 'Kein FB-Page-Account gefunden — bitte vorher eine Page anlegen.',
  multiple_pages_unsupported_v1:
    'Mehrere FB-Pages gefunden — die App muss derzeit für genau eine Page autorisiert werden.',
  invalid_state: 'Sicherheitsprüfung fehlgeschlagen — bitte Connect erneut starten.',
  missing_code_or_state: 'OAuth-Antwort unvollständig — bitte erneut versuchen.',
}

interface ConnectedAccount {
  id: string
  provider: string
  accountName: string
}

export function AccountCards({
  accounts,
  flash,
}: {
  accounts: ConnectedAccount[]
  flash: { connected?: string; error?: string }
}) {
  useEffect(() => {
    if (flash.connected === 'meta') toast.success('Meta-Account verbunden')
    else if (flash.error) toast.error(ERROR_LABELS[flash.error] ?? `Fehler: ${flash.error}`)
  }, [flash.connected, flash.error])

  async function disconnect(id: string) {
    if (!confirm('Account wirklich trennen?')) return
    const res = await fetch(`/api/v1/social/accounts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Getrennt')
      window.location.reload()
    } else {
      toast.error('Trennen fehlgeschlagen')
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PROVIDERS.map((p) => {
        const linked = accounts.find((a) => a.provider === p.key)
        return (
          <Card key={p.key}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{p.label}</div>
                {linked ? (
                  <div className="text-sm text-muted-foreground">{linked.accountName}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {p.available ? 'Nicht verbunden' : 'Demnächst'}
                  </div>
                )}
              </div>
              {linked ? (
                <Button variant="outline" onClick={() => disconnect(linked.id)}>
                  Trennen
                </Button>
              ) : p.available ? (
                <Button asChild>
                  <a href={p.connectHref!}>Verbinden</a>
                </Button>
              ) : (
                <Button disabled>Demnächst</Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
