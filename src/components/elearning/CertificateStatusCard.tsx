'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Award, CheckCircle2, Clock, XCircle, Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Certificate {
  id: string
  identifier: string
  status: 'requested' | 'issued' | 'rejected' | string
  requestedAt: string | Date
  issuedAt: string | Date | null
  reviewComment: string | null
}

interface Props {
  courseId: string
  certificate: Certificate | null
  eligibleForRequest: boolean
}

export function CertificateStatusCard({ courseId, certificate, eligibleForRequest }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [, startTransition] = useTransition()

  async function requestCertificate() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/portal/courses/${courseId}/certificate/request`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error?.message ?? 'Anfrage fehlgeschlagen')
        return
      }
      toast.success('Zertifikat angefordert')
      startTransition(() => router.refresh())
    } catch (err) {
      logger.error('Certificate request failed', err, { module: 'CertificateStatusCard' })
      toast.error('Anfrage fehlgeschlagen')
    } finally {
      setSubmitting(false)
    }
  }

  // No certificate yet AND not yet eligible → render nothing (keep player clean)
  if (!certificate && !eligibleForRequest) return null

  if (!certificate && eligibleForRequest) {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary" />
            Zertifikat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Du hast alle Lektionen abgeschlossen. Beantrage jetzt dein Zertifikat —
            ein Admin prüft den Antrag und stellt es aus.
          </p>
          <Button onClick={requestCertificate} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zertifikat anfordern
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (certificate?.status === 'requested') {
    return (
      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Zertifikat — Antrag in Bearbeitung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Dein Zertifikats-Antrag wurde am{' '}
            <strong>{new Date(certificate.requestedAt).toLocaleDateString('de-DE')}</strong>{' '}
            eingereicht und wird gerade von einem Admin geprüft.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (certificate?.status === 'issued') {
    return (
      <Card className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Zertifikat ausgestellt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Glückwunsch! Dein Zertifikat wurde am{' '}
            <strong>
              {certificate.issuedAt
                ? new Date(certificate.issuedAt).toLocaleDateString('de-DE')
                : 'unbekannt'}
            </strong>{' '}
            ausgestellt.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            Verifikations-ID: {certificate.identifier}
          </p>
          <Button asChild size="sm">
            <a
              href={`/api/v1/portal/courses/${courseId}/certificate/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-2 h-4 w-4" />
              Zertifikat herunterladen (PDF)
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (certificate?.status === 'rejected') {
    return (
      <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            Zertifikats-Antrag abgelehnt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {certificate.reviewComment && (
            <p className="text-sm">
              <span className="text-muted-foreground">Begründung: </span>
              {certificate.reviewComment}
            </p>
          )}
          {eligibleForRequest && (
            <Button onClick={requestCertificate} disabled={submitting} variant="outline" size="sm">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erneut anfordern
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}
