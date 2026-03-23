# xKMU BusinessOS — Masterplan Programmierauftraege

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 48 Programmieranforderungen aus der Prozessanalyse umsetzen — alle Funktionen nativ in der App, keine externen Tools.

**Architecture:** Phasenweise Implementierung mit geteilter Infrastruktur (Task-Queue, E-Mail-Service) als Fundament. Jede Phase baut auf der vorherigen auf. Task-Queue-Tabelle ersetzt Cron-Jobs — Tasks werden in DB gequeued und per Button oder Batch ausgefuehrt.

**Tech Stack:** Next.js 16, React 19, PostgreSQL, Drizzle ORM, Tailwind CSS, shadcn/ui, nodemailer (bereits vorhanden), jspdf (bereits vorhanden)

**Keine externen Tools** — alles nativ. Wo externe APIs als Datenquelle noetig sind (z.B. SMTP fuer E-Mail-Versand), wird das explizit vermerkt.

---

## Phasenuebersicht

| Phase | Thema | Tasks | Abhaengigkeit |
|-------|-------|-------|---------------|
| 0 | Infrastruktur: Task-Queue + E-Mail | 2 | — |
| 1 | CRM & Vertrieb | 8 | Phase 0 |
| 2 | Finance & Abrechnung | 7 | Phase 0 |
| 3 | Content & Marketing | 7 | Phase 0 |
| 4 | Projekt-Modul (Kanban) | 3 | — |
| 5 | Dokument-Generator & Security-Docs | 7 | — |
| 6 | After-Sales & Kundenbindung | 5 | Phase 0, 1 |
| 7 | Dashboards & Advanced | 7 | Phase 1, 2 |

---

## Phase 0: Infrastruktur

### Task 0.1: Task-Queue-System (Ersetzt Cron)

**Abdeckt:** Grundlage fuer KP2-10, KP4-05, KP4-06, KP5-04, KP5-06 und alle automatisierten Ablaeufe

**Files:**
- Create: `src/lib/db/schema.ts` — `taskQueue` Tabelle ergaenzen
- Create: `src/lib/services/task-queue.service.ts`
- Create: `src/app/api/v1/task-queue/route.ts` — GET (list), POST (create)
- Create: `src/app/api/v1/task-queue/execute/route.ts` — POST (ausfuehren)
- Create: `src/app/api/v1/task-queue/[id]/route.ts` — PUT, DELETE
- Create: `src/app/intern/(dashboard)/settings/task-queue/page.tsx`
- Create: Drizzle Migration

**DB-Schema `task_queue`:**
```sql
id              uuid PK
tenant_id       uuid FK tenants
type            varchar(50)     -- 'email', 'reminder', 'follow_up', 'dunning', 'report'
status          varchar(20)     -- 'pending', 'running', 'completed', 'failed', 'cancelled'
priority        integer         -- 1=hoch, 2=mittel, 3=niedrig
payload         jsonb           -- Aufgabenspezifische Daten
result          jsonb           -- Ergebnis nach Ausfuehrung
error           text            -- Fehlermeldung bei Failure
scheduled_for   timestamp       -- Fruehester Ausfuehrungszeitpunkt
executed_at     timestamp
created_at      timestamp
updated_at      timestamp
reference_type  varchar(50)     -- 'lead', 'invoice', 'person', 'company'
reference_id    uuid            -- Verknuepfung zum Quell-Objekt
```

**Indexes:** `(tenant_id, status)`, `(tenant_id, scheduled_for)`, `(tenant_id, type)`

- [ ] Schema + Migration erstellen
- [ ] TaskQueueService: create, list (mit Filter status/type/scheduled), execute(id), executeBatch(ids[]), cancel(id)
- [ ] execute() Methode: Switch auf type, ruft den passenden Handler auf (z.B. EmailHandler, ReminderHandler)
- [ ] API-Routes: GET list mit ?status=pending&type=email, POST create, POST execute (einzeln oder batch), DELETE
- [ ] UI: Settings > Task-Queue Seite — Tabelle mit Filter (Status, Typ), Checkboxen, "Ausgewaehlte ausfuehren" und "Alle ausfuehren" Buttons
- [ ] Commit

---

### Task 0.2: E-Mail-Service erweitern

**Abdeckt:** KP2-03, KP2-09, KP2-10, KP2-12, KP4-05, KP4-06, KP5-03, KP5-04, KP5-06

**Files:**
- Modify: `src/lib/services/email.service.ts` — Template-System, Attachment-Support
- Create: `src/lib/db/schema.ts` — `email_templates` Tabelle
- Create: `src/lib/services/email-template.service.ts`
- Create: `src/app/api/v1/email-templates/route.ts`
- Create: `src/app/intern/(dashboard)/settings/email-templates/page.tsx`
- Create: Drizzle Migration

**DB-Schema `email_templates`:**
```sql
id              uuid PK
tenant_id       uuid FK tenants
slug            varchar(100)    -- 'welcome', 'offer', 'reminder', 'dunning_1', 'testimonial', 'birthday'
name            varchar(255)
subject         varchar(500)    -- Mit {{platzhalter}}
body_html       text            -- HTML mit {{platzhalter}}
placeholders    jsonb           -- [{key, label, description}]
is_active       boolean
created_at      timestamp
updated_at      timestamp
```

- [ ] Schema + Migration
- [ ] EmailTemplateService: CRUD + getBySlug + applyPlaceholders
- [ ] EmailService erweitern: sendWithTemplate(slug, to, placeholders, attachments?), Attachment-Support (PDF Buffer)
- [ ] API-Routes fuer Templates
- [ ] UI: Settings > E-Mail-Vorlagen — Liste, Editor mit Platzhalter-Vorschau, Test-Versand
- [ ] Default-Templates seeden: welcome, offer_send, reminder_7d, dunning_14d, dunning_21d, testimonial_request, birthday, christmas, follow_up
- [ ] Commit

