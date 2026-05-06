# Social-Media-Modul — Design Spec

**Datum:** 2026-05-05
**Status:** Approved (Brainstorming)
**Owner:** Tino Stenzel

## Overview

Neues Modul: Social-Media-Beiträge erstellen, freigeben, terminieren, automatisch über Cron
auf verbundene Accounts publizieren. **Single-tenant**: ein Account-Set pro Org (nicht pro
User). Plattform-Priorität: **Facebook + Instagram (must-have)**, **X (super)**, **LinkedIn
(nice-to-have)**. Erwarteter Durchsatz < 50 Posts/Monat. Generator-Workflow (Text + Bilder
via blog-ai-Pipeline) wird in einer späteren Phase aus dem Workflow-Engine-Modul heraus
getriggert; das vorliegende Modul ist auch ohne Generator nutzbar (manuelle Anlage +
Freigabe + Schedule).

## Architecture Decision

**Adapter-Pattern + zentrale Pipeline.** Ein Master-Post (`social_posts`) hält den
Default-Body und das Default-Bild; pro Plattform existiert ein `social_post_targets`-Eintrag
mit optionalem Body-Override. Beim Publish werden alle Targets eines Posts parallel
abgearbeitet — ein fehlschlagendes Target blockiert die anderen nicht. Plattform-Calls
laufen über austauschbare Provider-Klassen (`MetaProvider`, `XProvider`, `LinkedInProvider`),
die alle ein gemeinsames `SocialProvider`-Interface (`publish(target, post)`) implementieren.

Auto-Posting läuft über die existierende `task_queue` aus dem Termin-Modul: ein Schedule
legt pro Target einen Task `social_post_publish` mit `scheduled_for` an; der Cron-Tick
führt aus, mit 3× exponential backoff bei Fehler.

Token-Refresh läuft als eigener proaktiver Cron-Job (nicht lazy on-publish), damit das
Publish nicht durch Refresh-Latenz oder -Fehler blockiert wird.

## 1. Plattform-Constraints

| Plattform | API | Account-Typ | Bilder | Body-Limit |
|---|---|---|---|---|
| Facebook | Graph API v19.0 `/{page-id}/feed` | FB-Page | optional, public URL | unbegrenzt |
| Instagram | Graph API v19.0 `/{ig-user-id}/media` + `/media_publish` | IG-Business, verknüpft mit FB-Page | **pflicht**, public URL | 2200 Zeichen Caption |
| X | API v2 `POST /2/tweets` | beliebiger Account | optional, Upload via v1.1 `/media/upload` | 280 Zeichen |
| LinkedIn | REST API `POST /rest/posts` | Personal oder Company | optional, Upload via `/assets` | 3000 Zeichen |

**Wichtig:** IG-Posting setzt zwingend einen IG-Business-Account voraus, der über eine
FB-Page verknüpft ist. Personal-Instagram geht **nicht** über die API. Bilder müssen Meta
über eine **öffentlich abrufbare URL** zugänglich sein — wir hosten in `/data/uploads`
(existing) und servieren über den App-eigenen `/uploads/...`-Pfad.

## 2. Datenmodell

Alle Zeiten in DB sind UTC (`timestamptz`).

### 2.1 `social_oauth_accounts`

Verbundener Plattform-Account (1 pro Provider, single-tenant).

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `provider` | varchar(20) | `facebook` \| `instagram` \| `x` \| `linkedin` |
| `external_account_id` | varchar(255) | Meta page_id / IG ig_user_id / X user_id / LI urn |
| `account_name` | varchar(255) | Anzeigename ("xKMU FB-Page") |
| `access_token_enc` | text | AES-256-GCM verschlüsselt |
| `refresh_token_enc` | text NULL | Meta verwendet long-lived tokens (60 Tage), kein Refresh; X/LI haben Refresh |
| `token_expires_at` | timestamptz NULL | NULL = kein Ablauf bekannt |
| `scopes` | text[] | erteilte OAuth-Scopes |
| `meta` | jsonb | provider-spezifische Daten (z.B. FB-Page-Token-Details, IG-User-Pic) |
| `status` | varchar(20) | `connected` \| `revoked` \| `expired` |
| `connected_by` | uuid FK → users | wer hat verbunden |
| `revoked_at` | timestamptz NULL | |
| `created_at` / `updated_at` | timestamptz | |

UNIQUE INDEX (`provider`) WHERE `status = 'connected'` — pro Provider nur ein aktiver Account.

### 2.2 `social_posts`

Master-Beitrag.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `status` | varchar(20) | `draft` \| `approved` \| `scheduled` \| `posted` \| `partially_failed` \| `failed` |
| `master_body` | text | Default-Caption für alle Plattformen |
| `master_image_path` | varchar(500) NULL | App-relativer Pfad in `/data/uploads/social/...` |
| `scheduled_for` | timestamptz NULL | wann publishen (NULL bei draft/approved) |
| `created_by` | uuid FK → users | |
| `approved_by` | uuid FK → users NULL | |
| `approved_at` | timestamptz NULL | |
| `created_at` / `updated_at` | timestamptz | |

