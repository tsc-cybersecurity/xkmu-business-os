import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Startseite
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Kontakt</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Mail className="h-8 w-8 text-primary mb-2" />
              <CardTitle>E-Mail</CardTitle>
              <CardDescription>
                Schreiben Sie uns eine E-Mail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:info@example.com" className="text-primary hover:underline">
                info@example.com
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Phone className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Telefon</CardTitle>
              <CardDescription>
                Rufen Sie uns an
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="tel:+4912345678" className="text-primary hover:underline">
                +49 (0) 123 456 78
              </a>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <MapPin className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Adresse</CardTitle>
              <CardDescription>
                Besuchen Sie uns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                [Ihr Firmenname]<br />
                [Straße und Hausnummer]<br />
                [PLZ und Ort]<br />
                Deutschland
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 p-6 rounded-lg bg-muted/50 border">
          <h2 className="text-2xl font-semibold mb-4">Support</h2>
          <p className="text-muted-foreground mb-4">
            Für technischen Support und Fragen zur Plattform stehen wir Ihnen gerne zur Verfügung:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li>• <strong>Support-E-Mail:</strong> support@example.com</li>
            <li>• <strong>Öffnungszeiten:</strong> Montag - Freitag, 9:00 - 17:00 Uhr</li>
            <li>• <strong>API-Dokumentation:</strong> <Link href="/api-docs" className="text-primary hover:underline">/api-docs</Link></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