---

## Phase 1: CRM & Vertrieb

### Task 1.1: KI-Lead-Scoring automatisch (KP2-02)

**Aufwand:** S | **Prioritaet:** hoch

**Files:**
- Modify: `src/lib/services/lead.service.ts` — Auto-Scoring bei Create
- Modify: `src/app/api/v1/leads/route.ts` — POST ergaenzen

- [ ] In `LeadService.create()`: Nach Erstellung automatisch `LeadResearchService.researchCompany()` triggern wenn Website vorhanden
- [ ] Score aus Research-Ergebnis uebernehmen (Branche, Groesse, Website-Qualitaet)
- [ ] Falls keine Website: Default-Score 30 setzen
- [ ] Commit

---

### Task 1.2: Erstantwort-E-Mail (KP2-03)

**Aufwand:** M | **Prioritaet:** hoch | **Abhaengigkeit:** Task 0.2

**Files:**
- Modify: `src/lib/services/lead.service.ts` — Trigger bei neuem Lead
- Modify: `src/lib/services/task-queue.service.ts` — EmailHandler

- [ ] Bei Lead-Erstellung: Task-Queue-Eintrag `type: 'email'` mit Template `lead_first_response` erstellen
- [ ] Payload: `{templateSlug: 'lead_first_response', to: lead.email, placeholders: {name, firma}}`
- [ ] EmailHandler in TaskQueue: Laedt Template, ersetzt Platzhalter, sendet via EmailService
- [ ] Default-Template `lead_first_response` mit Calendly-Link-Platzhalter (Calendly-URL in Tenant-Settings konfigurierbar)
- [ ] Commit

---

### Task 1.3: Gespraechsvorbereitung KI (KP2-05)

**Aufwand:** M | **Prioritaet:** mittel

**Files:**
- Create: `src/app/api/v1/companies/[id]/prep/route.ts`
- Modify: `src/app/intern/(dashboard)/contacts/companies/[id]/page.tsx` — Button

- [ ] API GET `/api/v1/companies/[id]/prep`: Sammelt Firmen-Daten, letzte Aktivitaeten, offene Leads/Chancen, Research-Ergebnisse
- [ ] KI-Call: Erstellt strukturierte Gespraechsvorbereitung (Zusammenfassung, Gespraechspunkte, offene Themen)
- [ ] Response als JSON + optionaler PDF-Export via jspdf
- [ ] Button "Gespraechsvorbereitung" auf Company-Detail-Seite
- [ ] Commit

---

### Task 1.4: KI-Gespraechsnotiz (KP2-07)

**Aufwand:** S | **Prioritaet:** mittel

**Files:**
- Modify: Aktivitaeten-Erstellung (dort wo neue Aktivitaeten angelegt werden)
- Create: Prompt-Template `meeting_summary`

- [ ] In Aktivitaeten-Dialog: Textarea fuer Stichpunkte + Button "KI-Zusammenfassung"
- [ ] KI-Call: Stichpunkte -> strukturierte Notiz (Ergebnis, Naechste Schritte, Follow-up-Datum)
- [ ] Ergebnis in Aktivitaets-Notiz einfuegen
- [ ] Prompt-Template `meeting_summary` in Defaults
- [ ] Commit

---

### Task 1.5: Angebot per E-Mail versenden (KP2-09)

**Aufwand:** M | **Prioritaet:** hoch | **Abhaengigkeit:** Task 0.2

**Files:**
- Create: `src/app/api/v1/documents/[id]/send/route.ts`
- Modify: `src/app/intern/(dashboard)/finance/offers/[id]/page.tsx` — Send-Button

- [ ] API POST: Generiert PDF des Angebots, sendet via EmailService mit Template `offer_send`
- [ ] Platzhalter: Firmenname, Ansprechpartner, Angebotsnummer, Gueltigkeitsdatum
- [ ] PDF als Attachment anhaengen
- [ ] Button "Per E-Mail senden" auf Angebots-Detail mit To/CC/Betreff-Dialog
- [ ] Commit

---

### Task 1.6: Follow-up-System (KP2-10)

**Aufwand:** M | **Prioritaet:** hoch | **Abhaengigkeit:** Task 0.1, 0.2

**Files:**
- Modify: `src/lib/services/document.service.ts` oder Offer-Service — nach Angebotserstellung
- Create: `src/lib/services/task-queue-handlers/follow-up.handler.ts`

- [ ] Bei Angebotserstellung: Task-Queue-Eintrag `type: 'follow_up'`, `scheduled_for: now + 5 Tage`
- [ ] Payload: `{documentId, templateSlug: 'follow_up_offer', to: email}`
- [ ] FollowUpHandler: Prueft ob Angebot noch Status 'sent'/'open', wenn ja: E-Mail senden
- [ ] Konfigurierbare Tage in Tenant-Settings (Default: 5)
- [ ] Commit

---

### Task 1.7: Willkommens-E-Mail bei Won (KP2-12)

**Aufwand:** S | **Prioritaet:** mittel | **Abhaengigkeit:** Task 0.2

**Files:**
- Modify: `src/lib/services/lead.service.ts` — updateStatus Hook erweitern

- [ ] In `updateStatus()`: Wenn neuer Status = 'won', Task-Queue-Eintrag `type: 'email'` mit Template `welcome`
- [ ] Platzhalter: Name, Firma, Calendly-Link
- [ ] Webhook `lead.won` feuert bereits — E-Mail parallel dazu
- [ ] Commit

---

### Task 1.8: E-Mail-zu-Lead Pipeline (KP2-01)

**Aufwand:** M | **Prioritaet:** hoch

