# xKMU BusinessOS — Offene Aufgaben (Stand 2026-03-24)

> Basierend auf Abgleich des Masterplans vom 2026-03-23. Nur noch nicht umgesetzte Punkte.

---

## Uebersicht

| # | Thema | Aufwand | Prioritaet |
|---|-------|---------|------------|
| 1 | Mahnwesen (3 Stufen) | L | hoch |
| 2 | SEO-Keyword-Recherche | M | mittel |
| 3 | Grammatik-Pruefung Blog | M | niedrig |
| 4 | Content-Board Default-Projekt | S | mittel |
| 5 | KPI-Dashboard mit Zeitvergleich | L | mittel |
| 6 | IT-Assessment-Modul | L | mittel |
| 7 | Chatbot-Builder | XL | mittel |
| 8 | Monitoring-Widget | M | niedrig |
| 9 | Social Media Inbox | XL | niedrig |
| 10 | Follow-up Handler (Task-Queue) | S | hoch |

**Geschaetzt: ~15-20 Arbeitstage**

---

## 1. Mahnwesen — 3-Stufen-System (KP4-05, KP4-06, KP4-07)

**Aufwand:** L | **Prioritaet:** hoch | **Abhaengigkeit:** Task-Queue + E-Mail-Templates (beide vorhanden)

**Kontext:** Task-Queue, E-Mail-Templates und Zahlungsstatus-Tracking existieren bereits. Es fehlt der Dunning-Handler der die Stufen automatisch durchlaeuft.

**Files:**
- Create: `src/lib/services/task-queue-handlers/dunning.handler.ts`
- Create: `src/app/api/v1/invoices/overdue/route.ts`
- Modify: `src/lib/services/task-queue.service.ts` — Handler registrieren
- Modify: Document-Service — bei Rechnungserstellung Queue-Eintrag anlegen

**Implementierung:**

- [ ] API GET `/api/v1/invoices/overdue`: Listet alle ueberfaelligen Rechnungen mit Tagen ueberfaellig
- [ ] DunningHandler Stufe 1 (7 Tage nach Faelligkeit): E-Mail mit Template `reminder_7d`, setzt `dunning_level: 1`
- [ ] DunningHandler Stufe 2 (14 Tage): Formales Mahnschreiben mit PDF-Attachment (jspdf), Template `dunning_14d`, `dunning_level: 2`
- [ ] DunningHandler Stufe 3 (21 Tage): Letzte Mahnung Template `dunning_21d`, erstellt Aktivitaet "Telefonisch nachfassen"
- [ ] Neues Feld `dunning_level` (integer, default 0) in documents-Tabelle + Migration
- [ ] Bei Rechnungserstellung: Task-Queue-Eintrag `type: 'dunning_check'`, `scheduled_for: dueDate + 7 Tage`
- [ ] Jede Stufe erstellt automatisch den naechsten Queue-Eintrag
- [ ] Commit

---

## 2. SEO-Keyword-Recherche (KP1-01 Teilaufgabe)

**Aufwand:** M | **Prioritaet:** mittel

**Kontext:** SerpAPI ist bereits als Provider-Typ vorhanden.

**Files:**
- Create: `src/lib/services/seo-keyword.service.ts`
- Create: `src/app/api/v1/seo/keywords/route.ts`
- Modify: Blog-New/Edit-Seite — Keyword-Recherche-Widget

**Implementierung:**

- [ ] SeoKeywordService: research(keyword, language) — nutzt SerpAPI fuer Google-Suchergebnisse + Related Keywords
- [ ] API POST `/api/v1/seo/keywords`: Keywords eingeben, bekommt Related Keywords, Wettbewerber-URLs, Suchvolumen-Schaetzung
- [ ] UI-Widget im Blog-Editor: Keyword eingeben, Ergebnisse als Tabelle, "Uebernehmen" Button setzt SEO-Keywords
- [ ] Commit

---

## 3. Grammatik-Pruefung Blog (KP1-04 Teilaufgabe)

**Aufwand:** M | **Prioritaet:** niedrig

**Files:**
- Create: `src/lib/services/language-check.service.ts`
- Modify: Blog-Editor — Pruef-Button

**Implementierung:**

- [ ] LanguageCheckService: check(text, language) — ruft LanguageTool API auf (api.languagetool.org)
- [ ] LanguageTool-URL konfigurierbar als AI-Provider (type: 'languagetool')
- [ ] UI: Button "Rechtschreibung pruefen" im Blog-Editor, Fehler als Liste mit Korrekturvorschlaegen
- [ ] Commit

---

## 4. Content-Board Default-Projekt (KP1-01)

**Aufwand:** S | **Prioritaet:** mittel | **Abhaengigkeit:** Projekt-Modul (vorhanden)

**Kontext:** Projekt-Typ 'content' ist im Schema unterstuetzt, aber es gibt kein vorgefertigtes Default-Projekt.

**Implementierung:**

- [ ] Default-Projekt "Content-Planung" mit Spalten: Idee, Recherche, Entwurf, Review, Veroeffentlicht
- [ ] Labels: Blog, Social Media, Newsletter
- [ ] Seed-Script oder Button "Content-Board erstellen" in Projekte-Seite
- [ ] Commit

---

## 5. KPI-Dashboard mit Zeitvergleich (MP-01)

**Aufwand:** L | **Prioritaet:** mittel

**Files:**
- Create: `src/lib/services/kpi.service.ts`
- Create: `src/app/api/v1/kpi/route.ts`
- Create/Modify: `src/app/intern/(dashboard)/cockpit/page.tsx` oder eigene KPI-Seite

**Implementierung:**