Status-Übergang:
- `draft` → `approved` (User-Freigabe)
- `approved` → `scheduled` (User legt Termin im Kalender fest)
- `scheduled` → `posted` (alle Targets ok) / `partially_failed` (≥1 Target fail) / `failed` (alle Targets fail)

### 2.3 `social_post_targets`

Pro verbundenem Provider 1 Target, wenn Post für ihn aktiv ist.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `post_id` | uuid FK → social_posts ON DELETE CASCADE | |
| `provider` | varchar(20) | matches social_oauth_accounts.provider |
| `body_override` | text NULL | NULL = use post.master_body |
| `publish_status` | varchar(20) | `pending` \| `publishing` \| `posted` \| `failed` |
| `external_post_id` | varchar(255) NULL | nach erfolgreichem Publish |
| `external_url` | varchar(500) NULL | direkter Link zum Post |
| `retry_count` | int NOT NULL DEFAULT 0 | |
| `last_error` | text NULL | |
| `posted_at` | timestamptz NULL | |
| `created_at` / `updated_at` | timestamptz | |

UNIQUE (`post_id`, `provider`).

### 2.4 Wiederverwendet aus Termin-Modul

- `task_queue` (existiert) — neue Task-Typen: `social_post_publish`, `social_token_refresh`
- `audit_logs` (existiert) — neue Actions: `social_account_connected`, `social_account_revoked`, `social_post_created`, `social_post_approved`, `social_post_scheduled`, `social_post_published`, `social_post_failed`

## 3. OAuth-Flow

Pattern analog zu `src/app/api/google-calendar/oauth/{start,callback}/route.ts`:

1. `GET /api/social/{provider}/oauth/start` → State signieren, Redirect zu Provider
2. Provider redirected zu `GET /api/social/{provider}/oauth/callback?code=...&state=...`
3. Callback validiert State, tauscht Code gegen Token, persistiert in `social_oauth_accounts`
4. Token-Encryption über existierenden `calendar-token-crypto.ts` Helper (in Phase 1
   refactored zu generischem `token-crypto.ts` für Re-Use)

## 4. Publish-Pipeline

```
User → "Posten" / Cron-Tick
       ↓
SocialPostService.publish(postId)
       ↓ (für jedes Target des Posts parallel)
    Provider.publish(target, post)
       ↓
    Target update: posted | failed (mit retry_count++ + last_error)
       ↓
Post.status update: posted (alle ok) | partially_failed | failed
```

**Retry-Policy:** 3× exponential backoff (1min, 5min, 30min). Wenn `retry_count` ≥ 3:
`failed`, Notification an `created_by`. Bei `401 unauthorized` (revoked token): Account auf
`revoked`, alle pending Targets dieses Providers → `failed` (kein Retry, weil es nicht
besser wird).

**Token-Refresh-Cron:** läuft 1× pro Stunde, refresht alle Accounts mit
`token_expires_at < now() + 24h`. Schlägt der Refresh fehl → Account auf `expired` +
Notification.

## 5. UI-Struktur

| Pfad | Inhalt |
|---|---|
| `/intern/integrations/social` | Account-Connect-UI (1 Karte pro Provider, Connect/Disconnect-Button, Status) |
| `/intern/social/posts` | Liste aller Posts mit Status-Filter, "Neu anlegen" |
| `/intern/social/posts/[id]` | Post-Editor (Master-Body, Bild-Upload, Per-Plattform-Overrides, Vorschau, Freigabe-Button) |
| `/intern/social/kalender` | Drag-Drop-Wochen/Monatsansicht, freigegebene Posts links als Liste, ziehen auf Datum/Uhrzeit |

Sidebar-Eintrag: "Social Media" mit `requiredModule: 'social_media'`.

## 6. Phasenplan

| # | Phase | Status | Plan |
|---|---|---|---|
| 1 | Meta OAuth-Connection (FB-Page + IG-Business) | TBD | `2026-05-05-social-media-phase1-meta-oauth.md` |
| 2 | Post-Pipeline (Schema + Adapter + manuelles Jetzt-Posten) | Skizze §6.2 | später detailliert |
| 3 | Posting-Kalender + Cron-Auto-Posting → MVP-Ende | Skizze §6.3 | später detailliert |
| 4 | X-Provider | Skizze §6.4 | später detailliert |
| 5 | Generator + Freigabe-UI (BLOCKED auf Workflow-Engine) | Skizze §6.5 | nach Workflow-Engine |
| 6 | LinkedIn-Provider | Skizze §6.6 | am Ende |

### 6.1 Phase 1 — Meta OAuth-Connection

Siehe separater Plan. Liefert: verbundener FB-Page-Account + IG-Business-Account, UI unter
`/intern/integrations/social`, encrypted Token-Storage, Token-Refresh-Cron-Job-Skeleton
(noch ohne Posts).

