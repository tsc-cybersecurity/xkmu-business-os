import { Shield, Construction } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function BasisabsicherungPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Basisabsicherung</h1>
        <p className="text-muted-foreground">
          IT-Grundschutz und Basisabsicherung fuer Ihr Unternehmen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="rounded-full bg-amber-500/10 p-3">
              <Construction className="h-6 w-6 text-amber-500" />
            </div>
            In Entwicklung
            <Badge variant="secondary">Coming Soon</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Das Modul Basisabsicherung befindet sich derzeit in der Entwicklung.
            Es wird Ihnen helfen, die grundlegenden IT-Sicherheitsmassnahmen fuer Ihr
            Unternehmen systematisch umzusetzen.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Checklisten</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Strukturierte Checklisten basierend auf dem BSI IT-Grundschutz
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">Massnahmenplan</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatische Erstellung eines Massnahmenplans mit Priorisierung
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Fortschritt</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Umsetzungsfortschritt verfolgen und dokumentieren
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