**Files:**
- Create: `src/app/api/v1/leads/inbound/route.ts` — Webhook-Endpoint
- Modify: Lead-Service

- [ ] POST `/api/v1/leads/inbound`: Akzeptiert JSON `{email, name, company, message, source}`
- [ ] Erstellt Lead automatisch mit Status 'new', Source 'inbound_email'
- [ ] Kann von n8n-Workflow aufgerufen werden der IMAP-Postfach pollt
- [ ] Oder direkt als Kontaktformular-Backend nutzbar
- [ ] API-Key-Auth (bestehendes System)
- [ ] Commit

---

## Phase 2: Finance & Abrechnung

### Task 2.1: Zeiterfassungs-Modul (KP4-01)

**Aufwand:** L | **Prioritaet:** hoch

**Files:**
- Create: `src/lib/db/schema.ts` — `time_entries` Tabelle
- Create: `src/lib/services/time-entry.service.ts`
- Create: `src/app/api/v1/time-entries/route.ts`
- Create: `src/app/api/v1/time-entries/[id]/route.ts`
- Create: `src/app/api/v1/time-entries/timer/route.ts` — Start/Stop
- Create: `src/app/intern/(dashboard)/zeiterfassung/page.tsx`
- Create: Drizzle Migration

**DB-Schema `time_entries`:**
```sql
id              uuid PK
tenant_id       uuid FK tenants
user_id         uuid FK users
company_id      uuid FK companies (nullable)
description     varchar(500)
date            date
start_time      timestamp
end_time        timestamp (nullable — null = Timer laeuft)
duration_minutes integer
billable        boolean DEFAULT true
hourly_rate     numeric(10,2)
created_at      timestamp
updated_at      timestamp
```

- [ ] Schema + Migration
- [ ] TimeEntryService: CRUD, startTimer, stopTimer, listByDateRange, listByCompany, sumByCompany
- [ ] API-Routes: GET (mit ?from=&to=&companyId=), POST, PUT, DELETE, POST timer/start, POST timer/stop
- [ ] UI: Tagesansicht mit laufendem Timer, manuelle Eingabe, Wochenueberischt, Filter nach Firma
- [ ] Sidebar-Navigation: "Zeiterfassung" mit Clock-Icon
- [ ] Permissions: 'time_entries' zu MODULES hinzufuegen
- [ ] Commit

---

### Task 2.2: Zahlungsstatus-Tracking (KP4-04)

**Aufwand:** S | **Prioritaet:** hoch

**Files:**
- Modify: `src/lib/db/schema.ts` — `documents` Tabelle erweitern
- Modify: `src/lib/services/document.service.ts`
- Modify: Invoice-Detail-Seite
- Create: Drizzle Migration

**Neue Felder in `documents`:**
```sql
paid_at         timestamp (nullable)
payment_status  varchar(20) DEFAULT 'unpaid' -- 'unpaid', 'paid', 'overdue', 'partially_paid'
paid_amount     numeric(10,2) DEFAULT 0
```

- [ ] Schema + Migration
- [ ] DocumentService: markAsPaid(id, amount, date), getOverdue(tenantId)
- [ ] UI: "Als bezahlt markieren" Button auf Rechnungs-Detail, Faelligkeits-Ampel (gruen/gelb/rot) in Liste
- [ ] Automatische Berechnung: overdue wenn dueDate < heute und payment_status != 'paid'
- [ ] Commit

---

### Task 2.3: Rechnung aus Zeiterfassung (KP4-03)

**Aufwand:** M | **Prioritaet:** hoch | **Abhaengigkeit:** Task 2.1

**Files:**
- Create: `src/app/api/v1/time-entries/invoice/route.ts`
- Modify: Finance-Modul

- [ ] API POST: Nimmt companyId + Zeitraum, sammelt alle billable Time-Entries
- [ ] Erstellt Rechnung mit Positionen (Beschreibung, Stunden, Stundensatz, Betrag)
- [ ] Gruppierung nach Beschreibung oder Tag (konfigurierbar)
- [ ] Button "Rechnung erstellen" in Zeiterfassung mit Company/Zeitraum-Auswahl
- [ ] Commit

---

### Task 2.4: Beleg-Upload mit KI-OCR (KP4-02)

**Aufwand:** L | **Prioritaet:** mittel

**Files:**
- Create: `src/lib/db/schema.ts` — `receipts` Tabelle
- Create: `src/lib/services/receipt.service.ts`
- Create: `src/app/api/v1/receipts/route.ts`
- Create: `src/app/api/v1/receipts/[id]/route.ts`
- Create: `src/app/intern/(dashboard)/finance/receipts/page.tsx`
- Create: Drizzle Migration

**DB-Schema `receipts`:**
```sql
id              uuid PK
tenant_id       uuid FK tenants
file_url        varchar(500)
file_name       varchar(255)
amount          numeric(10,2)
date            date
vendor          varchar(255)
category        varchar(100)    -- 'office', 'travel', 'software', 'other'
status          varchar(20)     -- 'pending', 'processed', 'archived'
ocr_data        jsonb           -- KI-extrahierte Daten
notes           text
created_at      timestamp
```

- [ ] Schema + Migration
- [ ] ReceiptService: CRUD, upload (Datei speichern), extractWithAI (Gemini Vision fuer OCR)
- [ ] API: POST (multipart upload), GET (list mit Filter), PUT, DELETE
- [ ] UI: Upload-Bereich, KI-Extraktion zeigt Betrag/Datum/Lieferant zur Bestaetigung, Liste mit Filter
- [ ] Commit

---

### Task 2.5: Mahnwesen Stufe 1 — Zahlungserinnerung 7 Tage (KP4-05)

**Aufwand:** M | **Prioritaet:** hoch | **Abhaengigkeit:** Task 0.1, 0.2, 2.2

