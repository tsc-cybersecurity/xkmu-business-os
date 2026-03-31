import Link from 'next/link'
import { Shield, ClipboardCheck, Award, ShieldCheck, Server, FileWarning } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CybersecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cybersecurity</h1>
        <p className="text-muted-foreground">
          IT-Sicherheit fuer Ihr Unternehmen - Audits, Checklisten und Massnahmen
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/intern/cybersecurity/grundschutz">
          <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-500/10 p-3">
                  <ShieldCheck className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="text-lg">Grundschutz++</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Erweiterte Basisabsicherung nach BSI-Grundschutz mit massgeschneiderten Checklisten.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intern/cybersecurity/grundschutz/assets">
          <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-teal-500/10 p-3">
                  <Server className="h-6 w-6 text-teal-500" />
                </div>
                <CardTitle className="text-lg">GS++ Assets</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                IT-Assets erfassen und verwalten fuer die Grundschutz-Analyse.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intern/cybersecurity/ir-playbook">
          <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-500/10 p-3">
                  <FileWarning className="h-6 w-6 text-red-500" />
                </div>
                <CardTitle className="text-lg">IR Playbook</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Incident-Response-Playbooks fuer strukturierte Reaktion auf Sicherheitsvorfaelle.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intern/din-audit">
          <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/10 p-3">
                  <ClipboardCheck className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-lg">DIN SPEC 27076</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                IT-Sicherheitsaudits nach DIN SPEC 27076 fuer KMU durchfuehren und verwalten.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intern/din-audit/grants">
          <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/10 p-3">
                  <Award className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-lg">Fördermittel</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Foerderprogramme fuer IT-Sicherheit in kleinen und mittleren Unternehmen.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intern/wiba">
          <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-500/10 p-3">
                  <Shield className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle className="text-lg">BSI WiBA-Checks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                BSI Weg in die Basis-Absicherung (WiBA) - 257 Prueffragen in 19 Kategorien fuer grundlegende IT-Sicherheit.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
