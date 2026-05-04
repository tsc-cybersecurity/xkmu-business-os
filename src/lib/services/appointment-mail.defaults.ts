// src/lib/services/appointment-mail.defaults.ts
//
// System-Default-Texte für alle appointment.* Email-Templates.
// Diese werden idempotent in `email_templates` geseedet. User kann sie
// danach via /intern/inbox/templates editieren.

export interface AppointmentTemplateDefault {
  slug: string
  subject: string
  bodyHtml: string
  variables: { key: string; label: string }[]
}

const SHARED_VARIABLES = [
  { key: 'customer.name', label: 'Kunde Name' },
  { key: 'customer.email', label: 'Kunde E-Mail' },
  { key: 'customer.phone', label: 'Kunde Telefon' },
  { key: 'slot.type_name', label: 'Termin-Art' },
  { key: 'slot.duration_minutes', label: 'Dauer (min)' },
  { key: 'slot.location', label: 'Ort/Form' },
  { key: 'slot.location_details', label: 'Ort-Details' },
  { key: 'appointment.start_local', label: 'Start (lokal)' },
  { key: 'appointment.end_local', label: 'Ende (lokal)' },
  { key: 'appointment.timezone', label: 'Zeitzone' },
  { key: 'appointment.message', label: 'Kunde Nachricht' },
  { key: 'links.cancel_url', label: 'Storno-Link' },
  { key: 'links.reschedule_url', label: 'Umbuchungs-Link' },
  { key: 'org.name', label: 'Organisation' },
]

export const APPOINTMENT_TEMPLATES: AppointmentTemplateDefault[] = [
  {
    slug: 'appointment.customer.confirmation',
    subject: 'Ihre Terminbuchung am {{appointment.start_local}}',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>vielen Dank für Ihre Buchung. Hier die Details:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} (Zeitzone: {{appointment.timezone}})</li>
  <li><strong>Dauer:</strong> {{slot.duration_minutes}} Minuten</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Sie können den Termin <a href="{{links.reschedule_url}}">umbuchen</a> oder <a href="{{links.cancel_url}}">stornieren</a>, falls erforderlich.</p>
<p>Bis bald,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.staff.notification',
    subject: 'Neuer Termin: {{slot.type_name}} mit {{customer.name}} am {{appointment.start_local}}',
    bodyHtml: `<p>Neue Buchung:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}}, {{customer.phone}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}}</li>
  <li><strong>Nachricht:</strong> {{appointment.message}}</li>
</ul>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.customer.reminder_24h',
    subject: 'Erinnerung: Termin morgen um {{appointment.start_local}}',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>nur eine kurze Erinnerung an Ihren Termin morgen:</p>
<ul>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Datum/Uhrzeit:</strong> {{appointment.start_local}} ({{appointment.timezone}})</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Falls Sie nicht teilnehmen können: <a href="{{links.cancel_url}}">stornieren</a> oder <a href="{{links.reschedule_url}}">umbuchen</a>.</p>
<p>Bis morgen,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.customer.reminder_1h',
    subject: 'Ihr Termin in einer Stunde',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> beginnt in einer Stunde um {{appointment.start_local}}.</p>
<p>Ort/Form: {{slot.location}}{{slot.location_details}}</p>
<p>Bis gleich,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.customer.cancelled',
    subject: 'Ihr Termin am {{appointment.start_local}} wurde storniert',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> am {{appointment.start_local}} wurde storniert.</p>
<p>Falls Sie einen neuen Termin möchten, buchen Sie gerne wieder über unsere Website.</p>
<p>Viele Grüße,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.customer.rescheduled',
    subject: 'Ihr Termin wurde verschoben — neuer Termin: {{appointment.start_local}}',
    bodyHtml: `<p>Hallo {{customer.name}},</p>
<p>Ihr Termin <strong>{{slot.type_name}}</strong> wurde verschoben:</p>
<ul>
  <li><strong>Neuer Termin:</strong> {{appointment.start_local}} ({{appointment.timezone}})</li>
  <li><strong>Dauer:</strong> {{slot.duration_minutes}} Minuten</li>
  <li><strong>Ort/Form:</strong> {{slot.location}}{{slot.location_details}}</li>
</ul>
<p>Sie können den neuen Termin weiterhin <a href="{{links.reschedule_url}}">umbuchen</a> oder <a href="{{links.cancel_url}}">stornieren</a>.</p>
<p>Viele Grüße,<br>{{org.name}}</p>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.staff.cancelled',
    subject: 'Termin storniert: {{slot.type_name}} mit {{customer.name}} am {{appointment.start_local}}',
    bodyHtml: `<p>Storniert:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Original-Datum:</strong> {{appointment.start_local}}</li>
</ul>`,
    variables: SHARED_VARIABLES,
  },
  {
    slug: 'appointment.staff.rescheduled',
    subject: 'Termin verschoben: {{slot.type_name}} mit {{customer.name}} → {{appointment.start_local}}',
    bodyHtml: `<p>Verschoben:</p>
<ul>
  <li><strong>Kunde:</strong> {{customer.name}} ({{customer.email}})</li>
  <li><strong>Termin-Art:</strong> {{slot.type_name}}</li>
  <li><strong>Neuer Termin:</strong> {{appointment.start_local}}</li>
</ul>`,
    variables: SHARED_VARIABLES,
  },
]