**Files:**
- Create: `src/lib/services/task-queue-handlers/dunning.handler.ts`
- Create: `src/app/api/v1/invoices/overdue/route.ts`

- [ ] API GET `/api/v1/invoices/overdue`: Listet alle ueberfaelligen Rechnungen mit Tagen ueberfaellig
- [ ] Bei Rechnungserstellung: Task-Queue-Eintrag `type: 'dunning_check'`, `scheduled_for: dueDate + 7 Tage`
- [ ] DunningHandler: Prueft ob Rechnung noch unpaid. Wenn ja: E-Mail mit Template `reminder_7d`, setzt `dunning_level: 1`
- [ ] Erstellt naechsten Queue-Eintrag fuer Stufe 2 (14 Tage)
- [ ] Commit

---

### Task 2.6: Mahnwesen Stufe 2 — Mahnung 14 Tage (KP4-06)

**Aufwand:** M | **Prioritaet:** hoch | **Abhaengigkeit:** Task 2.5

- [ ] DunningHandler Stufe 2: Formales Mahnschreiben per E-Mail (Template `dunning_14d`)
- [ ] PDF-Mahnung generieren (jspdf) und als Attachment
- [ ] Neues Feld `dunning_level` (integer) in documents-Tabelle
- [ ] Erstellt Queue-Eintrag fuer Stufe 3 (21 Tage)
- [ ] Commit

---

### Task 2.7: Mahnwesen Stufe 3 — Eskalation 21 Tage (KP4-07)

**Aufwand:** S | **Prioritaet:** mittel | **Abhaengigkeit:** Task 2.6

- [ ] DunningHandler Stufe 3: E-Mail mit Template `dunning_21d` (letzte Mahnung)
- [ ] Erstellt Aktivitaet "Telefonisch nachfassen" beim zugehoerigen Kontakt
- [ ] Commit

---

## Phase 3: Content & Marketing

### Task 3.1: Blog KI-Review (KP1-04)

**Aufwand:** S | **Prioritaet:** hoch

**Files:**
- Create: `src/app/api/v1/blog/posts/[id]/review/route.ts`
- Modify: Blog-Edit-Seite — Review-Button
- Create: Prompt-Template `blog_review`

- [ ] API POST: Sendet Blog-Content + Keywords an KI, bekommt Review (Lesbarkeit, Keyword-Dichte, Tonalitaet, Verbesserungsvorschlaege)
- [ ] Prompt-Template `blog_review` in Defaults
- [ ] Response: JSON mit Score, Vorschlaegen als Liste, ueberarbeiteter Text optional
- [ ] UI: Button "KI-Review" im Blog-Editor, Ergebnis als Seitenleiste mit Vorschlaegen
- [ ] Commit

---

### Task 3.2: Blog WordPress-Export (KP1-07)

**Aufwand:** M | **Prioritaet:** mittel

**Empfehlung:** WordPress REST API als Ziel-Integration (API-Key in Provider-Settings)

**Files:**
- Create: `src/lib/services/wordpress.service.ts`
- Create: `src/app/api/v1/blog/posts/[id]/publish-wp/route.ts`
- Modify: Blog-Detail-Seite — "Auf WordPress veroeffentlichen" Button

- [ ] WordPressService: publish(wpUrl, wpUser, wpAppPassword, post) via WordPress REST API `/wp-json/wp/v2/posts`
- [ ] API POST: Laedt Blog-Post, sendet an WordPress (Title, Content, Featured Image URL, SEO)
- [ ] WP-Credentials als AI-Provider-Eintrag (type: 'wordpress') mit URL + App-Password
- [ ] UI: Button mit Erfolgs-/Fehlermeldung
- [ ] Commit

---

### Task 3.3: SEO-Keyword-Recherche (KP1-01 Teilaufgabe)

**Aufwand:** M | **Prioritaet:** mittel

**Empfehlung:** SerpAPI (bereits als Provider vorhanden) fuer Suchvolumen-Daten

**Files:**
- Create: `src/app/api/v1/seo/keywords/route.ts`
- Create: `src/lib/services/seo-keyword.service.ts`
- Modify: Blog-New-Seite — Keyword-Recherche-Widget

- [ ] SeoKeywordService: research(keyword, language) — nutzt SerpAPI fuer Google-Suchergebnisse + Related Keywords
- [ ] API POST: Keywords eingeben, bekommt Suchvolumen-Schaetzung, Related Keywords, Wettbewerb
- [ ] UI-Widget im Blog-Editor: Keyword eingeben, Ergebnisse als Tabelle, "Uebernehmen" Button setzt SEO-Keywords
- [ ] Commit

---

### Task 3.4: Content-Board / Kanban (KP1-01 Teilaufgabe)

**Aufwand:** L | **Prioritaet:** hoch

Wird in Phase 4 als Teil des Projekt-Moduls umgesetzt (siehe Task 4.1). Blog/Marketing nutzt dasselbe Kanban-System.

---

### Task 3.5: Social Media Direct Publishing (KP1-08)

**Aufwand:** XL | **Prioritaet:** hoch

**Empfehlung:** LinkedIn API (OAuth 2.0), Twitter/X API v2 (OAuth 2.0) — jeweils API-Keys in Provider-Settings

**Files:**
- Create: `src/lib/services/social-publishing.service.ts`
- Create: `src/app/api/v1/social-media/posts/[id]/publish/route.ts`
- Create: `src/app/api/v1/social-media/auth/[platform]/route.ts` — OAuth Callback
- Modify: Social-Media-Post-Detail — Publish-Button
- Modify: Settings — Social-Media-Accounts verwalten

