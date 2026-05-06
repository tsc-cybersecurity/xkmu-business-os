# Workflow Engine — Referenz

Stand: 2026-05-07

Konfigurierbares Trigger-/Action-System für Automation. UI unter
`/intern/settings/workflows`. Ein Workflow ist `Trigger + Steps`, wird bei
Eintreten des Triggers feuert und führt seine Steps sequenziell aus.

---

## Inhalt

1. [Konzepte](#konzepte)
2. [Triggers](#triggers)
3. [Actions](#actions)
4. [Step-Typen](#step-typen)
5. [Conditions](#conditions)
6. [Templating](#templating)
7. [Limits & Sicherheitsnetze](#limits)
8. [Code-Pfade](#code-pfade)

---

## Konzepte

| Begriff | Bedeutung |
|---|---|
| **Workflow** | Konfiguriertes Bündel aus Trigger + Steps. DB: `workflows`. |
| **Trigger** | Event-Name auf das ein Workflow reagiert. Eintrag in `WORKFLOW_TRIGGERS`. |
| **Step** | Einzelner Verarbeitungsschritt. Vier Kinds: `action`, `branch`, `parallel`, `for_each`. |
| **Action** | Konkrete Operation mit Konfigurationsfeldern. Eintrag in `ACTIONS`-Map. |
| **Run** | Einzelne Ausführung eines Workflows. DB: `workflow_runs` mit `triggerData` + `stepResults`. |
| **Trigger-Data** | Payload den der Caller via `WorkflowEngine.fire(trigger, data)` mitgibt. Im Workflow als `{{data.field}}` adressierbar. |
| **Step-Results** | Outputs vorheriger Action-Steps. Im Workflow als `{{steps.<action_name>.field}}` adressierbar. |

---

## Triggers

Alle Triggers stehen in `src/lib/services/workflow/triggers.ts`. Der Code-Pfad
der das Event auslöst muss `WorkflowEngine.fire('<key>', {...payload})` rufen,
sonst feuert nichts.

### Lead/Kontakt

| Key | Beschreibung | Payload |
|---|---|---|
| `contact.submitted` | Öffentliches Kontaktformular abgesendet | `firstName, lastName, email, phone, company, message` |
| `lead.created` | Lead angelegt | `leadId, companyId, personId, source` |
| `lead.scored` | Lead-Scoring durchgelaufen | `leadId, score, priority` |
| `lead.status_changed` | Lead-Status geändert | `leadId, companyId, fromStatus, toStatus` |

### Portal (Kunden-Bereich)

| Key | Beschreibung | Payload |
|---|---|---|
| `portal.message_sent` | Chat-Nachricht im Portal | `messageId, companyId, senderId, senderRole, bodyPreview` |
| `portal.document_uploaded` | Dokument hochgeladen | `documentId, companyId, direction, fileName, sizeBytes, uploaderRole` |
| `portal.change_request_created` | Firmendaten-Änderungsantrag | `changeRequestId, companyId, requestedBy, proposedChanges` |
| `portal.user_invited` | Portal-Zugang per Invite-Link | `userId, companyId, email` |

### Aufträge

| Key | Beschreibung | Payload |
|---|---|---|
| `order.created` | Auftrag angelegt | `orderId, companyId, title, createdByRole` |
| `order.status_changed` | Status-Übergang | `orderId, companyId, fromStatus, toStatus` |

### Cron / Scheduled

| Key | Beschreibung | Payload |
|---|---|---|
| `__scheduled__` | Workflow läuft auf Cron-Zeitplan (Konfiguration im Bereich „Zeitplan" am Workflow) | `scheduledAt, workflowId, cronJobId` |

### Social Media

| Key | Beschreibung | Payload |
|---|---|---|
| `social.post.published` | Beitrag erfolgreich veröffentlicht | `postId, platform, externalPostId, externalUrl, postedVia` |
| `social.post.failed` | Publish-Versuch fehlgeschlagen | `postId, platform, error, postedVia` |

---

## Actions

Alle Actions stehen in `src/lib/services/workflow/action-registry.ts` (Map
`ACTIONS`). Pro Action: `name`, `label`, `description`, `category`, `icon`,
`configFields[]`, `execute()`. Kategorien: `data`, `ai`, `communication`,
`logic`.

### Daten-Aktionen (`category: 'data'`)

#### `find_or_create_company`
Sucht eine Firma per Name (aus `data.company`) oder legt sie neu an.
- Config: `fallbackName` (string) — Name wenn `data.company` leer
- Output: `{ companyId, name, created }`

#### `find_or_create_person`
Sucht eine Person per E-Mail (`data.email`) oder legt sie neu an. Optionaler
Link zu `companyId` aus vorigem Step.
- Config: keine
- Output: `{ personId, email, created }`

#### `link_lead`
Verknüpft `data.leadId` mit `companyId` und `personId` aus vorigen Steps.
- Config: keine
- Output: `{ leadId, companyId, personId }`

#### `log_activity`
Erstellt einen Aktivitäts-Eintrag (`activities`-Tabelle) für die Firma.
- Config: `subject` (string)
- Output: `{ activityId }`

#### `schedule_social_post`
Setzt `scheduledAt` + `status='scheduled'` auf einen bestehenden Post.
`reconcilePublishTask` legt automatisch ein `task_queue`-Item für den
Cron-Auto-Posting-Pfad an.
- Config: `postId` (string), `scheduledAt` (ISO-string)
- Output: `{ postId, scheduledAt, status }`

### KI-Aktionen (`category: 'ai'`)

#### `ai_research_company`
Recherchiert die Firma per KI (Website, Branche, Größe). Schreibt in `companies`.
- Config: keine
- Output: `{ companyId, summary, industry, size }`

#### `run_custom_prompt`
Führt einen User-konfigurierten Prompt mit Firmenkontext aus. Optional
speichert das Ergebnis als Aktivität.
- Config: `promptId` (custom_prompt-Picker), `saveAsActivity` (boolean, default true)
- Output: `{ promptId, companyId, subject, content, activityId }`

#### `generate_social_post`
KI-Generierung eines plattformspezifischen Beitrags inkl. Hashtags und
optional KI-Bild (Gemini). Speichert als Draft (oder direkt als
`scheduled` wenn `scheduledAt` gesetzt).
- Config:
  - `platform` (select: linkedin/x/instagram/facebook/xing)
  - `topic` (string, supports `{{data.x}}`)
  - `tone` (select: professional/casual/humorous/inspirational)
  - `includeHashtags` (boolean)
  - `includeEmoji` (boolean)
  - `includeImage` (boolean) — Bild-Aspect: 1:1 für IG, 16:9 sonst
  - `scheduledAt` (string, leer = Draft)
- Output: `{ postId, platform, status, scheduledAt, imageUrl }`

### Kommunikation (`category: 'communication'`)

#### `send_email`
Sendet eine Template-basierte E-Mail über die Task-Queue (asynchron).
- Config: `template` (slug-string), `to` (string, leer = Kontakt-E-Mail)
- Output: `{ taskId, to, template }`

#### `notify_admin`
Sendet eine Benachrichtigungs-E-Mail an den konfigurierten Admin.
- Config: `template` (slug-string)
- Output: `{ taskId, template }`

#### `webhook_call`
HTTP-Request an externe URL mit Mustache-Templating, Retry-Loop und Timeout.
Antwort-JSON wird in `data` zurückgegeben.
- Config:
  - `url` (string, supports Mustache)
  - `method` (POST/GET/PUT/DELETE)
  - `authBearer` (string, optional)
  - `headers` (json, optional)
  - `body` (json, supports Mustache)
  - `retries` (number, default 0; nur bei 5xx oder Network-Error)
  - `timeoutMs` (number, default 10000)
- Output: `{ status, body, headers, attempt }`

#### `publish_social_post`
Veröffentlicht einen bestehenden Post sofort über den passenden Provider
(Meta/Instagram/X/LinkedIn). Umgeht den Cron — für manuell-getriggerte
Workflows.
- Config: `postId` (string)
- Output: `{ postId, platform, externalPostId, externalUrl }`

### Logik / Helfer (`category: 'logic'`)

#### `score_lead`
Bewertet einen Lead basierend auf Kontaktdaten + Interessen (0–100).
- Config: `highValueInterests` (json array of strings)
- Output: `{ leadId, score, priority }`

#### `set_field`
Setzt ein Feld auf dem Lead.
- Config: `field` (select: status/tags/notes), `value` (string)
- Output: `{ leadId, field, value }`

#### `delay`
Wartet eine konfigurierbare Anzahl Sekunden im Step-Stack.
- Config: `seconds` (number, default 5)
- Output: `{ waited }`

---

## Step-Typen

Jeder Step ist eines von vier Kinds. Default ist `action` (wenn `kind` fehlt).

### `action`
```jsonc
{
  "kind": "action",        // optional, default
  "action": "send_email",  // Action-Name aus Registry
  "label": "Welcome-Mail", // optional Anzeige
  "config": { "template": "welcome_v1" },
  "condition": "data.optedIn == 'true'"  // optional, skipt Step wenn false
}
```

### `branch` — if/else-Verzweigung
```jsonc
{
  "kind": "branch",
  "label": "Hochwertiger Lead?",
  "ifCondition": "steps.score_lead.score >= 70",
  "then": [ { "action": "notify_admin", "config": { ... } } ],
  "else": [ { "action": "log_activity", "config": { ... } } ]  // optional
}
```

### `parallel` — Steps gleichzeitig
```jsonc
{
  "kind": "parallel",
  "label": "Multichannel-Versand",
  "steps": [
    { "action": "send_email",  "config": { ... } },
    { "action": "webhook_call","config": { ... } }
  ]
}
```
Limit: max 100 Steps in einem Parallel-Block (`MAX_PARALLEL_FANOUT`).

### `for_each` — Iteration über Array
```jsonc
{
  "kind": "for_each",
  "label": "Pro Plattform",
  "source": "data.platforms",   // muss Array sein
  "steps": [
    { "action": "generate_social_post", "config": { "platform": "{{item}}", ... } }
  ]
}
```
Limit: max 100 Iterationen (`MAX_LOOP_ITERATIONS`).
Innerhalb der Schleife: `{{item}}` für das aktuelle Element.

---

## Conditions

`condition` (auf Action-Steps) und `ifCondition` (auf Branch-Steps) verwenden
dieselbe Mini-Expression-Sprache. Implementation:
`src/lib/services/workflow/condition-parser.ts`.

### Atome

| Pattern | Beispiel | Bedeutung |
|---|---|---|
| `<path> == null` | `data.email == null` | Pfad ist null/undefined/'' |
| `<path> != null` | `data.email != null` | Pfad ist gesetzt |
| `<path> == 'value'` | `data.status == 'active'` | String-Vergleich (Single-Quotes!) |
| `<path> != 'value'` | `data.status != 'archived'` | String-Vergleich |
| `<path> > 50` | `steps.score_lead.score > 50` | numerischer Vergleich (>, <, >=, <=, ==, !=) |
| `<path>` allein | `data.optIn` | Truthy-Check (false/0/''/[]/null = false) |

### Kombination

Mit `&&`, `||`, Klammern:

```
data.optedIn == 'true' && (steps.score_lead.score >= 70 || data.urgent == 'true')
```

### Pfad-Wurzeln

- `data.<field>` → Trigger-Payload
- `steps.<action_name>.<field>` → Output eines vorherigen Action-Steps

> **Hinweis:** Action-Step-Outputs werden unter dem Action-**Namen** gespeichert
> (nicht unter Step-Index). Wenn dieselbe Action mehrfach läuft, überschreibt
> die letzte. Für Mehrfach-Aufrufe einer Action im selben Workflow: derzeit
> nicht stabil adressierbar.

---

## Templating

Mustache-Style `{{...}}` in Action-Config-Werten (string oder json). Wird
rekursiv durch `resolveTemplate()` aufgelöst.

| Pfad | Quelle |
|---|---|
| `{{data.email}}` | Trigger-Payload-Feld |
| `{{steps.find_or_create_company.companyId}}` | Output vorigen Action-Steps |

### Beispiel `webhook_call` Body

```json
{
  "url": "https://hooks.slack.com/services/...",
  "body": {
    "text": "Neuer Lead: {{data.firstName}} {{data.lastName}} ({{data.email}}) — Score: {{steps.score_lead.score}}"
  }
}
```

---

## Limits

| Limit | Wert | Code |
|---|---|---|
| Maximale Verschachtelungstiefe (branch/parallel/for_each) | 10 | `MAX_DEPTH` |
| Maximale parallele Steps in einem `parallel`-Block | 100 | `MAX_PARALLEL_FANOUT` |
| Maximale Iterationen in `for_each` | 100 | `MAX_LOOP_ITERATIONS` |
| Audit-Log pro Schritt | jeder Step erzeugt einen `stepResults`-Eintrag | `workflow_runs.stepResults` |

Bei Verletzung: Step wird mit `status='failed'` und Fehler-Message versehen,
Run läuft mit den restlichen Steps weiter.

---

## Beispiel-Workflows

### 1. Lead-Welcome (klassisch)

Trigger: `contact.submitted`

```
1. find_or_create_company        (fallbackName: "Privat")
2. find_or_create_person
3. ai_research_company
4. score_lead                    (highValueInterests: ["Audit", "Strategie"])
5. branch  (ifCondition: steps.score_lead.score >= 70)
   then:
     - notify_admin   (template: hot_lead_alert)
   else:
     - log_activity   (subject: "Lead eingegangen")
6. send_email          (template: welcome_v1)
```

### 2. Daily AI-Backlog (Social-Media)

Trigger: `__scheduled__` (Cron daily 08:00 via `cron_jobs`)

```
1. generate_social_post
   - platform: linkedin
   - topic: "Tipps für KMU-Digitalisierung"
   - tone: professional
   - includeImage: true
   - scheduledAt: leer  → Status Draft
```

### 3. Lead → automatischer LinkedIn-Welcome-Post

Trigger: `lead.scored`

```
1. branch (ifCondition: steps.score_lead.score >= 80)
   then:
     - generate_social_post
         platform: linkedin
         topic: "Wir freuen uns über das Interesse von {{data.companyName}}"
         scheduledAt: leer
     - schedule_social_post
         postId: {{steps.generate_social_post.postId}}
         scheduledAt: <morgen 09:00 — manuell als ISO oder via custom logic>
```

### 4. Slack-Notification on Publish

Trigger: `social.post.published`

```
1. webhook_call
   url: https://hooks.slack.com/services/...
   method: POST
   body: {"text": "🚀 Post auf {{data.platform}}: {{data.externalUrl}}"}
```

### 5. Auto-Retry bei Fehler

Trigger: `social.post.failed`

```
1. notify_admin (template: social_publish_failed)
2. branch (ifCondition: data.error != null && data.error != '')
   then:
     - delay (seconds: 300)
     - publish_social_post (postId: {{data.postId}})
```

---

## Code-Pfade

| Komponente | Datei |
|---|---|
| Engine (Step-Loop, Branch/Parallel/ForEach) | `src/lib/services/workflow/engine.ts` |
| Action-Registry (Definitionen + execute) | `src/lib/services/workflow/action-registry.ts` |
| Trigger-Registry (Single Source of Truth) | `src/lib/services/workflow/triggers.ts` |
| Condition-Parser | `src/lib/services/workflow/condition-parser.ts` |
| Public Re-Exports | `src/lib/services/workflow/index.ts` |
| DB-Schema | `src/lib/db/schema.ts` (`workflows`, `workflow_runs`) |
| Admin-UI | `src/app/intern/(dashboard)/settings/workflows/` |
| API: list/create | `src/app/api/v1/workflows/route.ts` |
| API: get/update/delete | `src/app/api/v1/workflows/[id]/route.ts` |
| API: actions catalog | `src/app/api/v1/workflows/actions/route.ts` |
| API: runs | `src/app/api/v1/workflows/[id]/runs/route.ts` |

---

## Erweitern

### Neue Action hinzufügen

1. In `ACTIONS`-Map (`action-registry.ts`) Eintrag mit `name`, `label`,
   `description`, `category`, `icon`, `configFields[]`, `execute(ctx, config)`.
2. UI greift automatisch über `getAllActions()` zu — kein Frontend-Code
   notwendig.
3. Wenn die Action externe Services nutzt: Imports in `execute()` als
   `await import(...)` (Lazy-Load, hält Workflow-Bundle klein).

### Neuen Trigger hinzufügen

1. In `WORKFLOW_TRIGGERS`-Array (`triggers.ts`) Eintrag mit `key`, `label`,
   `description`, `dataShape[]` (nur Doku, nicht runtime-validiert).
2. An der Code-Stelle die das Event auslöst:
   `await WorkflowEngine.fire('<key>', { …payload })`.
3. UI-Trigger-Dropdown nimmt den neuen Eintrag automatisch auf.
4. **Best Practice:** Fire fail-soft via try/catch wickeln, damit ein
   Workflow-Fehler die ursprüngliche Operation nicht blockiert (siehe
   `SocialPublishOrchestrator` als Beispiel).
