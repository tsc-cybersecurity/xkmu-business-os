export default function ImpressumPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Impressum</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Angaben gemäß § 5 TMG</h2>
          <p className="text-muted-foreground">
            [Ihr Firmenname]<br />
            [Ihre Straße und Hausnummer]<br />
            [PLZ und Ort]
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Vertreten durch</h2>
          <p className="text-muted-foreground">
            [Name des Vertretungsberechtigten]
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Kontakt</h2>
          <p className="text-muted-foreground">
            Telefon: [Ihre Telefonnummer]<br />
            E-Mail: [Ihre E-Mail-Adresse]
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Umsatzsteuer-ID</h2>
          <p className="text-muted-foreground">
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
            [Ihre USt-IdNr.]
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Haftungsausschluss</h2>

          <h3 className="text-xl font-semibold mb-2 mt-4">Haftung für Inhalte</h3>
          <p className="text-muted-foreground">
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den
            allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
            zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">Haftung für Links</h3>
          <p className="text-muted-foreground">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">Urheberrecht</h3>
          <p className="text-muted-foreground">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
            deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung
            außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
            Autors bzw. Erstellers.
          </p>
        </section>
      </div>
    </div>
  )
}
