// ============================================
// E-Mail Template Service
// CRUD + Platzhalter-Ersetzung + Default-Seeding
// ============================================

import { db } from '@/lib/db'
import { emailTemplates } from '@/lib/db/schema'
import type { EmailTemplate, NewEmailTemplate } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const EmailTemplateService = {
  async list(): Promise<EmailTemplate[]> {
    return db
      .select()
      .from(emailTemplates)
      .orderBy(emailTemplates.slug)
  },

  async getBySlug(slug: string): Promise<EmailTemplate | null> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.slug, slug))
      .limit(1)
    return template ?? null
  },

  async getById(id: string): Promise<EmailTemplate | null> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1)
    return template ?? null
  },

  async create(data: {
    slug: string
    name: string
    subject: string
    bodyHtml: string
    placeholders?: unknown
  }): Promise<EmailTemplate> {
    const [template] = await db
      .insert(emailTemplates)
      .values({
        slug: data.slug,
        name: data.name,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        placeholders: data.placeholders ?? [],
      })
      .returning()
    return template
  },

  async update(id: string, data: Partial<{
    slug: string
    name: string
    subject: string
    bodyHtml: string
    placeholders: unknown
    isActive: boolean
  }>): Promise<EmailTemplate | null> {
    const updateData: Partial<NewEmailTemplate> = { updatedAt: new Date() }
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.name !== undefined) updateData.name = data.name
    if (data.subject !== undefined) updateData.subject = data.subject
    if (data.bodyHtml !== undefined) updateData.bodyHtml = data.bodyHtml
    if (data.placeholders !== undefined) updateData.placeholders = data.placeholders
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const [template] = await db
      .update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, id))
      .returning()
    return template ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .returning({ id: emailTemplates.id })
    return result.length > 0
  },

  applyPlaceholders(text: string, values: Record<string, string>): string {
    let result = text
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return result
  },

  async seed(): Promise<number> {
    let created = 0
    for (const tpl of DEFAULT_EMAIL_TEMPLATES) {
      const existing = await this.getBySlug(tpl.slug)
      if (existing) continue
      await this.create(tpl)
      created++
    }
    return created
  },
}

// ============================================
// Default Templates
// ============================================

