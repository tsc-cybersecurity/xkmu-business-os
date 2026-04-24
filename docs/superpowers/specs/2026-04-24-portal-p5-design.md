# Portal-P5 — Kunden-Chat (Admin ↔ Firma)

**Projekt:** xkmu-business-os Customer Portal
**Phase:** P5 (setzt P1–P4 voraus)
**Datum:** 2026-04-24

## Zielbild

Portal-User und Admin können Nachrichten austauschen — **ein Chat pro Firma** (nicht pro Kontext). Einfache textbasierte Konversation ohne Datei-Uploads, mit Read-Receipts. Zentrale Admin-Übersicht aller Firmen-Chats (Split-View) neben E-Mail Inbox in der Sidebar.

**Polling-basiert** (kein WebSocket/SSE) — 15s Intervall im Portal, 20s Intervall im Admin. Pragmatischer MVP. Upgrade auf SSE später möglich, wenn User-Druck da ist.

## Abgrenzung

- **In Scope:** Chat-Persistenz, Portal-UI, Admin-UI mit Firmen-Übersicht, Read-Receipts, Unread-Badge, Audit jeder Message, Polling.
- **Out of Scope:**
  - Dateianhänge
  - E-Mail-Notifications (nur In-App)
  - WebSocket / SSE (Polling reicht für MVP)
  - Typing-Indicators / Presence
  - Message-Edit / Delete (append-only Historie)
  - Reactions / Emoji / Rich-Text

## Entscheidungen (user-bestätigt)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Thread-Granularität | Ein Chat pro Firma (global, nicht pro Kontext) |
| 2 | Dateianhänge | NEIN |
| 3 | Read-Receipts | Ja (zwei Zeitstempel pro Message: `readByPortalAt` / `readByAdminAt`) |
| 4 | Notifications | Nur In-App (Unread-Badge) — keine E-Mail |
| 5 | Admin-View | Zentral, eigener Sidebar-Eintrag nach "E-Mail Inbox" (`/intern/chat`) — Split-View: Firmen-Liste + Chat-Fenster |

## Datenmodell

### Tabelle `chat_messages`

```
id              UUID PK
companyId       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
senderId        UUID REFERENCES users(id) ON DELETE SET NULL
senderRole      VARCHAR(50) NOT NULL          (Wert zum Sendezeitpunkt: 'portal_user', 'admin', 'owner', ...)
bodyText        TEXT NOT NULL
readByPortalAt  TIMESTAMPTZ                   (wann ein portal_user dieser Firma die Nachricht gesehen hat)
readByAdminAt   TIMESTAMPTZ                   (wann ein Admin die Nachricht gesehen hat)
createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX idx_chat_messages_company_created ON (companyId, createdAt DESC)
INDEX idx_chat_messages_sender ON (senderId)
```

**Kein separater `chat_threads`-Table** — 1:1 Firma → Chat. Der `companyId`-Index ist effektiv der Thread-Lookup.

**Sender-Semantik:**
- Portal-User schickt → `senderRole = 'portal_user'`. Target-Audience = Admin. Read-Receipt: `readByAdminAt` wird gesetzt wenn Admin die Liste öffnet.
- Admin/Owner schickt → `senderRole = 'admin'` (oder was der Role-String sagt). Target-Audience = Portal-User. Read-Receipt: `readByPortalAt` wird gesetzt.
- Falls mehrere Admins dieselbe Firma betreuen: `readByAdminAt` ist das FIRST-READ Timestamp (erster Admin öffnet). Keine per-User-read-tracking (Overkill für MVP).

### Unread-Berechnung

- **Portal-User:** `COUNT(*) WHERE companyId = auth.companyId AND senderRole != 'portal_user' AND readByPortalAt IS NULL`
- **Admin:** `COUNT(*) WHERE companyId = targetCompanyId AND senderRole = 'portal_user' AND readByAdminAt IS NULL`
- Global-Admin-Badge (Sidebar): Summe über alle Firmen.

## Audit

Gemäß Memory-Regel "ändernde Kunden-Aktionen sind audit-pflichtig":

| Action-Slug | Wer | Wann |
|---|---|---|
| `portal.chat_message_sent` | portal_user | POST /portal/me/chat/messages |
| `admin.chat_message_sent` | admin/owner/member | POST /chat/companies/[id]/messages |

**Audit-Payload:** `{ companyId, messageId, characterCount }` — **KEIN `bodyText`** im Audit-Log (Message-Body bereits in `chat_messages` persistent; Audit-Log soll nicht duplizieren und nicht Audit-Storage aufblähen).

`entityType = 'chat_message'`, `entityId = message.id`.

**Read-Events werden NICHT auditiert** (zu hohe Frequenz, wenig Wert).

## API-Routes

### Portal (`withPortalAuth`)

- `GET /api/v1/portal/me/chat/messages` — Liste aller Messages der eigenen Firma. Optional query `?since=<iso-timestamp>` für Polling-Delta (liefert dann nur neuere Messages). Default: letzte 100.
- `POST /api/v1/portal/me/chat/messages` — body `{ bodyText: string }`. Server setzt `companyId`, `senderId`, `senderRole='portal_user'`.
- `PATCH /api/v1/portal/me/chat/mark-read` — markiert alle unread Admin-Messages der eigenen Firma als `readByPortalAt = NOW()`. Body: leer.
- `GET /api/v1/portal/me/chat/unread-count` — liefert `{ unread: number }`. Genutzt vom Dashboard-Badge. Separat für Performance (keine Message-Liste holen).