- [ ] SocialPublishingService: publishToLinkedIn(post), publishToTwitter(post)
- [ ] OAuth-Flow pro Plattform: Auth-URL generieren, Callback verarbeiten, Token speichern
- [ ] Token-Speicherung in AI-Provider-Tabelle (type: 'linkedin', 'twitter')
- [ ] API POST publish: Sendet Post an gewaehlte Plattform(en), aktualisiert Status auf 'posted'
- [ ] Scheduled Publishing: Task-Queue-Eintrag `type: 'social_publish'` mit scheduled_for
- [ ] UI: Publish-Button mit Plattform-Auswahl, Zeitplanung
- [ ] Commit

---

### Task 3.6: Newsletter-Modul (KP1-10, KP1-11, KP1-12)

**Aufwand:** L+L+M = XL gesamt | **Prioritaet:** hoch

**Empfehlung:** Brevo API (kostenlos bis 300/Tag) fuer Versand — API-Key in Provider-Settings

**Files:**
- Create: `src/lib/db/schema.ts` — `newsletter_subscribers`, `newsletter_campaigns`
- Create: `src/lib/services/newsletter.service.ts`
- Create: `src/app/api/v1/newsletter/subscribers/route.ts`
- Create: `src/app/api/v1/newsletter/campaigns/route.ts`
- Create: `src/app/api/v1/newsletter/campaigns/[id]/send/route.ts`
- Create: `src/app/intern/(dashboard)/marketing/newsletter/page.tsx`
- Create: `src/app/intern/(dashboard)/marketing/newsletter/[id]/page.tsx`
- Create: Drizzle Migration

**DB-Schema `newsletter_subscribers`:**
```sql
id              uuid PK
tenant_id       uuid FK
email           varchar(255) NOT NULL
name            varchar(255)
tags            text[]
status          varchar(20)     -- 'active', 'unsubscribed', 'bounced'
subscribed_at   timestamp
unsubscribed_at timestamp
```

**DB-Schema `newsletter_campaigns`:**
```sql
id              uuid PK
tenant_id       uuid FK
name            varchar(255)
subject         varchar(500)
body_html       text
status          varchar(20)     -- 'draft', 'sending', 'sent', 'failed'
sent_at         timestamp
stats           jsonb           -- {sent, opened, clicked, bounced, unsubscribed}
segment_tags    text[]          -- Filter nach Subscriber-Tags
created_at      timestamp
```

- [ ] Schema + Migration
- [ ] NewsletterService: Subscriber-CRUD, Import/Export CSV, Campaign-CRUD, send(campaignId)
- [ ] Send-Funktion: Nutzt bestehenden EmailService fuer jeden Subscriber (oder Brevo Batch-API wenn vorhanden)
- [ ] KI-Content-Generierung: Button "Mit KI erstellen" generiert Newsletter-Text aus Prompt
- [ ] UI Subscriber-Verwaltung: Liste, Import, Tags, Status
- [ ] UI Campaign-Editor: Betreff, HTML-Body mit Vorschau, Segment-Auswahl, Test-Versand, Senden
- [ ] Statistik-Dashboard: Oeffnungsrate, Klickrate (Tracking-Pixel + Link-Wrapping)
- [ ] Sidebar: Unter Marketing > Newsletter
- [ ] Commit

---

### Task 3.7: Grammatik-Pruefung im Blog (KP1-04 Teilaufgabe)

**Aufwand:** M | **Prioritaet:** niedrig

**Empfehlung:** LanguageTool API (kostenlos, self-hosted moeglich)

**Files:**
- Create: `src/lib/services/language-check.service.ts`
- Modify: Blog-Editor — Pruef-Button

- [ ] LanguageCheckService: check(text, language) — ruft LanguageTool API auf
- [ ] LanguageTool-URL konfigurierbar in Tenant-Settings (Default: api.languagetool.org)
- [ ] UI: Button "Rechtschreibung pruefen", Fehler als markierte Bereiche mit Korrekturvorschlag
- [ ] Commit

---

## Phase 4: Projekt-Modul (Kanban)

### Task 4.1: Kanban-Board Grundgeruest (KP2-13, KP3-05, KP1-01)

**Aufwand:** XL | **Prioritaet:** hoch

**Files:**
- Create: `src/lib/db/schema.ts` — `projects`, `project_tasks`
- Create: `src/lib/services/project.service.ts`
- Create: `src/app/api/v1/projects/route.ts`
- Create: `src/app/api/v1/projects/[id]/route.ts`
- Create: `src/app/api/v1/projects/[id]/tasks/route.ts`
- Create: `src/app/api/v1/projects/[id]/tasks/[taskId]/route.ts`
- Create: `src/app/intern/(dashboard)/projekte/page.tsx`
- Create: `src/app/intern/(dashboard)/projekte/[id]/page.tsx` — Kanban-Board
- Install: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Create: Drizzle Migration

**DB-Schema `projects`:**
```sql
id              uuid PK
tenant_id       uuid FK
name            varchar(255)
description     text
company_id      uuid FK companies (nullable)
status          varchar(20)     -- 'active', 'completed', 'archived'
columns         jsonb           -- [{id, name, color}] Default: Backlog, ToDo, In Arbeit, Fertig
created_at      timestamp
updated_at      timestamp
```

**DB-Schema `project_tasks`:**
```sql
id              uuid PK
tenant_id       uuid FK
project_id      uuid FK projects
title           varchar(255)
description     text
column_id       varchar(50)     -- Referenz auf projects.columns[].id
position        integer         -- Sortierung innerhalb Spalte
assigned_to     uuid FK users (nullable)
due_date        date
checklist       jsonb           -- [{text, checked}]
labels          text[]
created_at      timestamp
updated_at      timestamp
```

