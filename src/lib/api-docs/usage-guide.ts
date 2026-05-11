/**
 * Strukturierter "How to use the API"-Guide.
 * Wird sowohl in der React-Page (/intern/intelligence/api) als auch im
 * HTML-Export (oben vor dem Service-Katalog) gerendert.
 */

export type CodeLang = 'curl' | 'fetch' | 'python'

export interface CodeExample {
  lang: CodeLang
  label: string
  code: string
}

export interface UsageSection {
  id: string
  title: string
  /** Erlaubt einfache Markdown-ähnliche Absätze (\n\n trennt Absätze) */
  intro: string
  /** Inline-Code-Blöcke ohne Sprach-Toggle (z.B. JSON-Schemas) */
  staticBlocks?: { label: string; code: string }[]
  /** Code-Beispiele mit Sprach-Toggle (cURL / fetch / Python) */
  examples?: CodeExample[]
  /** Strukturierte Tabellen (z.B. Error-Codes) */
  table?: {
    columns: string[]
    rows: string[][]
  }
}

const ENVELOPE_SUCCESS = `{
  "success": true,
  "data": {
    "id": "b3f1a2c4-...",
    "name": "Beispiel"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 137,
    "totalPages": 7
  }
}`

const ENVELOPE_ERROR = `{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid e-mail" }
    ]
  }
}`

const FULL_FLOW_CURL = `# 1. Login - Session-Cookie wird in cookies.txt gespeichert
curl -X POST https://www.xkmu.de/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"email":"you@example.com","password":"<password>"}'

# 2. Authentifizierte Anfrage - Cookie aus cookies.txt mitsenden
curl https://www.xkmu.de/api/v1/leads?page=1&limit=20 \\
  -b cookies.txt

# 3. Neuen Datensatz anlegen
curl -X POST https://www.xkmu.de/api/v1/leads \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"Max Mustermann","companyName":"Beispiel GmbH"}'

# 4. Logout
curl -X POST https://www.xkmu.de/api/v1/auth/logout -b cookies.txt`

const FULL_FLOW_FETCH = `// Im Browser laeuft das automatisch ueber das Session-Cookie
// (credentials: 'include' setzen, wenn cross-origin gerufen wird).

const BASE = 'https://www.xkmu.de'

// 1. Login
await fetch(\`\${BASE}/api/v1/auth/login\`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'you@example.com', password: '<password>' }),
})

// 2. Daten lesen (mit Pagination)
const list = await fetch(\`\${BASE}/api/v1/leads?page=1&limit=20\`, {
  credentials: 'include',
}).then(r => r.json())

console.log(list.data, list.meta) // items + page/limit/total/totalPages

// 3. Neuen Datensatz anlegen
const created = await fetch(\`\${BASE}/api/v1/leads\`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Max Mustermann', companyName: 'Beispiel GmbH' }),
}).then(r => r.json())

if (!created.success) {
  console.error(created.error.code, created.error.message)
}`

const FULL_FLOW_PYTHON = `import requests

BASE = "https://www.xkmu.de"
s = requests.Session()  # haelt das Session-Cookie automatisch

# 1. Login
s.post(f"{BASE}/api/v1/auth/login", json={
    "email": "you@example.com",
    "password": "<password>",
})

# 2. Liste mit Pagination
r = s.get(f"{BASE}/api/v1/leads", params={"page": 1, "limit": 20})
payload = r.json()
items, meta = payload["data"], payload["meta"]
print(len(items), "von", meta["total"])

# 3. Datensatz anlegen
r = s.post(f"{BASE}/api/v1/leads", json={
    "name": "Max Mustermann",
    "companyName": "Beispiel GmbH",
})
result = r.json()
if not result["success"]:
    raise SystemExit(f"{result['error']['code']}: {result['error']['message']}")

# 4. Logout
s.post(f"{BASE}/api/v1/auth/logout")`

const APIKEY_CURL = `# API-Key statt Session-Cookie - fuer Server-to-Server / Skripte.
# Schluessel erzeugen unter /intern/settings/api-keys.
curl https://www.xkmu.de/api/v1/leads \\
  -H "x-api-key: xkmu_live_<dein-key>"`

const APIKEY_FETCH = `await fetch('https://www.xkmu.de/api/v1/leads', {
  headers: { 'x-api-key': 'xkmu_live_<dein-key>' },
})`

const APIKEY_PYTHON = `requests.get(
    "https://www.xkmu.de/api/v1/leads",
    headers={"x-api-key": "xkmu_live_<dein-key>"},
)`

