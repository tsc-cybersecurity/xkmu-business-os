/**
 * Migration Registry — zentrale Liste aller DB-Migrationen.
 *
 * Neue Migration hinzufuegen:
 * 1. SQL-Datei in src/lib/db/migrations/ anlegen (z.B. 002_feature_x.sql)
 * 2. Hier als Eintrag registrieren
 * 3. Bei naechstem App-Start wird sie automatisch ausgefuehrt
 *
 * Regeln:
 * - Jede Migration muss idempotent sein (IF NOT EXISTS, IF NOT EXISTS)
 * - Reihenfolge bestimmt Ausfuehrungsreihenfolge
 * - Einmal ausgefuehrt, nie wieder (Tracking via _migrations Tabelle)
 */

export interface Migration {
  /** Eindeutiger Name — identisch mit Dateiname */
  name: string
  /** Kurzbeschreibung fuer Logs */
  description: string
}

export const MIGRATIONS: Migration[] = [
  {
    name: '001_framework_v2.sql',
    description: 'Deliverable-Module, Deliverables, Execution Logs + SOP-Erweiterungen',
  },
  {
    name: '002_tenant_consolidation.sql',
    description: 'Tenant-Konsolidierung: default -> xkmu (Option B: CRM-Seed verwerfen)',
  },
  {
    name: '003_drop_tenant_id.sql',
    description: 'IRREVERSIBEL: DROP tenant_id aus 67 Tabellen, FKs + Indexes entfernt',
  },
  {
    name: '004_rename_tenants_to_organization.sql',
    description: 'Tabelle tenants → organization inkl. Indexes und Constraints',
  },
  {
    name: '005_custom_ai_prompts.sql',
    description: 'Neue Tabelle custom_ai_prompts für user-defined KI-Prompts',
  },
  {
    name: '006_email_account_signature.sql',
    description: 'email_accounts.signature — HTML-Signatur pro Account',
  },
  {
    name: '007_blog_categories.sql',
    description: 'Neue Tabelle blog_categories für verwaltbare Blog-Kategorien',
  },
  {
    name: '008_portal_users.sql',
    description: 'users.companyId + Invite-Flow Felder + Rolle portal_user',
  },
  {
    name: '009_audit_logs.sql',
    description: 'Revisionssichere Audit-Trail (audit_logs + Indexe)',
  },
  {
    name: '010_company_change_requests.sql',
    description: 'Portal P2: Firmendaten-Antrags-Workflow (company_change_requests + Indexe)',
  },
  {
    name: '011_orders.sql',
    description: 'Portal P4: orders + order_categories + Default-Kategorien (Seed)',
  },
  {
    name: '012_chat_messages.sql',
    description: 'Portal P5: chat_messages für Kunden-Admin-Chat (eine Thread pro Firma)',
  },
  {
    name: '013_portal_documents.sql',
    description: 'Portal P6 — portal_documents + portal_document_categories + seed',
  },
  {
    name: '014_persons_portal_user.sql',
    description: 'persons.portal_user_id nullable FK + Backfill per (email, companyId)-Match',
  },
  {
    name: '015_workflow_schedule.sql',
    description: 'workflows.schedule jsonb column for scheduled triggers (interval + dailyAt)',
  },
  {
    name: '016_courses.sql',
    description: 'Onlinekurse: courses, modules, lessons, assets',
  },
  {
    name: '017_course_lesson_blocks.sql',
    description: 'Onlinekurse Sub-3 prep: lesson content blocks (markdown + cms-block refs) + 6 course block types',
  },
  {
    name: '018_course_block_templates_seed.sql',
    description: 'Onlinekurse Sub-3 prep: 12 system-templates für die 6 course block types',
  },
  {
    name: '019_block_field_definitions.sql',
    description: 'Sub-2c: structured field_definitions für 12 lesson-verfügbare Block-Typen',
  },
  {
    name: '020_agent_system_phase1.sql',
    description: 'Agent-System Phase 1: pgvector + pg_trgm + 6 agent_*-Tabellen + task_queue-Index',
  },
  {
    name: '021_agent_definitions_seed.sql',
    description: 'Agent-System Phase 5: Seed der 3 Default-Smart-Worker (writer/researcher/generalist)',
  },
  {
    name: '022_agent_goal_templates.sql',
    description: 'Agent-System Phase 8: agent_goal_templates + 3 Default-Seeds',
  },
  {
    name: '023_agent_cost_events_index.sql',
    description: 'Agent-System Phase 8: Performance-Index auf agent_cost_events.occurred_at DESC',
  },
  {
    name: '024_agent_system_prompts_seed.sql',
    description: 'Agent-System: Orchestrator-Plan/Replan + Smart-Worker-Loop-Suffix als DB-Eintrage',
  },
  {
    name: '025_calendar_per_calendar_sync.sql',
    description: 'Calendar: Sync-State pro Kalender (statt nur primary) — Watch-Channel + syncToken auf user_calendars_watched',
  },
  {
    name: '026_external_busy_unique_index.sql',
    description: 'Calendar: stelle uq_external_busy_event(googleCalendarId, googleEventId) sicher — Bug-Fix fuer ON CONFLICT 42P10',
  },
  {
    name: '027_drop_calendar_account_legacy_sync_state.sql',
    description: 'Calendar: drop ungenutzte Sync-State-Spalten von user_calendar_accounts (Cleanup nach Migration 025)',
  },
  {
    name: '028_api_doc_annotations.sql',
    description: 'API-Doku: persistente KI-generierte Annotationen fuer Endpoints ohne handgepflegte Registry-Eintraege',
  },
  {
    name: '029_seo_quickwins_local.sql',
    description: 'SEO Quick Wins: Weimar/Thueringen in Hero-Subheadlines, Title-Tags und Meta-Descriptions der 5 Kernseiten',
  },
  {
    name: '030_seo_faqs.sql',
    description: 'SEO FAQs: FAQ-Sektionen fuer Startseite (8 FAQs) + KI/IT/Cybersecurity-Pillar-Seiten (je 4 FAQs) inkl. Schema.org-JSON-LD',
  },
  {
    name: '031_seo_regional_thueringen.sql',
    description: 'SEO Korrektur: regionaler Fokus Thueringen statt DACH-Raum auf Pillar-Subheadlines und Kontakt-Meta',
  },
  {
    name: '032_about_page.sql',
    description: 'Ueber-uns-Seite: Gruender-Story, Philosophie, Mission, Team (Tino Stenzel, IT-Grundschutz-Praktiker), Werte + Nav-Eintrag',
  },
  {
    name: '033_nis2_landingpage.sql',
    description: 'NIS-2-Landingpage: Intro, Betroffenheit, 6 Kernpflichten, 10-Punkte-Selbstcheck, Beratungsablauf, 5 FAQs + Footer-Nav',
  },
  {
    name: '034_internal_linking.sql',
    description: 'Interne Verlinkung: Cross-Sell-Bloecke auf KI/IT/Cyber/NIS-2/Ueber-uns mit Links zu jeweils 3 verwandten Seiten',
  },
  {
    name: '035_eeat_trust_stripe.sql',
    description: 'E-E-A-T Trust-Stripe: 4-Spalten-Stats-Block (Erfahrung/BSI/Region/Festpreise) auf Startseite und Ueber-uns',
  },
  {
    name: '036_fix_nis2_icon.sql',
    description: 'NIS-2-Icon-Fix: ShieldAlert (nicht im Mapper) durch Scale (Justizwaage) ersetzen',
  },
  {
    name: '037_ai_search_answers.sql',
    description: 'AI-Search-Antworten: 3 entitaetsdichte Q/A fuer ChatGPT/Perplexity/SGE auf der Startseite ergaenzt',
  },
  {
    name: '038_blog_nis2_pilot.sql',
    description: 'Blog-Pilotartikel: NIS-2 fuer kleine Unternehmen (~1.300 Woerter, Keyword-Cluster NIS-2 KMU)',
  },
  {
    name: '039_topic_routing.sql',
    description: 'Topic-Routing: CTA-Links auf Pillar-/NIS-2-Seiten geben das Thema an /kontakt weiter (Pre-Fill)',
  },
  {
    name: '040_module_ctas.sql',
    description: 'Conversion-CTAs: 19 Modul-Detailseiten (A1-A5/B1-B5/C1-C6/D1-D3) + /loesungen mit problemorientierten Headlines + Topic-Routing',
  },
  {
    name: '041_kurse_cms_page.sql',
    description: '/kurse als CMS-Page editierbar: Hero + Intro-Text editierbar, dynamische Course-Liste haengt automatisch darunter',
  },
  {
    name: '042_module_ctas_fix_slugs.sql',
    description: 'Fix Migration 040: Modul-CTAs mit korrekten langen Slugs (LIKE-Pattern statt exact match)',
  },
  {
    name: '043_cta_style_dark_full.sql',
    description: 'CTA-Bloecke auf dark-Hintergrund und volle Breite (Pillar-Seiten, Modul-Detailseiten, NIS-2, Ueber-uns)',
  },
  {
    name: '044_seo_robots_nap.sql',
    description: 'SEO-Fixes: in_sitemap=true fuer alle Pillar-/Pflichtseiten + NAP-Box (Sitz/Telefon/E-Mail/Erreichbarkeit) als Text-Block vor Kontaktformular',
  },
  {
    name: '045_seo_h1_titles.sql',
    description: 'SEO H1+Title-Tags: 8 Hauptseiten (Pillars, Loesungen, NIS-2, Ueber-uns, Kontakt, Kurse) mit Keyword+KMU+Region',
  },
  {
    name: '046_nav_kurse.sql',
    description: 'Nav-Fix: /kurse als Header-Eintrag (sort_order 4) — fehlte seit Migration 041',
  },
  {
    name: '047_kurse_cms_reapply.sql',
    description: 'CMS-Fix: /kurse-Page defensiv re-applyen falls Migration 041 nicht durch (Page existiert nicht in DB → CMS-Liste leer)',
  },
  {
    name: '048_kurse_full_cms.sql',
    description: '/kurse vollstaendig CMS-bearbeitbar: neuer course-listing Block-Typ + Page mit Hero/Intro/CourseListing/CTA design-konsistent mit Pillar-Seiten',
  },
]