const DEFAULT_EMAIL_TEMPLATES = [
  {
    slug: 'lead_admin_notification',
    name: 'Admin-Benachrichtigung: Neuer Lead',
    subject: 'Neuer Lead: {{name}}{{#if firma}} ({{firma}}){{/if}}',
    bodyHtml: `<p>Ein neuer Lead ist eingegangen.</p>
<ul>
  <li><strong>Name:</strong> {{name}}</li>
  <li><strong>Firma:</strong> {{firma}}</li>
  <li><strong>E-Mail:</strong> {{email}}</li>
  <li><strong>Telefon:</strong> {{telefon}}</li>
  <li><strong>Interessen:</strong> {{interessen}}</li>
</ul>
<p><strong>Nachricht:</strong><br>{{nachricht}}</p>
<p><a href="{{leadUrl}}">Lead im CRM öffnen</a></p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Leads' },
      { key: 'firma', label: 'Firma', description: 'Firma des Leads' },
      { key: 'email', label: 'E-Mail', description: 'E-Mail des Leads' },
      { key: 'telefon', label: 'Telefon', description: 'Telefonnummer des Leads' },
      { key: 'interessen', label: 'Interessen', description: 'Ausgewählte Interessen' },
      { key: 'nachricht', label: 'Nachricht', description: 'Freitext-Nachricht' },
      { key: 'leadUrl', label: 'Lead-URL', description: 'Pfad zum Lead im CRM' },
    ],
  },
  {
    slug: 'portal_invite',
    name: 'Portal: Einladungs-Link',
    subject: 'Ihr Zugang zum Kundenportal von {{firma}}',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>Sie wurden als Zugang zum Kundenportal von <strong>{{firma}}</strong> angelegt. Klicken Sie auf den folgenden Link, um Ihr Passwort festzulegen und den Zugang zu aktivieren. Der Link ist 7 Tage gültig.</p>
<p><a href="{{inviteUrl}}">Zugang aktivieren</a></p>
<p>Mit freundlichen Grüßen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Portal-Nutzers' },
      { key: 'firma', label: 'Firma', description: 'Name der Firma' },
      { key: 'inviteUrl', label: 'Einladungs-Link', description: 'Vollständige URL mit Token' },
      { key: 'absender', label: 'Absender', description: 'Name des einladenden Admins' },
    ],
  },
  {
    slug: 'portal_document_shared',
    name: 'Portal: Neues Dokument für Sie',
    subject: 'Neues Dokument im Kundenportal von {{firma}}',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>Im Kundenportal von <strong>{{firma}}</strong> wurde ein neues Dokument für Sie bereitgestellt:</p>
<p><strong>{{fileName}}</strong></p>
<p><a href="{{portalUrl}}">Zum Dokument im Portal</a></p>
<p>Mit freundlichen Grüßen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Portal-Nutzers' },
      { key: 'firma', label: 'Firma', description: 'Name der Firma' },
      { key: 'fileName', label: 'Datei', description: 'Dateiname des Dokuments' },
      { key: 'portalUrl', label: 'Portal-Link', description: 'Direkt-Link zur Dokumenten-Seite' },
      { key: 'absender', label: 'Absender', description: 'Absender-Name (Organisation)' },
    ],
  },
  {
    slug: 'portal_document_received',
    name: 'Portal: Kunde hat Dokument hochgeladen',
    subject: 'Neues Dokument von {{firma}} erhalten',
    bodyHtml: `<p>Hallo {{empfaenger}},</p>
<p>Von der Firma <strong>{{firma}}</strong> wurde ein neues Dokument im Kundenportal hochgeladen:</p>
<p><strong>{{fileName}}</strong></p>
<p><a href="{{adminUrl}}">In Admin-Oberfläche ansehen</a></p>
<p>Mit freundlichen Grüßen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'empfaenger', label: 'Empfänger', description: 'Name des internen Empfängers' },
      { key: 'firma', label: 'Firma', description: 'Name der sendenden Firma' },
      { key: 'fileName', label: 'Datei', description: 'Dateiname des Dokuments' },
      { key: 'adminUrl', label: 'Admin-Link', description: 'Link zum Dokumente-Tab auf der Firma' },
      { key: 'absender', label: 'Absender', description: 'System-Absender-Name' },
    ],
  },
  {
    slug: 'portal_change_request_admin',
    name: 'Portal: Neuer Firmendaten-Antrag',
    subject: 'Neuer Firmendaten-Antrag von {{kunde}} ({{firma}})',
    bodyHtml: `<p>Hallo,</p>
<p>ein Portal-Nutzer hat Änderungen an den Firmendaten von <strong>{{firma}}</strong> beantragt.</p>
<p><strong>Antragsteller:</strong> {{kunde}}<br>
<strong>Eingereicht am:</strong> {{datum}}</p>
<p>Vorgeschlagene Änderungen:</p>
<pre>{{aenderungen}}</pre>
<p><a href="{{pruefUrl}}">Antrag im Admin-Bereich prüfen</a></p>`,
    placeholders: [
      { key: 'kunde', label: 'Kunde', description: 'Name des Portal-Nutzers' },
      { key: 'firma', label: 'Firma', description: 'Firmenname' },
      { key: 'datum', label: 'Datum', description: 'Antragsdatum' },
      { key: 'aenderungen', label: 'Änderungen', description: 'Liste der geänderten Felder (Text)' },
      { key: 'pruefUrl', label: 'Prüf-URL', description: 'Link zur Admin-Review-Seite' },
    ],
  },
  {
    slug: 'portal_change_request_decision',
    name: 'Portal: Entscheidung zu Ihrem Antrag',
    subject: 'Ihr Firmendaten-Antrag wurde {{entscheidung}}',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>Ihr Antrag auf Änderung der Firmendaten von <strong>{{firma}}</strong> vom {{datum}} wurde <strong>{{entscheidung}}</strong>.</p>
{{kommentarBlock}}
<p><a href="{{portalUrl}}">Zum Kundenportal</a></p>
<p>Mit freundlichen Grüßen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Portal-Nutzers' },
      { key: 'firma', label: 'Firma', description: 'Firmenname' },
      { key: 'datum', label: 'Datum', description: 'Antragsdatum' },
      { key: 'entscheidung', label: 'Entscheidung', description: 'genehmigt oder abgelehnt' },
      { key: 'kommentarBlock', label: 'Kommentar-Block', description: 'Vorformatierter HTML-Block mit Admin-Kommentar (leer bei Genehmigung)' },
      { key: 'portalUrl', label: 'Portal-URL', description: 'Link zum Kundenportal' },
      { key: 'absender', label: 'Absender', description: 'Absender-Name' },
    ],
  },
  {
    slug: 'portal_order_created_admin',
    name: 'Portal: Neuer Auftrag',
    subject: 'Neuer Auftrag: {{titel}} von {{kunde}} ({{firma}})',
    bodyHtml: `<p>Hallo,</p>
<p>ein Portal-Nutzer hat einen neuen Auftrag eingereicht.</p>
<p><strong>Kunde:</strong> {{kunde}}<br>
<strong>Firma:</strong> {{firma}}<br>
<strong>Kategorie:</strong> {{kategorie}}<br>
<strong>Titel:</strong> {{titel}}<br>
<strong>Priorität:</strong> {{prioritaet}}</p>
<p><a href="{{pruefUrl}}">Auftrag im Admin-Bereich prüfen</a></p>`,
    placeholders: [
      { key: 'kunde', label: 'Kunde', description: 'E-Mail des einreichenden Portal-Nutzers' },
      { key: 'firma', label: 'Firma', description: 'Firmenname' },
      { key: 'kategorie', label: 'Kategorie', description: 'Name der Auftrags-Kategorie' },
      { key: 'titel', label: 'Titel', description: 'Titel des Auftrags' },
      { key: 'prioritaet', label: 'Priorität', description: 'Priorität des Auftrags' },
      { key: 'pruefUrl', label: 'Prüf-URL', description: 'Link zur Admin-Detail-Ansicht' },
    ],
  },
  {
    slug: 'portal_order_status_changed',
    name: 'Portal: Auftrags-Status geändert',
    subject: 'Ihr Auftrag "{{titel}}" ist jetzt {{statusNeu}}',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>der Status Ihres Auftrags <strong>{{titel}}</strong> von <strong>{{firma}}</strong> hat sich geändert.</p>
<p><strong>Neuer Status:</strong> {{statusNeu}}<br>
<strong>Vorheriger Status:</strong> {{statusAlt}}</p>
{{rejectReasonBlock}}
<p><a href="{{portalUrl}}">Auftrag im Kundenportal öffnen</a></p>
<p>Mit freundlichen Grüßen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Portal-Nutzers' },
      { key: 'firma', label: 'Firma', description: 'Firmenname' },
      { key: 'titel', label: 'Titel', description: 'Titel des Auftrags' },
      { key: 'statusAlt', label: 'Status alt', description: 'Vorheriger Status (deutsch)' },
      { key: 'statusNeu', label: 'Status neu', description: 'Neuer Status (deutsch)' },
      { key: 'rejectReasonBlock', label: 'Ablehnungsgrund-Block', description: 'Vorformatierter HTML-Block mit Begründung (leer bei anderen Status)' },
      { key: 'portalUrl', label: 'Portal-URL', description: 'Link zum Portal-Detail' },
      { key: 'absender', label: 'Absender', description: 'Absender-Name' },
    ],
  },
  {
    slug: 'lead_first_response',
    name: 'Erstantwort auf Anfrage',
    subject: 'Vielen Dank fuer Ihre Anfrage, {{name}}!',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>vielen Dank fuer Ihre Anfrage bei {{firma}}. Wir haben Ihre Nachricht erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.</p>
<p>Moechten Sie direkt einen Termin vereinbaren? <a href="{{calendlyLink}}">Hier klicken</a></p>
<p>Mit freundlichen Gruessen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Anfragenden' },
      { key: 'firma', label: 'Unsere Firma', description: 'Eigener Firmenname' },
      { key: 'calendlyLink', label: 'Terminbuchung', description: 'Link zur Terminbuchung' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'offer_send',
    name: 'Angebot versenden',
    subject: 'Ihr Angebot {{angebotNr}} von {{firma}}',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>anbei erhalten Sie unser Angebot <strong>{{angebotNr}}</strong> ueber <strong>{{betrag}}</strong>.</p>
<p>Das Angebot ist gueltig bis zum {{gueltigBis}}.</p>
<p>Bei Fragen stehen wir Ihnen gerne zur Verfuegung.</p>
<p>Mit freundlichen Gruessen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Empfaenger', description: 'Name des Empfaengers' },
      { key: 'angebotNr', label: 'Angebotsnr.', description: 'Angebotsnummer' },
      { key: 'betrag', label: 'Betrag', description: 'Angebotsbetrag' },
      { key: 'gueltigBis', label: 'Gueltig bis', description: 'Gueltigkeitsdatum' },
      { key: 'firma', label: 'Firma', description: 'Eigener Firmenname' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'follow_up_offer',
    name: 'Angebot Follow-up',
    subject: 'Kurze Rueckfrage zu Angebot {{angebotNr}}',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>vor einigen Tagen haben wir Ihnen unser Angebot <strong>{{angebotNr}}</strong> zugesendet. Haben Sie Fragen dazu oder moechten Sie bestimmte Punkte besprechen?</p>
<p>Ich freue mich auf Ihre Rueckmeldung.</p>
<p>Viele Gruesse<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Empfaenger', description: 'Name des Empfaengers' },
      { key: 'angebotNr', label: 'Angebotsnr.', description: 'Angebotsnummer' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'welcome',
    name: 'Willkommen / Onboarding',
    subject: 'Willkommen bei {{firma}}, {{name}}!',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>herzlich willkommen! Wir freuen uns auf die Zusammenarbeit mit Ihnen.</p>
<p>Als naechstes planen wir einen Kick-off-Termin. <a href="{{calendlyLink}}">Hier koennen Sie direkt einen Termin buchen</a>.</p>
<p>Mit freundlichen Gruessen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Kunden' },
      { key: 'firma', label: 'Firma', description: 'Eigener Firmenname' },
      { key: 'calendlyLink', label: 'Terminbuchung', description: 'Calendly-Link' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'reminder_7d',
    name: 'Zahlungserinnerung (7 Tage)',
    subject: 'Erinnerung: Rechnung {{rechnungNr}} faellig',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>wir moechten Sie freundlich daran erinnern, dass die Rechnung <strong>{{rechnungNr}}</strong> ueber <strong>{{betrag}}</strong> seit dem {{faelligAm}} faellig ist.</p>
<p>Falls die Zahlung bereits unterwegs ist, betrachten Sie diese Nachricht bitte als gegenstandslos.</p>
<p>Mit freundlichen Gruessen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Empfaenger', description: 'Name des Rechnungsempfaengers' },
      { key: 'rechnungNr', label: 'Rechnungsnr.', description: 'Rechnungsnummer' },
      { key: 'betrag', label: 'Betrag', description: 'Offener Betrag' },
      { key: 'faelligAm', label: 'Faellig am', description: 'Faelligkeitsdatum' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'dunning_14d',
    name: 'Erste Mahnung (14 Tage)',
    subject: 'Mahnung: Rechnung {{rechnungNr}}',
    bodyHtml: `<p>Sehr geehrte/r {{name}},</p>
<p>trotz unserer Erinnerung konnten wir leider keinen Zahlungseingang fuer die Rechnung <strong>{{rechnungNr}}</strong> ueber <strong>{{betrag}}</strong> (faellig am {{faelligAm}}) feststellen.</p>
<p>Wir bitten Sie, den offenen Betrag innerhalb von 7 Tagen zu ueberweisen.</p>
<p>Sollte die Zahlung bereits erfolgt sein, bitten wir um kurze Rueckmeldung.</p>
<p>Mit freundlichen Gruessen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Empfaenger', description: 'Name' },
      { key: 'rechnungNr', label: 'Rechnungsnr.', description: 'Rechnungsnummer' },
      { key: 'betrag', label: 'Betrag', description: 'Offener Betrag' },
      { key: 'faelligAm', label: 'Faellig am', description: 'Faelligkeitsdatum' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'dunning_21d',
    name: 'Zweite Mahnung (21 Tage)',
    subject: 'Letzte Mahnung: Rechnung {{rechnungNr}}',
    bodyHtml: `<p>Sehr geehrte/r {{name}},</p>
<p>leider ist die Rechnung <strong>{{rechnungNr}}</strong> ueber <strong>{{betrag}}</strong> trotz Mahnung weiterhin unbezahlt.</p>
<p>Wir bitten Sie dringend, den Betrag innerhalb von 5 Werktagen zu begleichen. Andernfalls muessen wir weitere Schritte einleiten.</p>
<p>Fuer Rueckfragen stehen wir unter {{telefon}} zur Verfuegung.</p>
<p>Mit freundlichen Gruessen<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Empfaenger', description: 'Name' },
      { key: 'rechnungNr', label: 'Rechnungsnr.', description: 'Rechnungsnummer' },
      { key: 'betrag', label: 'Betrag', description: 'Offener Betrag' },
      { key: 'telefon', label: 'Telefon', description: 'Eigene Telefonnummer' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'testimonial_request',
    name: 'Testimonial-Anfrage',
    subject: 'Duerfen wir Sie zitieren, {{name}}?',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>wir hoffen, Sie sind zufrieden mit unserer Zusammenarbeit! Wuerden Sie uns ein kurzes Feedback geben, das wir auf unserer Website verwenden duerfen?</p>
<p>2-3 Saetze genuegen — z.B. was Ihnen besonders gefallen hat oder welches Ergebnis wir gemeinsam erreicht haben.</p>
<p>Alternativ freuen wir uns auch ueber eine <a href="{{bewertungsLink}}">Google-Bewertung</a>.</p>
<p>Vielen Dank im Voraus!<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Kunden' },
      { key: 'bewertungsLink', label: 'Bewertungs-Link', description: 'Google-Bewertungs-URL' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'birthday',
    name: 'Geburtstagsgruss',
    subject: 'Alles Gute zum Geburtstag, {{name}}!',
    bodyHtml: `<p>Liebe/r {{name}},</p>
<p>wir wuenschen Ihnen alles Gute zum Geburtstag! 🎂</p>
<p>Wir freuen uns auf die weitere Zusammenarbeit.</p>
<p>Herzliche Gruesse<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name der Person' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'christmas',
    name: 'Weihnachtsgruss',
    subject: 'Frohe Weihnachten, {{name}}!',
    bodyHtml: `<p>Liebe/r {{name}},</p>
<p>wir wuenschen Ihnen frohe Weihnachten und einen guten Rutsch ins neue Jahr!</p>
<p>Vielen Dank fuer die Zusammenarbeit in {{jahr}} — wir freuen uns auf {{naechstesJahr}}.</p>
<p>Herzliche Gruesse<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name der Person' },
      { key: 'jahr', label: 'Jahr', description: 'Aktuelles Jahr' },
      { key: 'naechstesJahr', label: 'Naechstes Jahr', description: 'Folgendes Jahr' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'after_sales_6w',
    name: 'After-Sales Follow-up (6 Wochen)',
    subject: 'Wie laeuft es, {{name}}?',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>unser gemeinsames Projekt ist nun einige Wochen her. Wie laeuft es? Gibt es Fragen oder Themen, bei denen wir Sie unterstuetzen koennen?</p>
<p>Wir freuen uns ueber Ihre Rueckmeldung.</p>
<p>Viele Gruesse<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Kunden' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
  {
    slug: 'meeting_invite',
    name: 'Termineinladung',
    subject: 'Terminvorschlag: {{betreff}}',
    bodyHtml: `<p>Hallo {{name}},</p>
<p>gerne moechte ich einen Termin mit Ihnen vereinbaren zum Thema: <strong>{{betreff}}</strong></p>
<p><a href="{{calendlyLink}}">Hier koennen Sie einen passenden Termin waehlen</a></p>
<p>Viele Gruesse<br>{{absender}}</p>`,
    placeholders: [
      { key: 'name', label: 'Name', description: 'Name des Empfaengers' },
      { key: 'betreff', label: 'Betreff', description: 'Thema des Termins' },
      { key: 'calendlyLink', label: 'Terminbuchung', description: 'Calendly-Link' },
      { key: 'absender', label: 'Absender', description: 'Name des Absenders' },
    ],
  },
]
