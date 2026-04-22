# Portal-P1 — Fundament (Auth, Rolle, Routing)

**Datum:** 2026-04-22
**Projekt:** xkmu-business-os Customer Portal
**Phase:** P1 (von geplanten P1–P5; P6 explizit deferred)

## 1. Kontext

Geplantes Customer-Portal, in dem jede Firma eigene Portal-User erhält.
Diese sollen perspektivisch: eigene Firmendaten über Antrag ändern (P2),
Verträge und Projekte lesend einsehen (P3), Aufträge nach Vertrags-
kontingent anlegen (P4) und mit dem Admin chatten (P5). Digitale
Inhalte/Online-Kurse (P6) sind später.

P1 liefert **nur** das Fundament: Rolle, Identität, Zugang, Routing,
minimales Dashboard mit Platzhaltern. Ohne P1 funktionieren P2–P5
nicht; mit P1 stehen sie auf einer belastbaren Basis.

## 2. Entscheidungen aus dem Brainstorm

| Thema | Entscheidung |
|---|---|
| User↔Firma | Mehrere Portal-User pro Firma via `users.companyId` |
| Onboarding | Hybrid: Admin setzt Passwort ODER verschickt Invite-Link (Einmal-Token 7d) |
| Portal-URL | `/portal/*` (gleiche Next.js-App, eigenes Layout) |
| Access-Trennung | Middleware: `role !== 'portal_user'` darf kein `/portal`, `role === 'portal_user'` darf kein `/intern` |
| Dashboard-Scope | Nur Begrüßung + read-only Firmen-Kerndaten + deaktivierte Platzhalter für P2–P5 |

## 3. Datenmodell

### 3.1 Änderungen an `users`

```
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token);
```

- `companyId` ist NULL für interne Mitarbeiter, gefüllt für Portal-User.
- `inviteToken` ist 32 Byte hex (`crypto.randomBytes(32).toString('hex')` → 64 Zeichen).
- `inviteTokenExpiresAt` = `now() + 7 days` beim Setzen; nach Einlösung
  beides auf NULL.
- `firstLoginAt` markiert den ersten erfolgreichen Login (via Invite-Flow
  oder direkt gesetztes Passwort).

### 3.2 Neue Rolle

In `src/lib/types/permissions.ts` wird `portal_user` als gültiger Rollen-
Slug aufgenommen.
In `roles`-Tabelle Seed-Eintrag:
```
name: 'portal_user'
displayName: 'Portal-Nutzer'
description: 'Extern angelegter Kunden-Zugang; Firmenbezogen'
isSystem: true
```

**Permissions in P1**: keine CRUD-Flags auf andere Module. Der Rollen-
Check dient in P1 nur dem Routing-Gate. Echte Modul-Berechtigungen
kommen mit P2–P5 nach Bedarf.

### 3.3 Migration

Eigene Migration `008_portal_users.sql`, idempotent (`IF NOT EXISTS`,
UPSERT-Pattern für Rolle). Auch in `entrypoint.prod.sh` als
pre-Drizzle-SQL, damit drizzle-kit push nicht interaktiv nach Column-
rename fragt.

## 4. Admin-UX: Portal-User anlegen

### 4.1 Neuer Tab "Portal-Zugänge" auf `/intern/contacts/companies/[id]`

Liste aller `users` mit `companyId === <firma>`:
- Spalten: Name, E-Mail, Status (`Aktiv` / `Eingeladen` / `Deaktiviert`),
  Zuletzt-Login, Aktionen
- Aktionen: Invite erneut senden (wenn Status `Eingeladen`), Deaktivieren
  (`users.status = 'inactive'`), Wieder-Aktivieren

Sichtbarkeit: Rolle mit `users.create` + `companies.update`.

### 4.2 Dialog "Portal-User anlegen"

Button öffnet Tab-Dialog:

**Tab 1 — Passwort direkt**
- Eingaben: Vorname, Nachname, E-Mail, Passwort (+ Button "Generieren"
  für 16-Zeichen-Zufallspasswort; Admin kopiert/teilt manuell)
- Action: `POST /api/v1/companies/[id]/portal-users` mit `method: 'password'`
- Erzeugt User: `role='portal_user'`, `status='active'`, `companyId`,
  `passwordHash`. Keine Mail.

**Tab 2 — Invite-Link**
- Eingaben: Vorname, Nachname, E-Mail
- Action: `POST /api/v1/companies/[id]/portal-users` mit `method: 'invite'`
- Erzeugt User: `role='portal_user'`, `status='active'`, `companyId`,
  `passwordHash = <dummy>`, `inviteToken` +
  `inviteTokenExpiresAt = now() + 7d`
