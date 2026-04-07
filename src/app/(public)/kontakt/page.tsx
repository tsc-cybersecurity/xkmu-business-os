'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'

const DEFAULT_INTEREST_TAGS = [
  'KI-Beratung', 'KI-Automatisierung', 'KI-Assistenten & Chatbots',
  'IT-Assessment', 'IT-Architektur & Cloud', 'Systemintegration',
  'Security Quick Check', 'Hardening & Baselines', 'Backup & Recovery',
  'Incident Response', 'Security Awareness', 'Datenschutz & Compliance',
  'NIS-2 Unterstützung', 'Kombinations-Modul', 'Managed Services',
]

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  interests?: string
  message?: string
  privacyAccepted?: string
  general?: string
}

export default function KontaktPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    email: '',
    interests: [] as string[],
    message: '',
    privacyAccepted: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [interestTags, setInterestTags] = useState<string[]>(DEFAULT_INTEREST_TAGS)
  const [contactHeadline, setContactHeadline] = useState('Kontakt')
  const [contactDescription, setContactDescription] = useState('Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns!')

  useEffect(() => {
    fetch('/api/v1/public/branding', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data) {
          const d = data.data
          if (Array.isArray(d.contactInterestTags) && d.contactInterestTags.length > 0) {
            setInterestTags(d.contactInterestTags)
          }
          if (d.contactHeadline) setContactHeadline(d.contactHeadline)
          if (d.contactDescription) setContactDescription(d.contactDescription)
        }
      })
      .catch(() => {})
  }, [])

  const toggleInterest = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(tag)
        ? prev.interests.filter(t => t !== tag)
        : [...prev.interests, tag],
    }))
    if (errors.interests) {
      setErrors(prev => ({ ...prev, interests: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.firstName.trim()) newErrors.firstName = 'Vorname ist erforderlich'
    if (!formData.lastName.trim()) newErrors.lastName = 'Nachname ist erforderlich'
    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Gültige E-Mail-Adresse erforderlich'
    }
    if (formData.interests.length === 0) newErrors.interests = 'Bitte wählen Sie mindestens ein Interesse'
    if (!formData.message.trim()) newErrors.message = 'Nachricht ist erforderlich'
    if (!formData.privacyAccepted) newErrors.privacyAccepted = 'Datenschutzbestimmungen müssen akzeptiert werden'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setErrors({})

    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmitted(true)
      } else {
        setErrors({ general: data.error?.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' })
      }
    } catch {
      setErrors({ general: 'Verbindungsfehler. Bitte versuchen Sie es erneut.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-6">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-4">Vielen Dank für Ihre Nachricht!</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.
        </p>
        <Button asChild>
          <Link href="/">Zurück zur Startseite</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/30 p-4">
            <Mail className="h-8 w-8 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-3">{contactHeadline}</h1>
        <p className="text-lg text-muted-foreground">
          {contactDescription}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-8">
        {errors.general && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {errors.general}
          </div>
        )}

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company">Firma</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="Firmenname (optional)"
          />
        </div>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Vorname *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={e => {
                setFormData(prev => ({ ...prev, firstName: e.target.value }))
                if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined }))
              }}
              placeholder="Vorname"
              className={errors.firstName ? 'border-destructive' : ''}
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nachname *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={e => {
                setFormData(prev => ({ ...prev, lastName: e.target.value }))
                if (errors.lastName) setErrors(prev => ({ ...prev, lastName: undefined }))
              }}
              placeholder="Nachname"
              className={errors.lastName ? 'border-destructive' : ''}
            />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>

        {/* Contact row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Telefonnummer (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => {
                setFormData(prev => ({ ...prev, email: e.target.value }))
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
              }}
              placeholder="ihre@email.de"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-3">
          <Label>Wofür interessieren Sie sich? *</Label>
          <div className="flex flex-wrap gap-2">
            {interestTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleInterest(tag)}
                className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                  formData.interests.includes(tag)
                    ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]'
                    : 'bg-background hover:bg-muted border-input'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {errors.interests && <p className="text-xs text-destructive">{errors.interests}</p>}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Nachricht *</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={e => {
              setFormData(prev => ({ ...prev, message: e.target.value }))
              if (errors.message) setErrors(prev => ({ ...prev, message: undefined }))
            }}
            placeholder="Ihre Nachricht an uns..."
            rows={5}
            className={errors.message ? 'border-destructive' : ''}
          />
          {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
        </div>

        {/* Privacy checkbox */}
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.privacyAccepted}
              onChange={e => {
                setFormData(prev => ({ ...prev, privacyAccepted: e.target.checked }))
                if (errors.privacyAccepted) setErrors(prev => ({ ...prev, privacyAccepted: undefined }))
              }}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-muted-foreground">
              Ich habe die{' '}
              <Link href="/datenschutz" className="text-[var(--brand-600)] hover:underline" target="_blank">
                Datenschutzbestimmungen
              </Link>{' '}
              gelesen und stimme der Verarbeitung meiner Daten zu. *
            </span>
          </label>
          {errors.privacyAccepted && <p className="text-xs text-destructive">{errors.privacyAccepted}</p>}
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird gesendet...
            </>
          ) : (
            'Nachricht senden'
          )}
        </Button>
      </form>
    </div>
  )
}