const ERROR_HANDLING_FETCH = `const res = await fetch(\`\${BASE}/api/v1/leads\`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* fehlerhafter Body */ }),
})
const payload = await res.json()

if (!payload.success) {
  switch (payload.error.code) {
    case 'UNAUTHORIZED':
      // erneut einloggen
      break
    case 'FORBIDDEN':
      // dem User fehlt die Permission - Hinweis anzeigen
      break
    case 'VALIDATION_ERROR':
      // payload.error.details auf Feldebene auswerten
      console.error(payload.error.details)
      break
    default:
      console.error(payload.error)
  }
}`

export const USAGE_GUIDE: UsageSection[] = [
  {
    id: 'overview',
    title: 'Überblick',
    intro:
      'Die xKMU-API ist eine HTTP/JSON-API mit einheitlichem Response-Envelope, '
      + 'rollenbasierter Zugriffskontrolle (RBAC) und Session- oder API-Key-Authentifizierung. '
      + 'Alle Endpunkte liegen unter https://www.xkmu.de/api/v1 — vereinzelt auch unter /api (ältere Endpoints).\n\n'
      + 'Die Live-Liste aller verfügbaren Endpunkte wird zum Build-Zeitpunkt direkt aus dem Code generiert '
      + '(siehe scripts/generate-api-manifest.mjs). Diese Doku ist daher immer aktuell — fügst du einen neuen '
      + 'Endpoint hinzu, taucht er beim nächsten Deploy automatisch auf.',
  },
  {
    id: 'auth-session',
    title: 'Authentifizierung — Session (für UI/Browser)',
    intro:
      'Die UI authentifiziert sich per httpOnly Session-Cookie. Login setzt das Cookie automatisch, '
      + 'alle nachfolgenden Requests übermitteln es. Bei cross-origin-Calls im Browser muss '
      + '`credentials: "include"` gesetzt sein.',
    examples: [
      {
        lang: 'curl', label: 'cURL',
        code: `# Login - Cookie in cookies.txt speichern
curl -X POST https://www.xkmu.de/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"email":"you@example.com","password":"<password>"}'

# Folge-Requests: Cookie aus cookies.txt mitsenden
curl https://www.xkmu.de/api/v1/auth/me -b cookies.txt`,
      },
      {
        lang: 'fetch', label: 'JavaScript',
        code: `await fetch('/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include', // wichtig fuer cross-origin
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'you@example.com', password: '<password>' }),
})

const me = await fetch('/api/v1/auth/me', {
  credentials: 'include',
}).then(r => r.json())`,
      },
      {
        lang: 'python', label: 'Python',
        code: `import requests
s = requests.Session()  # haelt Cookies automatisch
s.post("https://www.xkmu.de/api/v1/auth/login", json={
    "email": "you@example.com",
    "password": "<password>",
})
me = s.get("https://www.xkmu.de/api/v1/auth/me").json()`,
      },
    ],
  },
  {
    id: 'auth-apikey',
    title: 'Authentifizierung — API-Key (für Skripte/Backend)',
    intro:
      'Für Server-to-Server-Aufrufe oder eigene Skripte: erstelle einen API-Key unter '
      + '/intern/settings/api-keys (Permission: settings:create). Der Key wird per Header '
      + '`x-api-key` mitgegeben. Keine Login-Schritt nötig.',
    examples: [
      { lang: 'curl', label: 'cURL', code: APIKEY_CURL },
      { lang: 'fetch', label: 'JavaScript', code: APIKEY_FETCH },
      { lang: 'python', label: 'Python', code: APIKEY_PYTHON },
    ],
  },
  {
    id: 'envelope',
    title: 'Response-Format',
    intro:
      'Jede Antwort folgt einem einheitlichen Envelope: `success: boolean` entscheidet, ob '
      + '`data` oder `error` ausgewertet wird. Bei Listen-Endpoints mit Pagination enthält '
      + '`meta` die Seitenparameter.',
    staticBlocks: [
      { label: 'Erfolg (success: true)', code: ENVELOPE_SUCCESS },
      { label: 'Fehler (success: false)', code: ENVELOPE_ERROR },
    ],
  },
  {
    id: 'pagination',
    title: 'Pagination & Filter',
    intro:
      'Listen-Endpoints akzeptieren `?page=<n>&limit=<n>` (Default: page=1, limit=20, max=100). '
      + 'Volltext-Suche und Filter sind endpoint-spezifisch — typisch sind `q`, `search`, `status`, '
      + '`category` als Query-Parameter. Schau in den Endpoint-Details des jeweiligen Service für die '
      + 'genauen Parameter.',
    examples: [
      {
        lang: 'curl', label: 'cURL',
        code: `curl "https://www.xkmu.de/api/v1/leads?page=2&limit=50&q=mustermann" \\
  -b cookies.txt`,
      },
      {
        lang: 'fetch', label: 'JavaScript',
        code: `const params = new URLSearchParams({
  page: '2',
  limit: '50',
  q: 'mustermann',
})
const res = await fetch(\`/api/v1/leads?\${params}\`, { credentials: 'include' })
const { data, meta } = await res.json()
// data = Lead[], meta = { page, limit, total, totalPages }`,
      },
      {
        lang: 'python', label: 'Python',
        code: `r = s.get("https://www.xkmu.de/api/v1/leads", params={
    "page": 2,
    "limit": 50,
    "q": "mustermann",
})
payload = r.json()
items = payload["data"]
meta = payload["meta"]`,
      },
    ],
  },
  {
    id: 'errors',
    title: 'Fehlerbehandlung',
    intro:
      'Bei Fehlern ist `success: false` und `error.code` enthält einen stabilen String, den dein '
      + 'Code auswerten sollte. `error.message` ist für Menschen, nicht für die Code-Logik. '
      + '`error.details` ist nur bei Validation-Errors gesetzt und enthält Field-Level-Fehler.',
    table: {
      columns: ['HTTP', 'Code', 'Bedeutung'],
      rows: [
        ['400', 'VALIDATION_ERROR', 'Request-Body ungültig — `details[]` mit Field-Errors auswerten'],
        ['400', 'INVALID_BODY', 'JSON konnte nicht geparst werden'],
        ['401', 'UNAUTHORIZED', 'Kein gültiges Session-Cookie / kein gültiger API-Key'],
        ['403', 'FORBIDDEN', 'Authentifiziert, aber Permission fehlt (RBAC)'],
        ['404', 'NOT_FOUND', 'Ressource existiert nicht (oder kein Lese-Zugriff)'],
        ['413', 'PAYLOAD_TOO_LARGE', 'Request-Body > 1 MB (Default-Limit)'],
        ['422', 'SCRAPE_FAILED / etc.', 'Endpoint-spezifischer Business-Fehler'],
        ['429', 'RATE_LIMITED', 'Rate-Limit erreicht (z.B. Login: 10/min)'],
        ['500', 'INTERNAL_ERROR', 'Server-Fehler — bitte melden'],
      ],
    },
    examples: [
      { lang: 'fetch', label: 'JavaScript', code: ERROR_HANDLING_FETCH },
    ],
  },
  {
    id: 'full-example',
    title: 'Vollständiges Beispiel — Login, Lesen, Schreiben, Logout',
    intro:
      'Ein End-to-End-Skript, das einen kompletten Roundtrip zeigt: Login → Liste abrufen → '
      + 'neuen Datensatz anlegen → Logout. Alle drei Sprachen liefern das gleiche Ergebnis.',
    examples: [
      { lang: 'curl', label: 'cURL', code: FULL_FLOW_CURL },
      { lang: 'fetch', label: 'JavaScript', code: FULL_FLOW_FETCH },
      { lang: 'python', label: 'Python', code: FULL_FLOW_PYTHON },
    ],
  },
  {
    id: 'rbac',
    title: 'Permissions (RBAC)',
    intro:
      'Jeder Endpoint prüft Permissions im Format `<module>:<action>` (z.B. `leads:create`, '
      + '`companies:read`). Welche Permission ein Endpoint braucht, steht in der Endpoint-Detail-'
      + 'Beschreibung (sofern via `withPermission(...)` deklariert) — die Endpoint-Karten zeigen sie '
      + 'als "Permission: ..."-Hinweis. Wer welche Permissions hat, ist über die Rolle des Users '
      + 'definiert (verwaltbar unter /intern/settings/users).',
  },
  {
    id: 'tips',
    title: 'Tipps für die Praxis',
    intro:
      '• Nutze die Suche in der Seitenleiste — du kannst auch nach HTTP-Methoden filtern (z.B. "POST leads").\n\n'
      + '• Klick auf "HTML-Doku exportieren" oben rechts lädt eine Standalone-HTML-Datei mit '
      + 'allen Services und Endpoints inkl. Code-Beispielen — ideal zum Verteilen an Externe.\n\n'
      + '• Diese Doku wird **bei jedem Build** aus dem Quellcode regeneriert. Wenn ein Endpoint hier fehlt, '
      + 'fehlt auch im Code die `route.ts` — nicht andersrum.\n\n'
      + '• Endpoints ohne handgepflegte Annotation zeigen nur Method + Pfad + Permission. Wer Lust hat, '
      + 'ergänzt sie unter `src/lib/api-docs/services/<slug>.ts`.',
  },
]