- `<dummy>`-Hash ist ein fester Bcrypt-Hash über eine intern nicht
  nutzbare Zufallsmark (z.B. `$2b$10$...` mit neu gewürfeltem
  Einmalsalt im Create-Handler). Damit kann der User **nicht** einfach
  per Passwort-Login reinkommen bevor er den Invite-Link gelöst hat.
  Nach dem Einlösen wird `passwordHash` durch den echten Hash ersetzt.
- Schreibt Task in `task_queue` (`type='email'`, `templateSlug='portal_invite'`)
  → wird über das existierende `EmailService`-Routing (`email_accounts`-
  erst) versendet.

### 4.3 E-Mail-Template `portal_invite`

Seed in `DEFAULT_EMAIL_TEMPLATES`:
```
subject: Ihr Zugang zum Kundenportal von {{firma}}
body:
  <p>Hallo {{name}},</p>
  <p>Sie wurden als Zugang zum Kundenportal von
     <strong>{{firma}}</strong> angelegt. Bitte klicken Sie auf den
     folgenden Link, um Ihr Passwort festzulegen und den Zugang zu
     aktivieren. Der Link ist 7 Tage gültig.</p>
  <p><a href="{{inviteUrl}}">Zugang aktivieren</a></p>
  <p>Mit freundlichen Grüßen<br>{{absender}}</p>
Placeholders:
  name, firma, inviteUrl, absender
```

`inviteUrl` wird serverseitig zu `<baseUrl>/portal/accept-invite?token=<token>`
aufgelöst bevor das Template gerendert wird.

## 5. Portal-UX

### 5.1 Route-Group

Neue Next.js Route-Group unter `src/app/portal/`:

```
src/app/portal/
  layout.tsx            — Portal-Shell (Header, Sidebar, Footer)
  page.tsx              — Dashboard (P1: Platzhalter-Cards)
  accept-invite/
    page.tsx            — Öffentliche Invite-Akzeptanz-Seite
```

Das Layout ist **nicht** unter `(dashboard)` gruppiert — eigenes, schmales
Layout. Farbwelt neutral, klare Trennung von `/intern`.

### 5.2 Dashboard (`/portal`)

```
┌─────────────────────────────────────────────┐
│  Willkommen zurück, {firstName}              │
│  Sie sind angemeldet für: {companyName}      │
├─────────────────────────────────────────────┤
│  Meine Firmendaten                 [ändern] │  ← disabled
│  {name} · {street} · {postalCode} {city}     │
│  Kontakt: {phone} · {email}                  │
├─────────────────────────────────────────────┤
│  Verträge             kommt in Kürze         │  ← disabled card
│  Projekte             kommt in Kürze         │
│  Aufträge             kommt in Kürze         │
│  Chat                 kommt in Kürze         │
└─────────────────────────────────────────────┘
```

Die read-only Firmendaten kommen aus `companies` per eigenem Service-
Endpoint: `GET /api/v1/portal/me/company` — liefert nur die für Portal-
User relevanten Felder (keine `notes`, `customFields`, `aiResearch`).

### 5.3 Accept-Invite (`/portal/accept-invite?token=...`)

Öffentlich, keine Auth. Formular:
- Passwort (min. 10 Zeichen, 1 Buchstabe + 1 Zahl)
- Passwort bestätigen
- Submit → `POST /api/v1/auth/accept-invite`
  - Findet User per Token (nur wenn `inviteTokenExpiresAt > now()`)
  - Setzt `passwordHash = bcrypt(pw)`, `invite_token = NULL`,
    `invite_token_expires_at = NULL`, `first_login_at = now()`
  - Loggt `portal_user.invite_accepted` in `auditLog`
  - Issued Session-Cookie → Redirect auf `/portal`
- Fehlerfälle:
  - Token ungültig / abgelaufen → Meldung + "Beim Admin neuen Link anfordern"
  - Doppelt-Einlösung (Token bereits NULL) → dieselbe Meldung

## 6. Access-Gating

Neue oder erweiterte Middleware (`src/proxy.ts` oder `middleware.ts`):

