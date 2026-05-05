'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface SlotTypeLite {
  id: string
  name: string
  durationMinutes: number
  color: string
}

interface Person {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: () => void
  preset?: { slotTypeId?: string; startAtUtc?: Date }
  slotTypes: SlotTypeLite[]
  userTimezone: string
  userId: string
}

export function ManualBookingDialog(props: Props) {
  const { open, onClose, onCreated, preset, slotTypes, userTimezone, userId } = props

  const [slotTypeId, setSlotTypeId] = useState<string>('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [tab, setTab] = useState<'existing' | 'new'>('new')
  const [pickedPerson, setPickedPerson] = useState<Person | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [searching, setSearching] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sendCustomerMail, setSendCustomerMail] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when the dialog opens / closes; pre-fill from preset on open.
  useEffect(() => {
    if (!open) {
      setSlotTypeId('')
      setDate('')
      setTime('')
      setTab('new')
      setPickedPerson(null)
      setSearchQ('')
      setSearchResults([])
      setSearching(false)
      setName('')
      setEmail('')
      setPhone('')
      setMessage('')
      setSendCustomerMail(true)
      setSubmitting(false)
      setError(null)
      return
    }
    // open === true: prefill
    if (preset?.slotTypeId) setSlotTypeId(preset.slotTypeId)
    if (preset?.startAtUtc) {
      const { y, m, d, hh, mm } = formatInTz(preset.startAtUtc, userTimezone)
      setDate(`${y}-${m}-${d}`)
      setTime(`${hh}:${mm}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Debounced person search.
  useEffect(() => {
    if (tab !== 'existing') return
    if (searchQ.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/v1/persons/search?q=${encodeURIComponent(searchQ.trim())}`)
        if (res.ok) {
          const json = (await res.json()) as { success: boolean; data?: Person[] }
          setSearchResults(json.data ?? [])
        } else {
          setSearchResults([])
        }
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQ, tab])

  function handleTabChange(next: string) {
    const t = next === 'existing' ? 'existing' : 'new'
    if (t === tab) return
    setTab(t)
    // Clear the *other* tab's state.
    if (t === 'existing') {
      setName('')
      setEmail('')
      setPhone('')
    } else {
      setPickedPerson(null)
      setSearchQ('')
      setSearchResults([])
    }
    setError(null)
  }

  function pickPerson(p: Person) {
    setPickedPerson(p)
    setSearchResults([])
    setSearchQ('')
  }

  function clearPick() {
    setPickedPerson(null)
  }

  function derivedExistingFields(): { name: string; email: string; phone: string } | null {
    if (!pickedPerson) return null
    const fullName = `${pickedPerson.firstName} ${pickedPerson.lastName}`.trim()
    const e = pickedPerson.email ?? ''
    const p = pickedPerson.phone ?? pickedPerson.mobile ?? ''
    return { name: fullName, email: e, phone: p }
  }

  async function handleSubmit() {
    setError(null)

    if (!slotTypeId) {
      setError('Bitte einen Slot-Typ wählen.')
      return
    }
    if (!date || !time) {
      setError('Bitte Datum und Uhrzeit angeben.')
      return
    }

    let customerName: string
    let customerEmail: string
    let customerPhone: string
    let personId: string | undefined

    if (tab === 'existing') {
      const fields = derivedExistingFields()
      if (!fields) {
        setError('Bitte eine Person auswählen.')
        return
      }
      if (!fields.email.trim() || !fields.phone.trim()) {
        setError('Person ohne E-Mail oder Telefon kann nicht gewählt werden')
        return
      }
      customerName = fields.name
      customerEmail = fields.email
      customerPhone = fields.phone
      personId = pickedPerson!.id
    } else {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        setError('Bitte Name, E-Mail und Telefon angeben.')
        return
      }
      customerName = name.trim()
      customerEmail = email.trim()
      customerPhone = phone.trim()
    }

    // Build UTC start.
    const [yy, mm, dd] = date.split('-').map(Number)
    const [hh, mi] = time.split(':').map(Number)
    if (
      !Number.isFinite(yy) ||
      !Number.isFinite(mm) ||
      !Number.isFinite(dd) ||
      !Number.isFinite(hh) ||
      !Number.isFinite(mi)
    ) {
      setError('Datum oder Uhrzeit ungültig.')
      return
    }
    const startAtUtc = localTimeToUtc(yy, mm, dd, hh, mi, userTimezone)

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          slotTypeId,
          startAtUtc: startAtUtc.toISOString(),
          customerName,
          customerEmail,
          customerPhone,
          customerMessage: message.trim() ? message.trim() : null,
          personId,
          suppressCustomerMail: !sendCustomerMail,
        }),
      })

      if (res.status === 201) {
        onCreated?.()
        onClose()
        return
      }

      // Try to parse error
      let msg = `Buchung fehlgeschlagen (${res.status}).`
      try {
        const json = (await res.json()) as { error?: string }
        if (res.status === 409 || json.error === 'slot_unavailable') {
          msg = 'Dieser Slot ist nicht mehr verfügbar.'
        } else if (json.error === 'invalid_body') {
          msg = 'Eingaben unvollständig oder ungültig.'
        } else if (json.error) {
          msg = json.error
        }
      } catch {
        // keep default msg
      }
      setError(msg)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler.')
    } finally {
      setSubmitting(false)
    }
  }

  const existingFields = derivedExistingFields()

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Termin manuell buchen</DialogTitle>
          <DialogDescription>
            Lege einen Termin im Namen einer bestehenden Person oder eines neuen Kontakts an.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Slot-Typ */}
          <div className="space-y-1.5">
            <Label htmlFor="slot-type">Slot-Typ</Label>
            <Select value={slotTypeId} onValueChange={setSlotTypeId}>
              <SelectTrigger id="slot-type" className="w-full">
                <SelectValue placeholder="Slot-Typ wählen…" />
              </SelectTrigger>
              <SelectContent>
                {slotTypes.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-3 w-3 rounded-sm border"
                        style={{ backgroundColor: st.color }}
                      />
                      <span>{st.name}</span>
                      <span className="text-muted-foreground">· {st.durationMinutes} min</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datum + Uhrzeit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Uhrzeit</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Kunde (Tabs) */}
          <div className="space-y-1.5">
            <Label>Kunde</Label>
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="new">Neuer Kontakt</TabsTrigger>
                <TabsTrigger value="existing">Bestehende Person</TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name">Name</Label>
                  <Input
                    id="cust-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vor- und Nachname"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-email">E-Mail</Label>
                    <Input
                      id="cust-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-phone">Telefon</Label>
                    <Input
                      id="cust-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="existing" className="mt-3 space-y-3">
                {pickedPerson && existingFields ? (
                  <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{existingFields.name}</div>
                      <Button type="button" variant="ghost" size="sm" onClick={clearPick}>
                        ✕ entfernen
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">E-Mail</Label>
                        <Input value={existingFields.email} readOnly />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Telefon</Label>
                        <Input value={existingFields.phone} readOnly />
                      </div>
                    </div>
                    {(!existingFields.email || !existingFields.phone) && (
                      <p className="text-xs text-destructive">
                        Person ohne E-Mail oder Telefon kann nicht gewählt werden
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Suche nach Name oder E-Mail…"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />
                    {searching ? (
                      <p className="text-xs text-muted-foreground">Suche…</p>
                    ) : searchQ.trim().length >= 2 && searchResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Keine Treffer.</p>
                    ) : null}
                    {searchResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                        {searchResults.map((p) => {
                          const eMail = p.email ?? ''
                          const tel = p.phone ?? p.mobile ?? ''
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => pickPerson(p)}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent focus:outline-none focus:bg-accent"
                            >
                              <div className="font-medium">
                                {p.firstName} {p.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {eMail || '—'} · {tel || '—'}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Optionale Nachricht */}
          <div className="space-y-1.5">
            <Label htmlFor="message">Nachricht (optional)</Label>
            <Textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Interne Notiz oder Anliegen des Kunden…"
            />
          </div>

          {/* Bestätigungsmail */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="send-mail"
              checked={sendCustomerMail}
              onCheckedChange={(v) => setSendCustomerMail(v === true)}
            />
            <Label htmlFor="send-mail" className="cursor-pointer text-sm font-normal">
              Bestätigungsmail an Kunden senden
            </Label>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Speichere…' : 'Termin anlegen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---- timezone helpers (private to file) -------------------------------------

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>
  const asLocalUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return Math.round((asLocalUtc - date.getTime()) / 60_000)
}

function localTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const approx = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = tzOffsetMinutes(approx, timeZone)
  return new Date(approx.getTime() - offset * 60_000)
}

/**
 * Format a UTC Date in the given IANA timezone, returning zero-padded
 * year/month/day/hour/minute strings suitable for `<input type="date|time">`.
 */
function formatInTz(d: Date, timeZone: string): { y: string; m: string; d: string; hh: string; mm: string } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    dtf.formatToParts(d).map((p) => [p.type, p.value]),
  ) as Record<string, string>
  return {
    y: parts.year,
    m: parts.month,
    d: parts.day,
    hh: (Number(parts.hour) % 24).toString().padStart(2, '0'),
    mm: parts.minute,
  }
}
