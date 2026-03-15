# KI-gestuetzte Firmen-Aktionen

## Uebersicht

Erweitert die Firmen-Aktivitaeten um ein Aktions-Grid mit 20 KI-Buttons. Jeder Button generiert per AI eine kontextbezogene Aktion (E-Mail, Analyse, Leitfaden etc.), die als Aktivitaet gespeichert wird.

## Aktions-Katalog

### Kommunikation (blau)
| Slug | Name | Activity-Type | Beschreibung |
|------|------|--------------|--------------|
| `company_first_contact` | Erstansprache-E-Mail | email | Personalisierte Erstansprache |
| `company_follow_up` | Follow-Up E-Mail | email | Nachfass-Mail nach Kontakt |
| `company_appointment` | Terminvereinbarung | email | E-Mail mit Terminvorschlag |
| `company_thank_you` | Dankesschreiben | email | Nach Meeting/Termin |

### Vertrieb (gruen)
| Slug | Name | Activity-Type | Beschreibung |
|------|------|--------------|--------------|
| `company_offer_letter` | Angebots-Begleitschreiben | email | Brief zum Angebot |
| `company_cross_selling` | Cross-Selling Vorschlag | note | Zusatzprodukte identifizieren |
| `company_upselling` | Upselling Pitch | note | Upgrade-Moeglichkeiten |
| `company_reactivation` | Reaktivierung | email | Inaktive Firma ansprechen |

### Analyse (lila)
| Slug | Name | Activity-Type | Beschreibung |
|------|------|--------------|--------------|
| `company_swot` | SWOT-Analyse | note | Staerken/Schwaechen der Beziehung |
| `company_competitor_analysis` | Wettbewerbsvergleich | note | Positionierung vs. Mitbewerber |
| `company_needs_analysis` | Bedarfsanalyse | note | Potenzielle Beduerfnisse ermitteln |
| `company_development_plan` | Kundenentwicklungsplan | note | Roadmap fuer Zusammenarbeit |

### Marketing (amber)
| Slug | Name | Activity-Type | Beschreibung |
|------|------|--------------|--------------|
| `company_social_post` | Social Media Post | note | Ueber Zusammenarbeit berichten |
| `company_reference_request` | Referenz-Anfrage | email | Um Empfehlung bitten |
| `company_newsletter` | Newsletter-Segment | note | Firma-spezifischer Content |
| `company_event_invite` | Event-Einladung | email | Zu Veranstaltung einladen |

### Intern (grau)
| Slug | Name | Activity-Type | Beschreibung |
|------|------|--------------|--------------|
| `company_meeting_summary` | Meeting-Zusammenfassung | meeting | Gespraechsprotokoll |
| `company_call_guide` | Gespraechsleitfaden | call | Vorbereitung auf Telefonat |
| `company_next_steps` | Handlungsempfehlung | note | Naechste Schritte vorschlagen |
| `company_risk_assessment` | Risikobewertung | note | Kundenrisiko einschaetzen |

## Technische Architektur

### 1. Neue Dateien
- `src/lib/services/ai/company-actions.service.ts` - Orchestriert KI-Generierung
- `src/lib/services/ai-prompt-template.company-actions.ts` - 20 Template-Defaults
- `src/app/api/v1/companies/[id]/actions/generate/route.ts` - API-Endpunkt
- `src/app/intern/(dashboard)/contacts/companies/[id]/_components/company-actions-grid.tsx` - UI Grid

### 2. API
```
POST /api/v1/companies/[id]/actions/generate
Body: { actionSlug: string }
Response: { subject, content, type, metadata: { actionSlug, generatedAt } }
```

Bei `save: true` wird direkt eine Activity erstellt. Sonst nur Preview.

### 3. Datenfluss
1. Button-Klick sendet actionSlug + companyId
2. Backend laedt Firmendaten + Kontakte + letzte Aktivitaeten
3. Template via `AiPromptTemplateService.getOrDefault(tenantId, slug)`
4. Placeholders: companyName, companyIndustry, companyCity, companyStatus, contactPersonName, contactPersonTitle, recentActivities, companyNotes
5. AI-Completion mit context logging
6. Response als Preview an Frontend
7. User kann editieren, dann als Activity speichern

### 4. UI-Komponente CompanyActionsGrid
- Kategorisierte Buttons in 5 Gruppen
- Farbcodiert nach Kategorie
- Loading-State pro Button
- Preview-Dialog mit Editor nach Generierung
- Speichern erstellt Activity und schliesst Dialog

### 5. Seed
- 20 neue Default-Templates werden bei Tenant-Erstellung geseeded
- Bestehende Tenants bekommen Templates via Seed-Endpoint