```ts
// Pseudo-code
if (path.startsWith('/portal')) {
  if (path === '/portal/accept-invite') return next() // public
  const session = verifySession(req)
  if (!session) return redirect('/login?next=' + path)
  if (session.role !== 'portal_user') return 403
  if (!session.companyId) return 403
  return next()
}

if (path.startsWith('/intern')) {
  const session = verifySession(req)
  if (!session) return redirect('/login?next=' + path)
  if (session.role === 'portal_user') return 403
  return next()
}
```

Die bestehende API-Permission-Prüfung (`withPermission`) bleibt für
`/api/v1/*` wie sie ist. `role='portal_user'` hat in P1 keine
Modul-Berechtigungen, kann also keine bestehenden Admin-APIs aufrufen.
Portal-eigene APIs leben unter `/api/v1/portal/*` und nutzen eine neue
Hilfsfunktion `withPortalAuth`, die nur `role='portal_user'` durchlässt
und die `companyId` aus der Session extrahiert.

### Login-Redirect

`/api/v1/auth/login` liefert bei Erfolg neben der Session die Rolle.
Die Login-UI redirected:
- `portal_user` → `/portal` (oder `next`-Param wenn er mit `/portal`
  beginnt)
- sonst → `/intern` (oder `next` wenn er mit `/intern` beginnt)

### JWT-Payload erweitern

Das bestehende Session-JWT muss zusätzlich `companyId` enthalten, damit
`withPortalAuth` sie aus der Session lesen kann ohne zusätzlichen
DB-Roundtrip pro Request. `createSession()` in `src/lib/auth/session.ts`
wird angepasst — bei `role='portal_user'` wird die `companyId` aus dem
User-Datensatz mit in den JWT-Claim geschrieben. Bestehende Sessions
interner User haben `companyId=null` im Token (oder fehlen den Claim —
rückwärtskompatibel).

## 7. API-Übersicht

| Methode | Pfad | Zweck | Guard |
|---|---|---|---|
| POST | `/api/v1/companies/[id]/portal-users` | Portal-User anlegen (Passwort oder Invite) | `withPermission('users','create')` + `companies.update` |
| GET | `/api/v1/companies/[id]/portal-users` | Liste der Portal-User der Firma | `withPermission('users','read')` |
| PATCH | `/api/v1/users/[id]/portal-access` | Aktivieren/Deaktivieren, Invite neu senden | `withPermission('users','update')` |
| POST | `/api/v1/auth/accept-invite` | Invite-Token einlösen, Passwort setzen, Session | **public**, Rate-Limit |
| GET | `/api/v1/portal/me/company` | Eigene Firmendaten (read-only für Dashboard) | `withPortalAuth` |

## 8. Sicherheit

- **Token-Generation:** `crypto.randomBytes(32).toString('hex')`
- **Token-Vergleich:** `crypto.timingSafeEqual` (constant-time) — verhindert
  Timing-Side-Channel
- **Einlösung:** Token + `expiresAt` in einer Query (UPDATE …
  RETURNING WHERE token = ? AND expires_at > now()); verhindert Race
- **Rate-Limit:** `rateLimit` (Redis) auf `/api/v1/auth/accept-invite`
  und `/api/v1/auth/login` (10/min/IP — existierende Utility)
- **Doppelte E-Mail:** vor Insert prüfen, dass für dieselbe `companyId`
  nicht schon ein User mit gleicher E-Mail und `role='portal_user'`
  existiert. Gleiche E-Mail in anderer Firma ist erlaubt.
- **Session-Cookie:** HttpOnly, Secure, SameSite=Lax (bestehend)
- **Passwort-Regel:** min. 10 Zeichen, ≥1 Buchstabe, ≥1 Zahl (zod-Schema)

## 9. Audit-Trail

Einträge in bestehende `auditLog`-Tabelle bei:

| Event | entityType | entityId | Felder |
|---|---|---|---|
| Portal-User angelegt | `user` | `<userId>` | `{method: 'password'\|'invite', companyId}` |
| Invite versandt | `user` | `<userId>` | `{to, tokenExpiresAt}` |
| Invite eingelöst | `user` | `<userId>` | `{ip}` |
| Portal-User deaktiviert | `user` | `<userId>` | `{by}` |
| Login erfolgreich | `user` | `<userId>` | `{ip, userAgent}` |
| Login fehlgeschlagen | `user` | `<userId>` | `{reason: 'invalid_pw'\|'inactive'}` |

`newValues` / `oldValues` befüllen wir mit den Paarungen oben als JSON.
`userId` im auditLog ist immer der **betroffene** User; der handelnde
wird über `by` in `newValues` ergänzt.

## 10. Deaktivierung

