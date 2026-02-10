import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Startseite
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Allgemeine Geschäftsbedingungen</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 1 Geltungsbereich</h2>
            <p className="text-muted-foreground">
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge über die Nutzung der
              XKMU Business OS Plattform, die zwischen dem Betreiber und den Nutzern geschlossen werden.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 2 Vertragsgegenstand</h2>
            <p className="text-muted-foreground">
              Der Betreiber stellt dem Nutzer eine cloudbasierte Business-Management-Plattform zur Verfügung.
              Die konkreten Leistungen ergeben sich aus der Leistungsbeschreibung und dem gewählten Tarif.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 3 Vertragsschluss und Registrierung</h2>
            <p className="text-muted-foreground">
              (1) Der Vertragsschluss erfolgt durch die Registrierung auf der Plattform.<br />
              (2) Der Nutzer muss bei der Registrierung wahrheitsgemäße Angaben machen.<br />
              (3) Der Nutzer erhält nach erfolgreicher Registrierung eine Bestätigungs-E-Mail.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 4 Nutzungsrechte</h2>
            <p className="text-muted-foreground">
              (1) Der Nutzer erhält ein nicht-exklusives, zeitlich auf die Vertragslaufzeit beschränktes
              Recht zur Nutzung der Software.<br />
              (2) Eine Weitergabe der Zugangsdaten an Dritte ist nicht gestattet.<br />
              (3) Der Nutzer darf die Software nicht reverse engineeren oder modifizieren.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 5 Datenschutz</h2>
            <p className="text-muted-foreground">
              Der Betreiber verpflichtet sich zur Einhaltung der geltenden Datenschutzbestimmungen,
              insbesondere der DSGVO. Weitere Informationen finden Sie in unserer Datenschutzerklärung.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 6 Verfügbarkeit</h2>
            <p className="text-muted-foreground">
              (1) Der Betreiber bemüht sich um eine hohe Verfügbarkeit der Plattform.<br />
              (2) Wartungsarbeiten werden nach Möglichkeit außerhalb der üblichen Geschäftszeiten durchgeführt.<br />
              (3) Ein Anspruch auf 100%ige Verfügbarkeit besteht nicht.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 7 Vergütung und Zahlungsbedingungen</h2>
            <p className="text-muted-foreground">
              (1) Die Vergütung richtet sich nach dem gewählten Tarif.<br />
              (2) Die Abrechnung erfolgt monatlich im Voraus.<br />
              (3) Bei Zahlungsverzug können Mahngebühren erhoben werden.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 8 Vertragslaufzeit und Kündigung</h2>
            <p className="text-muted-foreground">
              (1) Der Vertrag wird auf unbestimmte Zeit geschlossen.<br />
              (2) Der Vertrag kann von beiden Seiten mit einer Frist von 30 Tagen zum Monatsende gekündigt werden.<br />
              (3) Das Recht zur außerordentlichen Kündigung bleibt unberührt.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 9 Haftung</h2>
            <p className="text-muted-foreground">
              (1) Der Betreiber haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit.<br />
              (2) Bei leichter Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten.<br />
              (3) Die Haftung für Datenverlust ist auf den typischen Wiederherstellungsaufwand beschränkt.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">§ 10 Schlussbestimmungen</h2>
            <p className="text-muted-foreground">
              (1) Es gilt das Recht der Bundesrepublik Deutschland.<br />
              (2) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.<br />
              (3) Änderungen dieser AGB werden dem Nutzer per E-Mail mitgeteilt.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Stand: {new Date().toLocaleDateString('de-DE')}
          </p>
        </div>
      </div>
    </div>
  )
}