- [ ] Schema + Migration
- [ ] npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
- [ ] ProjectService: CRUD Projects, CRUD Tasks, moveTask(taskId, newColumnId, newPosition)
- [ ] API-Routes: Standard CRUD + PATCH fuer Task-Verschiebung (Drag&Drop)
- [ ] UI Projekt-Liste: Cards mit Name, Firma, Status, Aufgaben-Zaehler
- [ ] UI Kanban-Board: Spalten aus project.columns, Tasks als Cards mit Drag&Drop via dnd-kit
- [ ] Task-Card: Titel, Assignee-Avatar, Due-Date, Checklisten-Fortschritt, Labels
- [ ] Task-Detail-Dialog: Titel, Beschreibung, Checkliste, Zuweisung, Faelligkeitsdatum
- [ ] Sidebar: "Projekte" mit Kanban-Icon
- [ ] Permissions: 'projects' zu MODULES
- [ ] Commit

---

### Task 4.2: OKR/Quartalsziele (MP-03)

**Aufwand:** L | **Prioritaet:** mittel | **Abhaengigkeit:** Task 4.1

- [ ] Erweiterung Projekt-Modul: Projekt-Typ 'okr' mit speziellen Spalten (Ziel, Key Result, Status)
- [ ] Quartalsziele als Projekte mit Zeitraum-Feldern (Q1 2026, etc.)
- [ ] Key Results als Tasks mit numerischem Fortschritt (0-100%)
- [ ] Dashboard-Widget: Aktuelle OKRs mit Fortschritt
- [ ] Commit

---

### Task 4.3: Content-Board fuer Blog/Marketing (KP1-01)

**Aufwand:** S | **Prioritaet:** hoch | **Abhaengigkeit:** Task 4.1

- [ ] Default-Projekt "Content-Planung" mit Spalten: Idee, Recherche, Entwurf, Review, Veroeffentlicht
- [ ] Labels: Blog, Social Media, Newsletter, KW-XX
- [ ] Verlinkung: Task kann auf Blog-Post oder Social-Media-Post verweisen (reference_type + reference_id)
- [ ] Commit

---

## Phase 5: Dokument-Generator & Security-Docs

### Task 5.1: KI-Dokument-Generator Grundgeruest (KP3-17)

**Aufwand:** L | **Prioritaet:** mittel

**Files:**
- Create: `src/lib/db/schema.ts` — `document_templates`
- Create: `src/lib/services/document-template.service.ts`
- Create: `src/app/api/v1/document-templates/route.ts`
- Create: `src/app/api/v1/document-templates/[id]/generate/route.ts`
- Create: `src/app/intern/(dashboard)/dokumente/page.tsx` — Template-Verwaltung
- Create: Drizzle Migration

**DB-Schema `document_templates`:**
```sql
id              uuid PK
tenant_id       uuid FK
name            varchar(255)
category        varchar(100)    -- 'report', 'proposal', 'protocol', 'security', 'runbook'
body_html       text            -- HTML mit {{platzhalter}}
placeholders    jsonb           -- [{key, label, description, ai_fillable}]
header_html     text            -- Kopfzeile mit Logo
footer_html     text
created_at      timestamp
updated_at      timestamp
```

- [ ] Schema + Migration
- [ ] DocumentTemplateService: CRUD, generate(templateId, placeholders) — KI fuellt ai_fillable Platzhalter
- [ ] PDF-Export via jspdf (HTML -> PDF)
- [ ] UI: Template-Liste, WYSIWYG-artiger Editor (Textarea + Vorschau), Platzhalter-Verwaltung
- [ ] Button "Mit KI fuellen" — sendet Kontext an KI, fuellt Platzhalter aus
- [ ] Commit

---

### Task 5.2: Massnahmenplan-Generator (KP3-04)

**Aufwand:** L | **Prioritaet:** mittel | **Abhaengigkeit:** Task 5.1

- [ ] Default-Template "Massnahmenplan" mit Sektionen: Zusammenfassung, Ist-Analyse, Massnahmen, Zeitplan, Verantwortlichkeiten
- [ ] KI-Generierung: Input = Workshop-Notizen/Freitext, Output = strukturierter Massnahmenplan
- [ ] PDF-Export mit Firmenlogo aus Tenant-Settings
- [ ] Commit

---

### Task 5.3: Security-Roadmap aus Audit (KP7-03)

**Aufwand:** M | **Prioritaet:** hoch | **Abhaengigkeit:** Task 5.1

**Files:**
- Create: `src/app/api/v1/din/audits/[id]/roadmap/route.ts`
- Modify: DIN-Audit-Detail-Seite — "Roadmap generieren" Button

- [ ] API POST: Laedt alle nicht-erfuellten Anforderungen des Audits
- [ ] KI-Call: Erstellt priorisierte Massnahmen-Roadmap mit Zeitplan (kurzfristig/mittelfristig/langfristig)
- [ ] Nutzt Document-Template "Security-Roadmap"
- [ ] PDF-Export + Anzeige in App
- [ ] Button auf DIN-Audit-Detail und WiBA-Detail
- [ ] Commit

---

### Task 5.4: Betriebshandbuch-Generator (KP6-07)

**Aufwand:** L | **Prioritaet:** mittel | **Abhaengigkeit:** Task 5.1

- [ ] Default-Template "Betriebshandbuch" mit Sektionen: Systeme, Zugaenge, Netzwerk, Backup, Wartung, Kontakte
- [ ] KI fuellt Sektionen basierend auf Freitext-Input (IT-Assessment-Ergebnisse)
- [ ] PDF-Export
- [ ] Commit

---

### Task 5.5: Backup-Strategie-Dokument (KP7-07)

**Aufwand:** S | **Prioritaet:** mittel | **Abhaengigkeit:** Task 5.1

- [ ] Default-Template "Backup-Strategie" mit 3-2-1-Regel, RPO/RTO, Verantwortlichkeiten
- [ ] KI fuellt basierend auf Firmenkontext (Groesse, Branche, Systeme)
- [ ] Commit