- `PATCH /api/v1/users/[id]/portal-access` mit `{action: 'deactivate'}`
  setzt `users.status = 'inactive'` und schreibt AuditLog.
- Login für `status='inactive'` wird mit "Account deaktiviert"
  abgelehnt.
- Bestehende Session bleibt gültig bis JWT-Ablauf (7d). Echter Token-
  Revoke ist ein eigener Baustein und explizit out-of-scope für P1.

## 11. Testing

- **Unit (Vitest)**:
  - Token-Generation liefert 64-Zeichen-Hex
  - `timingSafeEqual` Wrapper handhabt Längen-Mismatch korrekt
  - Passwort-Schema lehnt zu kurze/zeichenlose ab
  - `withPortalAuth` lehnt Session ohne `role='portal_user'` oder ohne
    `companyId` ab
- **Integration**:
  - Create (Passwort) → direkter Login gelingt
  - Create (Invite) → Mail in Queue → Accept-Invite setzt Passwort → Login
    gelingt; zweite Einlösung mit gleichem Token → Fehler
  - Portal-User Request auf `/intern/*` → 403
  - Interner User Request auf `/portal/*` → 403
- **E2E manuell**:
  - Admin legt Portal-User an (beide Varianten)
  - Invite-Mail kommt tatsächlich an (empfohlen: lokales Setup mit
    MailHog/SMTP-Stub)
  - Passwort-Flow komplett
  - Deaktivierung sperrt Login

## 12. Scope-Grenzen

**In P1 enthalten**
- Rolle, DB-Felder, Migration
- Admin-UI für Anlage/Liste/Deaktivierung
- Invite-Flow + E-Mail-Template
- `/portal/*` Route-Group + Layout + Dashboard mit Platzhaltern
- Access-Gating via Middleware
- Login-Redirect je Rolle
- AuditLog-Einträge

**Explizit NICHT in P1** (kommt in P2–P5)
- Firmendaten-Änderungsantrag-Workflow (P2)
- Verträge/Projekte lesend anzeigen (P3)
- Auftrags-Erstellung mit Vertragskontingenten (P4)
- Chat Kunde↔Admin (P5)
- Digitale Inhalte / Kurse (P6)
- Session-Revoke nach Deaktivierung
- Passwort-vergessen-Flow (nur Invite-Flow für P1 — Passwort-Reset kann
  ein Admin durchführen, indem er einen neuen Invite schickt)
- 2-Faktor-Authentifizierung

## 13. Deliverables-Liste

1. `src/lib/db/schema.ts` — `users` erweitern
2. `src/lib/db/migrations/008_portal_users.sql` + Registry-Eintrag
3. `docker/app/entrypoint.prod.sh` — pre-Drizzle ALTER
4. `src/lib/types/permissions.ts` — `portal_user` ergänzen
5. `src/lib/services/user.service.ts` — ggf. Helper `createPortalUser`
6. `src/lib/services/email-template.service.ts` — Template `portal_invite`
7. `src/lib/auth/with-portal-auth.ts` — neue Hilfsfunktion
8. `src/middleware.ts` (oder `proxy.ts` erweitern) — Routing-Gate
9. API:
   - `/api/v1/companies/[id]/portal-users/route.ts` (GET + POST)
   - `/api/v1/users/[id]/portal-access/route.ts` (PATCH)
   - `/api/v1/auth/accept-invite/route.ts` (POST)
   - `/api/v1/portal/me/company/route.ts` (GET)
10. `/api/v1/auth/login` — Rolle + Redirect-Hinweis im Response-Body
11. Admin-UI: Firmen-Detail um Tab "Portal-Zugänge" erweitern
12. Portal-UI: Layout, Dashboard, Accept-Invite-Seite
13. Tests gemäß Abschnitt 11

## 14. Offene Fragen (beim Implementieren zu klären)

- Branding der Portal-Oberfläche (Logo, Farben) — erstmal neutral halten,
  Feinschliff später.
- Exakter Platzhalter-Copy-Text ("kommt in Kürze") — Admin kann das
  später tunen, falls gewünscht per CMS-ähnlichem Mechanismus (out-of-scope).
- Ob `portal_user.login_failed` AuditLog-Einträge auch bei gültigen
  E-Mails angelegt werden (Attack-Surface für Enumeration) — Vorschlag:
  nur für aktive User loggen, ansonsten still verwerfen.

---

Mit Freigabe dieses Specs gehe ich in die Plan-Phase (`writing-plans`).
