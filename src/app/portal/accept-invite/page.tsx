'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein')
      return
    }
    if (password.length < 10) {
      setError('Passwort muss mindestens 10 Zeichen haben')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(data.data?.redirectTo || '/portal')
        router.refresh()
      } else {
        setError(data.error?.message || 'Fehler beim Einlösen des Links')
      }
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-destructive">
        Kein Token vorhanden. Bitte den Link aus der Einladungs-E-Mail verwenden.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pw">Neues Passwort</Label>
        <Input
          id="pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={10}
          autoFocus
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw2">Passwort bestätigen</Label>
        <Input
          id="pw2"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={10}
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Zugang aktivieren
      </Button>
      <p className="text-xs text-muted-foreground">
        Mindestens 10 Zeichen mit je einem Buchstaben und einer Ziffer.
      </p>
    </form>
  )
}

export default function AcceptInvitePage() {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Kundenportal — Zugang aktivieren</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}>
            <AcceptInviteForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