---

### Task 5.6: Awareness-Schulungsmaterial (KP7-09)

**Aufwand:** M | **Prioritaet:** mittel | **Abhaengigkeit:** Task 5.1

- [ ] Default-Template "Awareness-Schulung" mit Modulen: Phishing, Passwoerter, Social Engineering, DSGVO
- [ ] KI generiert branchenspezifische Inhalte mit Praxisbeispielen
- [ ] HTML-Slides-Export (einfache Praesentation) oder PDF
- [ ] Commit

---

### Task 5.7: Security-Richtlinien + Notfall-Playbook (KP7-11, KP7-12)

**Aufwand:** M+M | **Prioritaet:** mittel-hoch | **Abhaengigkeit:** Task 5.1

- [ ] Default-Template "Security-Richtlinie" mit Abschnitten: Passwort-Policy, E-Mail, BYOD, Datenschutz, Meldepflichten
- [ ] Default-Template "Notfall-Playbook" mit Szenarien: Ransomware, Datenverlust, Phishing-Vorfall, Systemausfall
- [ ] Checklisten pro Szenario, Meldewege, Kontakte aus CRM einbinden
- [ ] KI-Generierung branchenspezifisch
- [ ] PDF-Export
- [ ] Commit

---

## Phase 6: After-Sales & Kundenbindung

### Task 6.1: After-Sales Follow-up (KP5-04)

**Aufwand:** M | **Prioritaet:** mittel | **Abhaengigkeit:** Task 0.1, 0.2

- [ ] Bei Opportunity Status "Closed Won": Task-Queue-Eintrag `type: 'follow_up'`, `scheduled_for: now + 6 Wochen`
- [ ] FollowUpHandler: Sendet E-Mail mit Template `after_sales_6w`, erstellt Aktivitaet "Follow-up"
- [ ] Konfigurierbar: Wochen in Tenant-Settings
- [ ] Commit

---

### Task 6.2: Geburtstags- und Feiertagsgruesse (KP5-06)

**Aufwand:** M | **Prioritaet:** niedrig | **Abhaengigkeit:** Task 0.1, 0.2

**Files:**
- Modify: `src/lib/db/schema.ts` — `birthday` Feld in persons
- Create: `src/app/api/v1/persons/birthdays/route.ts`
- Create: Drizzle Migration

- [ ] Neues Feld `birthday date` in persons-Tabelle + Migration
- [ ] API GET `/api/v1/persons/birthdays?days=7`: Listet Geburtstage der naechsten X Tage
- [ ] Manueller Trigger: Button "Geburtstags-Mails planen" erstellt Task-Queue-Eintraege fuer anstehende Geburtstage
- [ ] E-Mail mit Template `birthday`
- [ ] Weihnachtsgruesse: Jaehrlich manuell ausloesbar fuer alle aktiven Kontakte (Template `christmas`)
- [ ] Commit

---

### Task 6.3: Feedback-Modul (KP5-02)

**Aufwand:** L | **Prioritaet:** mittel

**Files:**
- Create: `src/lib/db/schema.ts` — `feedback_forms`, `feedback_responses`
- Create: `src/lib/services/feedback.service.ts`
- Create: `src/app/api/v1/feedback/route.ts`
- Create: `src/app/api/v1/feedback/[id]/route.ts`
- Create: `src/app/api/v1/feedback/[id]/respond/route.ts` — Oeffentlicher Endpoint
- Create: `src/app/intern/(dashboard)/feedback/page.tsx`
- Create: `src/app/(public)/feedback/[token]/page.tsx` — Oeffentliches Formular
- Create: Drizzle Migration

**DB-Schema `feedback_forms`:**
```sql
id              uuid PK
tenant_id       uuid FK
name            varchar(255)
questions       jsonb           -- [{type: 'stars'|'text'|'scale', label, required}]
company_id      uuid FK (nullable)
token           varchar(100) UNIQUE
status          varchar(20)
created_at      timestamp
```

**DB-Schema `feedback_responses`:**
```sql
id              uuid PK
form_id         uuid FK
answers         jsonb           -- [{questionIndex, value}]
nps_score       integer
submitted_at    timestamp
```

- [ ] Schema + Migration
- [ ] FeedbackService: CRUD Forms, createResponse, getStats(formId) mit NPS-Berechnung
- [ ] Oeffentliches Formular: `/feedback/[token]` — kein Login noetig, Mobile-optimiert
- [ ] Dashboard: NPS-Score, Sterne-Durchschnitt, Freitext-Antworten
- [ ] Link-Versand per E-Mail aus CRM (1-Click: "Feedback anfordern")
- [ ] Commit

---

### Task 6.4: Testimonial-Anfrage (KP5-03)

**Aufwand:** S | **Prioritaet:** niedrig | **Abhaengigkeit:** Task 0.2

- [ ] E-Mail-Template `testimonial_request` mit Platzhaltern (Name, Firma, Bewertungs-Link)
- [ ] Button "Testimonial anfragen" auf Company/Person-Detail
- [ ] Sendet E-Mail via EmailService, erstellt Aktivitaet
- [ ] Commit

---

### Task 6.5: Meeting-Planung (KP2-14, KP5-01)

**Aufwand:** M | **Prioritaet:** mittel

- [ ] Tenant-Settings: Feld `calendly_url` fuer Terminbuchungs-Link
- [ ] Button "Termin planen" auf Company/Lead-Detail: Oeffnet Dialog mit E-Mail-Versand (Template `meeting_invite` mit Calendly-Link)
- [ ] KI-Gespraechsleitfaden: Button generiert Vorbereitung basierend auf Firmen-/Projekt-Historie (wiederverwendet Task 1.3)
- [ ] Commit

---