- [ ] KpiService: getMetrics(from, to) — aggregiert: Umsatz (Rechnungen), neue Leads, Conversion-Rate, offene Angebote, ueberfaellige Rechnungen, NPS (Feedback)
- [ ] Vergleich: Aktueller Zeitraum vs. vorheriger Zeitraum (Delta + Prozent)
- [ ] API GET `/api/v1/kpi?from=&to=&compare=previous`
- [ ] UI: Cards mit KPI-Wert + Delta-Pfeil, Zeitraum-Selector (Monat/Quartal/Jahr)
- [ ] Optional: Trend-Charts mit recharts
- [ ] Commit

---

## 6. IT-Assessment-Modul (KP6-01)

**Aufwand:** L | **Prioritaet:** mittel

**Kontext:** DIN-Audit und WiBA existieren bereits als Referenz-Architektur.

**Files:**
- Create: `src/lib/db/schema.ts` — `it_assessment_questions`, `it_assessment_sessions`, `it_assessment_answers`
- Create: Services + API + Frontend (Pattern wie DIN-Audit)
- Create: Drizzle Migration

**Implementierung:**

- [ ] Gleiche Architektur wie DIN-Audit: Fragen-Katalog, Interview-Session, Antworten, Scoring
- [ ] Kategorien: Netzwerk, Cloud, Security, Backup, Software, Hardware
- [ ] KI-Bericht-Generierung aus Antworten (nutzt Document-Template "IT-Assessment-Bericht")
- [ ] Default-Fragenkatalog seeden (~30-50 Fragen)
- [ ] Sidebar: Eigener Bereich oder unter Cybersecurity
- [ ] Commit

---

## 7. Chatbot-Builder fuer Kunden (KP3-12)

**Aufwand:** XL | **Prioritaet:** mittel

**Files:**
- Create: `src/lib/db/schema.ts` — `chatbot_configs`
- Create: `src/lib/services/chatbot-config.service.ts`
- Create: API + Frontend
- Create: Drizzle Migration

**DB-Schema `chatbot_configs`:**
```sql
id              uuid PK
tenant_id       uuid FK
name            varchar(255)
system_prompt   text
knowledge_base  text
guardrails      jsonb       -- [{type, config}]
style           jsonb       -- {tone, language, greeting}
company_id      uuid FK (nullable)
is_active       boolean
created_at      timestamp
```

**Implementierung:**

- [ ] Schema + Migration
- [ ] ChatbotConfigService: CRUD, test(configId, message)
- [ ] UI: Konfigurator mit System-Prompt-Editor, Text/PDF-Upload (wird zu knowledge_base), Guardrail-Regeln, Test-Chat
- [ ] Export: Konfiguration als JSON fuer Kunden-Deployment
- [ ] Commit

---

## 8. Monitoring-Widget (KP6-08)

**Aufwand:** M | **Prioritaet:** niedrig

**Files:**
- Create: `src/lib/services/uptime-monitor.service.ts`
- Modify: Cockpit-Seite — Monitoring-Widget

**Implementierung:**

- [ ] UptimeMonitorService: getMonitors(apiKey) — UptimeRobot API v2
- [ ] API-Key als AI-Provider (type: 'uptimerobot')
- [ ] Widget auf Cockpit: Status-Anzeige pro Monitor (gruen/rot), Uptime-Prozent, Response-Time
- [ ] Commit

---

## 9. Social Media Inbox (KP1-09)

**Aufwand:** XL | **Prioritaet:** niedrig

**Kontext:** Social Publishing (LinkedIn, Twitter, Facebook, Instagram) ist implementiert. Inbox fehlt.

**Implementierung:**

- [ ] Erweiterung SocialPublishingService: Kommentare/Mentions abrufen (LinkedIn + Twitter API)
- [ ] Inbox-Ansicht: Eingehende Interaktionen als Liste
- [ ] Direkt-Antwort-Funktion aus der App
- [ ] Hinweis: Instagram/Facebook Comments via Graph API moeglich, XING hat keine API
- [ ] Commit

---

## 10. Follow-up Handler Task-Queue

**Aufwand:** S | **Prioritaet:** hoch

**Kontext:** Follow-up E-Mail-Templates existieren (`follow_up_offer`, `after_sales_6w`), aber es fehlt ein dedizierter Handler in der Task-Queue der diese ausfuehrt.

**Files:**
- Create: `src/lib/services/task-queue-handlers/follow-up.handler.ts`
- Modify: `src/lib/services/task-queue.service.ts` — Handler registrieren

**Implementierung:**

- [ ] FollowUpHandler: Prueft ob Angebot noch Status 'sent'/'open', wenn ja: E-Mail senden
- [ ] After-Sales-Handler: Sendet `after_sales_6w` Template nach Opportunity Won
- [ ] Handler in Task-Queue-Service registrieren (switch case ergaenzen)
- [ ] Commit

---

## Empfohlene Reihenfolge

```
Prioritaet HOCH (zuerst):
  10. Follow-up Handler          ~0.5 Tage
   1. Mahnwesen 3 Stufen         ~3 Tage

Prioritaet MITTEL:
   4. Content-Board Default      ~0.5 Tage
   2. SEO-Keyword-Recherche      ~1.5 Tage
   5. KPI-Dashboard              ~3 Tage
   6. IT-Assessment              ~3 Tage
   7. Chatbot-Builder            ~4 Tage

Prioritaet NIEDRIG:
   3. Grammatik-Pruefung         ~1.5 Tage
   8. Monitoring-Widget          ~1.5 Tage
   9. Social Media Inbox         ~4 Tage
```

**Gesamt: ~23 Arbeitstage** (bei sequentieller Abarbeitung)
**Parallelisiert: ~15 Tage** (1+10 parallel mit 4+2, dann 5+6 parallel, dann 7)
