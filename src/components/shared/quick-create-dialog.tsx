'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Quick Create Company Dialog
// ============================================

interface QuickCreateCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (company: { id: string; name: string }) => void
}

export function QuickCreateCompanyDialog({ open, onOpenChange, onCreated }: QuickCreateCompanyDialogProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')

  const resetForm = () => {
    setName('')
    setCity('')
    setEmail('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/v1/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim() || undefined,
          email: email.trim() || undefined,
          status: 'prospect',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error?.message || 'Fehler beim Erstellen')
      }
      toast.success(`Firma "${name}" erstellt`)
      onCreated({ id: data.data?.id || data.id, name: name.trim() })
      resetForm()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Firma anlegen</DialogTitle>
          <DialogDescription>Schnellerfassung einer neuen Firma</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qc-company-name">Firmenname *</Label>
            <Input
              id="qc-company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Musterfirma GmbH"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc-company-city">Stadt</Label>
            <Input
              id="qc-company-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="z.B. Berlin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc-company-email">E-Mail</Label>
            <Input
              id="qc-company-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@firma.de"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false) }} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Quick Create Person Dialog
// ============================================

interface QuickCreatePersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (person: { id: string; firstName: string; lastName: string; email: string | null }) => void
  companies?: { id: string; name: string }[]
  preselectedCompanyId?: string
}

export function QuickCreatePersonDialog({ open, onOpenChange, onCreated, companies, preselectedCompanyId }: QuickCreatePersonDialogProps) {
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [companyId, setCompanyId] = useState(preselectedCompanyId || '')

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setCompanyId(preselectedCompanyId || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/v1/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          companyId: companyId || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error?.message || 'Fehler beim Erstellen')
      }
      toast.success(`Person "${firstName} ${lastName}" erstellt`)
      onCreated({
        id: data.data?.id || data.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
      })
      resetForm()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Person anlegen</DialogTitle>
          <DialogDescription>Schnellerfassung einer neuen Kontaktperson</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qc-person-first">Vorname *</Label>
              <Input
                id="qc-person-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-person-last">Nachname *</Label>
              <Input
                id="qc-person-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc-person-email">E-Mail</Label>
            <Input
              id="qc-person-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@firma.de"
            />
          </div>
          {companies && companies.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="qc-person-company">Firma</Label>
              <Select value={companyId || 'none'} onValueChange={(v) => setCompanyId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma zuordnen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Firma</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false) }} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving || !firstName.trim() || !lastName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