### 6.2 Phase 2 — Post-Pipeline (Skizze)

- Schema `social_posts` + `social_post_targets`
- `SocialProvider`-Interface + `MetaProvider.publish()` (FB-Page-Feed + IG-Media + Media-Publish)
- `SocialPostService.publish(postId)` ruft alle Targets parallel
- UI `/intern/social/posts` (Liste, Editor, Bild-Upload zu `/data/uploads/social/`, Pre-View)
- "Jetzt posten"-Button (synchroner Test, kein Schedule)
- Audit-Logs: created/approved/published/failed
- Tests: `MetaProvider.publish` mit gemockter `fetch`, `SocialPostService.publish` mit happy + partial-failure
- **Cleanup:** `google_calendar_config` umbenennen → z.B. `app_secrets` (Naming-Issue aus Phase 1: Tabelle hält jetzt auch Social-Media-Token-Encryption-Key + appointmentTokenSecret, der für alle OAuth-Flows als HMAC-Key dient — der Name ist semantisch falsch). Migration: rename table + alle Imports (`googleCalendarConfig` → `appSecrets` in `schema.ts`, `CalendarConfigService` → `AppSecretsService`, alle ~15 Call-Sites). Reine Refactoring, kein Datenverlust. Bietet sich an, da Phase 2 sowieso Schema-Migrationen anlegt.

### 6.3 Phase 3 — Kalender + Cron-Auto-Posting (Skizze)

- Drag-Drop-Kalender unter `/intern/social/kalender` (re-use `WeekCalendarView`-Pattern aus Termin-Modul, anpassen)
- Approved Posts werden auf Datum/Uhrzeit gezogen → `social_posts.scheduled_for` + `status='scheduled'` + Task `social_post_publish` in `task_queue`
- Cron-Tick führt fällige Tasks aus (delegiert an `SocialPostService.publish`)
- Retry-Policy 3× exponential backoff
- Audit-Log: scheduled, published_via_cron
- → **MVP-Ende.** System nutzbar: User legt manuell Post an → freigibt → schedult → Cron postet automatisch.

### 6.4 Phase 4 — X-Provider (Skizze)

- `XProvider implements SocialProvider`
- OAuth 2.0 PKCE-Flow zu X
- Free Tier reicht (500 Posts/Monat)
- Body-Validierung 280 Zeichen
- Tests analog Phase 2

### 6.5 Phase 5 — Generator + Freigabe-UI (BLOCKED)

- **Voraussetzung:** Workflow-Engine-Modul fertig (Phasen 1–3 sind in `plans/` angelegt; Status prüfen vor Start)
- `SocialPostGenerator` als Workflow-Step: ruft blog-ai für Text + `image-generation.service.ts` für Bild
- Output: `social_posts` mit `status='draft'`, Master-Body + Master-Image
- Freigabe-UI an `/intern/social/posts` (Diff-View Generator-Output ↔ User-Edits, Approve/Discard)

### 6.6 Phase 6 — LinkedIn (Skizze)

- `LinkedInProvider implements SocialProvider`
- OAuth 2.0 zu LinkedIn (Personal + Company-Page-Scopes)
- Tests analog Phase 2

## 7. Decisions (entschieden im Brainstorming)

| Frage | Entscheidung | Begründung |
|---|---|---|
| Token-Refresh-Strategie | Proaktiver Cron-Job (1×/h) | Publish-Pfad bleibt schnell, kein Cascading-Fail bei Refresh-Problem |
| Retry-Policy | 3× exponential backoff (1m/5m/30m), dann failed + Notification | Standard-Pattern, balanciert UX vs. API-Limits |
| Revoked-Token-Handling | Account → revoked, alle pending Targets dieses Providers → failed | Kein Retry sinnvoll; User muss neu connecten |
| Image-Hosting | Lokal `/data/uploads/social/` + serven via `/uploads/social/...` | IG braucht zwingend public URL; Meta-CDN-Upload nur FB-only, also nicht uniform |
| Multi-Image (IG Carousel) | **Out of Scope V1** | Carousel-Endpoint ist 3-stufig (children → carousel-container → publish), eigene UX nötig — separate Phase, wenn dran |
| Body-Varianten | Master-Body + optionale Plattform-Overrides | Realistisches Mittelding zwischen "ein Body für alle" (X 280-Limit nicht möglich) und "pro Plattform separat" (zu viel UI) |

## 8. Out of Scope (V1)

- IG-Carousel / Multi-Image-Posts
- Stories / Reels (anderes API-Subset)
- Hashtag-Recherche oder -Vorschläge
- Analytics / Engagement-Tracking (Likes/Comments lesen)
- Comment-Replies aus dem Modul heraus
- A/B-Testing von Body-Varianten
- Mehrere Accounts pro Provider (z.B. 2 FB-Pages parallel)
- LinkedIn vor Phase 6
- Preview-Rendering 1:1 wie es bei Meta aussieht (nur Text + Bild-Vorschau)
