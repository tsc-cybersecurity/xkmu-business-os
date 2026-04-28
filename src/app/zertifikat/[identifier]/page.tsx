import type { Metadata } from 'next'
import { CertificateVerifyService } from '@/lib/services/certificate-verify.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Ban, Award, ShieldX } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ identifier: string }> }

export const metadata: Metadata = {
  title: 'Zertifikats-Verifikation',
  robots: { index: false, follow: false },
}

export default async function CertificateVerifyPage({ params }: Props) {
  const { identifier } = await params
  const result = await CertificateVerifyService.verifyByIdentifier(identifier)

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {!result ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <ShieldX className="h-6 w-6 text-muted-foreground" />
                Kein gültiges Zertifikat gefunden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Die Verifikations-ID <span className="font-mono">{identifier}</span> ist
                nicht bekannt oder gehört zu einem nicht öffentlich verifizierbaren Antrag.
              </p>
            </CardContent>
          </Card>
        ) : result.status === 'issued' ? (
          <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                Zertifikat ist gültig
                <Badge variant="default" className="ml-auto">Ausgestellt</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <Award className="h-16 w-16 mx-auto text-emerald-600 dark:text-emerald-400 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Dieses Zertifikat wurde ausgestellt von
                </p>
                <p className="text-lg font-semibold mt-1">{result.organizationName}</p>
              </div>

              <dl className="grid gap-3 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">Empfänger:</dt>
                  <dd className="font-medium">{result.recipientName}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">Kurs:</dt>
                  <dd className="font-medium">{result.courseTitle}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">Ausgestellt am:</dt>
                  <dd>
                    {result.issuedAt
                      ? new Date(result.issuedAt).toLocaleDateString('de-DE', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })
                      : '—'}
                  </dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">Verifikations-ID:</dt>
                  <dd className="font-mono text-xs break-all">{result.identifier}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-300 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Ban className="h-6 w-6 text-red-600 dark:text-red-400" />
                Zertifikat wurde widerrufen
                <Badge variant="destructive" className="ml-auto">Widerrufen</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Dieses Zertifikat wurde von <strong>{result.organizationName}</strong> ausgestellt,
                ist aber zwischenzeitlich widerrufen worden und gilt als ungültig.
              </p>
              <dl className="grid gap-3 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">Ehemals für:</dt>
                  <dd>{result.recipientName}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">Kurs:</dt>
                  <dd>{result.courseTitle}</dd>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">Widerrufen am:</dt>
                  <dd>
                    {result.revokedAt
                      ? new Date(result.revokedAt).toLocaleDateString('de-DE', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })
                      : '—'}
                  </dd>
                </div>
                {result.reviewComment && (
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt className="text-muted-foreground">Begründung:</dt>
                    <dd>{result.reviewComment}</dd>
                  </div>
                )}
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">Verifikations-ID:</dt>
                  <dd className="font-mono text-xs break-all">{result.identifier}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
