export default function DatenschutzPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Datenschutzerklärung</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Datenschutz auf einen Blick</h2>

          <h3 className="text-xl font-semibold mb-2 mt-4">Allgemeine Hinweise</h3>
          <p className="text-muted-foreground">
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
            passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie
            persönlich identifiziert werden können.
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">Datenerfassung auf dieser Website</h3>
          <p className="text-muted-foreground">
            <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten
            können Sie dem Impressum dieser Website entnehmen.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Hosting</h2>
          <p className="text-muted-foreground">
            Wir hosten die Inhalte unserer Website bei folgendem Anbieter:
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">Externes Hosting</h3>
          <p className="text-muted-foreground">
            Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden,
            werden auf den Servern des Hosters / der Hoster gespeichert. Hierbei kann es sich v. a. um IP-Adressen,
            Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe
            und sonstige Daten, die über eine Website generiert werden, handeln.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Allgemeine Hinweise und Pflichtinformationen</h2>

          <h3 className="text-xl font-semibold mb-2 mt-4">Datenschutz</h3>
          <p className="text-muted-foreground">
            Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre
            personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie
            dieser Datenschutzerklärung.
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">SSL- bzw. TLS-Verschlüsselung</h3>
          <p className="text-muted-foreground">
            Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine
            SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile
            des Browsers von &bdquo;http://&ldquo; auf &bdquo;https://&ldquo; wechselt.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Datenerfassung auf dieser Website</h2>

          <h3 className="text-xl font-semibold mb-2 mt-4">Cookies</h3>
          <p className="text-muted-foreground">
            Unsere Internetseiten verwenden Cookies. Cookies sind kleine Textdateien und richten auf Ihrem Endgerät
            keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder
            dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">Server-Log-Dateien</h3>
          <p className="text-muted-foreground">
            Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien,
            die Ihr Browser automatisch an uns übermittelt. Dies sind:
          </p>
          <ul className="list-disc list-inside text-muted-foreground ml-4">
            <li>Browsertyp und Browserversion</li>
            <li>verwendetes Betriebssystem</li>
            <li>Referrer URL</li>
            <li>Hostname des zugreifenden Rechners</li>
            <li>Uhrzeit der Serveranfrage</li>
            <li>IP-Adresse</li>
          </ul>

          <h3 className="text-xl font-semibold mb-2 mt-4">Kontaktformular</h3>
          <p className="text-muted-foreground">
            Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular
            inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall
            von Anschlussfragen bei uns gespeichert.
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">Registrierung auf dieser Website</h3>
          <p className="text-muted-foreground">
            Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen auf der Seite zu nutzen.
            Die dazu eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des jeweiligen Angebotes oder
            Dienstes, für den Sie sich registriert haben.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Ihre Rechte</h2>
          <p className="text-muted-foreground">
            Sie haben jederzeit das Recht:
          </p>
          <ul className="list-disc list-inside text-muted-foreground ml-4">
            <li>Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten zu verlangen</li>
            <li>die Berichtigung, Löschung oder Einschränkung der Verarbeitung zu verlangen</li>
            <li>der Verarbeitung zu widersprechen</li>
            <li>die Datenübertragbarkeit zu verlangen</li>
            <li>eine erteilte Einwilligung zu widerrufen</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Datenübermittlung bei Vertragsschluss</h2>
          <p className="text-muted-foreground">
            Wir übermitteln personenbezogene Daten an Dritte nur dann, wenn dies im Rahmen der Vertragsabwicklung
            notwendig ist, etwa an das mit der Zahlungsabwicklung beauftragte Kreditinstitut.
          </p>
        </section>

        <p className="text-sm text-muted-foreground mt-8">
          Stand: {new Date().toLocaleDateString('de-DE')}
        </p>
      </div>
    </div>
  )
}