### Admin (`withPermission`)

- `GET /api/v1/chat/companies` — Firmen-Liste mit Chat-Metadaten `[{companyId, companyName, lastMessageAt, lastMessagePreview, unreadCount}]`. Sortiert nach `lastMessageAt DESC`. Filter optional `?hasUnread=true`. Permission: `users:read`.
- `GET /api/v1/chat/companies/[id]/messages` — Messages einer Firma. Optional `?since=`. Permission: `users:read`.
- `POST /api/v1/chat/companies/[id]/messages` — body `{ bodyText }`. Permission: `users:update`.
- `PATCH /api/v1/chat/companies/[id]/mark-read` — markiert alle unread Portal-Messages der Firma als read. Permission: `users:read`.
- `GET /api/v1/chat/unread-count` — globale Summe für Sidebar-Badge. `{ unread: number }`. Permission: `users:read`.

### Security-Hinweise

- Portal-User: strikter `companyId`-Filter aus `auth.companyId`. Niemals aus Body/URL.
- Admin-API: `companyId` aus URL; Permission allein reicht (Admin darf alle Firmen sehen). Cross-Company-Isolation gilt nur Portal-seitig.
- Rate-Limit auf POST (z.B. 30 msg/min pro IP) gegen Spam/Flood.
- Max Message-Länge: 5000 Zeichen (zod).

## UI

### Portal

**`/portal/chat`** — einfache Single-Page Chat-Box.
- Nachrichten-Liste (scrollbar, neueste unten). Eigene Messages rechts (blau), Admin-Messages links (grau). Zeit-Anzeige unter Message.
- Read-Receipt-Anzeige NUR für eigene Messages: ✓ gesendet / ✓✓ gelesen (wenn `readByPortalAt` für Admin→Portal bzw `readByAdminAt` für Portal→Admin gesetzt).
- Textarea + Send-Button am unteren Rand. Enter = senden, Shift+Enter = neue Zeile.
- Beim Mount: Messages laden + PATCH mark-read.
- `setInterval(15000)` für neues-Messages-Polling (GET mit `?since=<lastCreatedAt>`).
- Empty state: "Noch keine Nachrichten — schreiben Sie uns eine erste Nachricht."

### Portal-Dashboard + Nav

- Dashboard-Kachel "Chat" (bisher "kommt in Kürze") → aktiv, Link zu `/portal/chat`, zeigt Unread-Count.
- Layout-Nav: `Firmendaten · Verträge · Projekte · Aufträge · Chat · Anträge`.
- Kleines Badge (z.B. rote Dot) auf Nav-Link wenn unread > 0 — optional, ggf. P5a.

### Admin

**`/intern/chat`** — Split-View:
- **Linke Spalte (~300px):** Firmen-Liste mit Suche. Jedes Listen-Item: Firmen-Name, Last-Message-Preview (truncated), Timestamp, Unread-Badge. Aktive Firma highlighted.
- **Rechte Spalte (flex-1):** Chat-Fenster für gewählte Firma.
  - Header: Firmen-Name + "zur Firma springen"-Link zu `/intern/contacts/companies/[id]`.
  - Messages-Liste (gleiches Rendering-Schema wie Portal, aber Sicht ist umgekehrt: Admin-Messages rechts, Portal-Messages links).
  - Textarea + Send-Button unten.
- Beim Mount: Firmen-Liste laden. Auf Klick einer Firma: Messages laden + PATCH mark-read.
- `setInterval(20000)` für Firmen-Liste-Refresh (neue Messages in anderen Firmen).
- URL-Deep-Link: `/intern/chat?company=<uuid>` öffnet direkt die Firma.

### Admin-Sidebar

Neuer Eintrag nach "E-Mail Inbox":
```ts
{ name: 'Kunden-Chat', href: '/intern/chat', icon: MessageCircle, requiredModule: 'users' }
```

Globaler Unread-Badge (kleine rote Zahl) optional — via `/api/v1/chat/unread-count` alle 30s polling. Für P5-MVP skippen wenn knapp.

## Polling

- **Portal:** 15s Intervall, nur Delta via `?since=<lastCreatedAt>`.
- **Admin:** 20s Intervall, voller Firmen-Liste-Refresh (günstig genug, um nichts zu übersehen). Detail-View polled auch 15s Delta.
- Bei Window-Blur Polling PAUSE (via `document.visibilityState`), bei Focus resume — spart Requests.
- Bei Polling-Fehler kein Retry-Storm; einfach im nächsten Intervall wieder versuchen.

## Migrations

- **012_chat_messages.sql** — idempotent CREATE TABLE + Indexe. Pre-Drizzle in entrypoint.prod.sh.

## Offene Deferrals

- SSE-Upgrade wenn Polling-Traffic sichtbar wird
- File-Attachments
- Typing-Indicator
- Admin-Message-Templates (z.B. "Vielen Dank, wir kümmern uns")
- Chat-Export (CSV / PDF für Audit-Zwecke)
- Message-Threading / Replies
- Mention (`@name`) unter mehreren Admins
- E-Mail-Digest (1×/Tag) falls In-App-Notifications nicht reichen