## Phase 7: Dashboards & Advanced

### Task 7.1: KPI-Dashboard mit Zeitvergleich (MP-01)

**Aufwand:** L | **Prioritaet:** mittel | **Abhaengigkeit:** Phase 1, 2

**Files:**
- Create: `src/app/api/v1/kpi/route.ts`
- Create: `src/lib/services/kpi.service.ts`
- Modify: `src/app/intern/(dashboard)/cockpit/page.tsx` oder eigene KPI-Seite

- [ ] KpiService: getMetrics(tenantId, from, to) — aggregiert: Umsatz (aus Rechnungen), neue Leads, Conversion-Rate, offene Angebote, ueberfaellige Rechnungen, NPS (aus Feedback)
- [ ] Vergleich: Aktueller Zeitraum vs. vorheriger Zeitraum (Delta + Prozent)
- [ ] API: GET mit ?from=&to=&compare=previous
- [ ] UI: Cards mit KPI-Wert + Delta-Pfeil + Trend-Chart (recharts), Zeitraum-Selector (Monat/Quartal/Jahr)
- [ ] Commit

---

### Task 7.2: IT-Assessment-Modul (KP6-01)

**Aufwand:** L | **Prioritaet:** mittel

**Files:**
- Create: `src/lib/db/schema.ts` — `it_assessment_questions`, `it_assessment_sessions`, `it_assessment_answers`
- Create: Services + API + Frontend (Pattern wie DIN-Audit)
- Create: Drizzle Migration

- [ ] Gleiche Architektur wie DIN-Audit: Fragen-Katalog, Interview-Session, Antworten, Scoring
- [ ] Kategorien: Netzwerk, Cloud, Security, Backup, Software, Hardware
- [ ] KI-Bericht-Generierung aus Antworten (nutzt Document-Template "IT-Assessment-Bericht")
- [ ] Sidebar: Unter Cybersecurity oder eigener Bereich
- [ ] Commit

---

### Task 7.3: Chatbot-Builder fuer Kunden (KP3-12)

**Aufwand:** XL | **Prioritaet:** mittel

**Files:**
- Create: `src/lib/db/schema.ts` — `chatbot_configs`
- Create: `src/lib/services/chatbot-config.service.ts`
- Create: API + Frontend

**DB-Schema `chatbot_configs`:**
```sql
id              uuid PK
tenant_id       uuid FK
name            varchar(255)
system_prompt   text
knowledge_base  text            -- Hochgeladene Wissensbasis als Text
guardrails      jsonb           -- [{type: 'forbidden_topic'|'max_length'|'escalation', config}]
style           jsonb           -- {tone, language, greeting}
company_id      uuid FK (nullable)
is_active       boolean
created_at      timestamp
```

- [ ] Schema + Migration
- [ ] ChatbotConfigService: CRUD, test(configId, message)
- [ ] UI: Konfigurator mit System-Prompt-Editor, Datei-Upload (Text/PDF wird zu knowledge_base), Guardrail-Regeln, Test-Chat
- [ ] Export: Konfiguration als JSON exportierbar fuer Kunden-Deployment
- [ ] Commit

---

### Task 7.4: n8n Workflow-Templates (KP3-06)

**Aufwand:** S | **Prioritaet:** niedrig

- [ ] Vordefinierte Workflow-Templates als JSON: "E-Mail bei neuem Lead", "Follow-up Reminder", "Newsletter-Versand"
- [ ] UI: Template-Galerie in n8n-Workflows-Modul, "Template importieren" Button
- [ ] Commit

---

### Task 7.5: Monitoring-Widget (KP6-08)

**Aufwand:** M | **Prioritaet:** niedrig

**Empfehlung:** UptimeRobot API (kostenlos bis 50 Monitors) — API-Key in Provider-Settings

**Files:**
- Create: `src/lib/services/uptime-monitor.service.ts`
- Modify: Cockpit-Seite — Monitoring-Widget

- [ ] UptimeMonitorService: getMonitors(apiKey) — ruft UptimeRobot API v2 ab
- [ ] API-Key als AI-Provider (type: 'uptimerobot')
- [ ] Widget auf Cockpit: Status-Anzeige pro Monitor (gruen/rot), Uptime-Prozent, Response-Time
- [ ] Commit

---

### Task 7.6: Social Media Inbox (KP1-09)

**Aufwand:** XL | **Prioritaet:** niedrig | **Abhaengigkeit:** Task 3.5

- [ ] Erweiterung Social-Publishing: Kommentare/Mentions abrufen (LinkedIn API)
- [ ] Inbox-Ansicht: Eingehende Interaktionen als Liste, direkt antworten
- [ ] Hinweis: XING hat keine offene API — nur LinkedIn + Twitter unterstuetzbar
- [ ] Commit

---

### Task 7.7: Grammatik-Integration (KP1-04 Teilaufgabe)

Siehe Task 3.7 (Phase 3).

---

## Umsetzungsreihenfolge (empfohlen)

```
Phase 0 (Infrastruktur)         ━━━━━━━━  ~3 Tage
  ├─ 0.1 Task-Queue
  └─ 0.2 E-Mail-Templates
          │
   ┌──────┴──────────┐
Phase 1 (CRM)    Phase 2 (Finance)    Phase 4 (Kanban)
~4 Tage          ~5 Tage               ~4 Tage
   │                │                      │
Phase 3 (Content) ──┘             Phase 5 (Dokumente)
~6 Tage                           ~4 Tage
   │                                   │
Phase 6 (After-Sales) ────────────────┘
~3 Tage
   │
Phase 7 (Advanced)
~6 Tage
```

**Gesamt-Schaetzung:** ~35 Arbeitstage

Phase 0+1+2 parallel mit Phase 4+5 moeglich → **~20 Tage** bei Parallelisierung.
