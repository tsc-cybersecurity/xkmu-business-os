# Voice-Webhook-Vertrag (voice.xkmu.de → xkmu-business-os)

Dokument fuer den Entwickler von `voice.xkmu.de`. Beschreibt den einen
Webhook, mit dem Call-Metadaten + Transkript nach Abschluss eines
Anrufs an `www.xkmu.de` gepusht werden.

---

## Endpoint

```
POST https://www.xkmu.de/api/v1/voice-agent/webhook/call-completed
```

Auf einer Staging-/Local-Instanz entsprechend `https://<host>/api/v1/voice-agent/webhook/call-completed`.

---

## Authentication

```
Authorization: Bearer ${VOICE_WEBHOOK_SECRET}
```

- `VOICE_WEBHOOK_SECRET` ist beidseits in der `.env` gepflegt (gleicher String).
- Mindestlaenge: 16 Zeichen. Empfohlen: 32 Hex-Zeichen (`openssl rand -hex 32`).
- Vergleich erfolgt timing-safe.
- Ohne / falscher Token → **401**.

Setzen auf der xkmu-business-os-Seite:

```env
VOICE_WEBHOOK_SECRET=<32-hex-string>
```

Auf voice.xkmu.de identisch setzen + bei jedem Webhook im Header mitsenden.

---

## Request

```
Content-Type: application/json
```

### Body-Schema

```ts
type CallCompletedWebhook = {
  // Pflicht
  roomName: string                 // LiveKit/Voice-Server-Room — natural key (unique)
  agentKey: 'simple-latency' | 'appointment-booking' | 'outbound-telephony' | 'inbound-receptionist'
  startedAt: string                // ISO 8601 (z.B. "2026-05-15T14:32:01.000Z")

  // Empfohlen
  direction?: 'outbound' | 'inbound'   // Default: 'outbound'
  phone?: string | null                // E.164 (z.B. "+491701234567")
  callerName?: string | null           // Name aus dispatch oder Caller-ID
  contextText?: string | null          // Der Auftrag/context aus dem Dispatch
  endedAt?: string | null              // ISO 8601 — Call-Ende
  durationSeconds?: number | null      // 0–86400
  status?: 'completed' | 'no-answer' | 'voicemail' | 'failed' | 'in-progress'
  summary?: string | null              // Optional: KI-Zusammenfassung (max 10000)
  recordingUrl?: string | null         // Presigned-URL zur MP3/MP4 (oder null)
  twilioCallSid?: string | null

  // Transkript (Reihenfolge wird beibehalten)
  transcript?: Array<{
    ts: string                         // ISO 8601 pro Frame
    role: 'agent' | 'user' | 'system'
    text: string                       // Bis 50000 Zeichen pro Frame
  }>
}
```

### Beispiel-Curl

```bash
curl -X POST https://www.xkmu.de/api/v1/voice-agent/webhook/call-completed \
  -H "Authorization: Bearer ${VOICE_WEBHOOK_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "outbound-2026-05-15-14h32-a3f9",
    "agentKey": "outbound-telephony",
    "direction": "outbound",
    "phone": "+491701234567",
    "callerName": "Max Mustermann",
    "contextText": "Terminvereinbarung fuer 15-Min-Erstgespraech zur DIN-SPEC-27076-Analyse",
    "startedAt": "2026-05-15T14:32:01.000Z",
    "endedAt":   "2026-05-15T14:34:46.000Z",
    "durationSeconds": 165,
    "status": "completed",
    "summary": "Termin am Mittwoch 10:00 Uhr vereinbart.",
    "recordingUrl": "https://livekit.example.com/rec/abc.mp3",
    "twilioCallSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "transcript": [
      { "ts": "2026-05-15T14:32:03.500Z", "role": "agent", "text": "Hallo Herr Mustermann, hier ist Lea von xKMU. Habe ich Sie gut erwischt?" },
      { "ts": "2026-05-15T14:32:09.100Z", "role": "user",  "text": "Ja, kurz." },
      { "ts": "2026-05-15T14:32:11.300Z", "role": "agent", "text": "Ich rufe wegen eines kurzen Erstgespraechs zur DIN SPEC 27076 an…" }
    ]
  }'
```

---

## Response

### Erfolg (200)

```json
{
  "success": true,
  "data": {
    "id": "8b4e0a3a-...-...",
    "roomName": "outbound-2026-05-15-14h32-a3f9"
  }
}
```

### Fehler

| Status | Code            | Bedeutung |
|-------:|-----------------|-----------|
| 200    | —               | OK (auch bei Re-Post — siehe Idempotenz) |
| 204    | —               | OK (Preflight `OPTIONS`) |
| 400    | VALIDATION_ERROR| Body-Schema ungueltig (Pfad + Grund in `error.details`) |
| 401    | UNAUTHORIZED    | Bearer fehlt oder falsch |
| 500    | —               | Interner Fehler — voice.xkmu.de sollte mit Backoff retryen |

Fehler-Body-Format:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [...] } }
```

---

## Idempotenz-Vertrag

- **Key:** `roomName` ist eindeutig.
- **Re-Post derselben `roomName`** aktualisiert die Call-Zeile (alle Felder) und **ersetzt das Transkript komplett** (nicht append!).
- Damit kann voice.xkmu.de gefahrlos retryen — kein doppelter Eintrag.

Beispiel-Strategie auf voice.xkmu.de-Seite:

1. Bei Call-Ende → 1. Push (`status: "completed"`, kompletter Transcript-Stand).
2. Falls Push fehlschlaegt → exponential backoff, bis zu 5x retryen.
3. Sobald 2xx zurueck kommt → fertig.

Bei sehr langen Calls kann auch waehrend des Calls zwischen-gepusht werden
(`status: "in-progress"`); der finale Push ueberschreibt dann.

---

## Was xkmu-business-os mit den Daten macht

- Persistiert in zwei Tabellen: `voice_calls` (Metadaten) und `voice_call_messages` (Transkript).
- UI unter `/intern/agents/voice` → Tab **Anrufe** zeigt:
  - Sortierte Liste (neueste zuerst)
  - Detail-Drawer mit Transkript-Verlauf (Agent vs. Anrufer farblich getrennt), Zusammenfassung, Recording-Link
- Raw-Payload wird zusaetzlich in `voice_calls.raw_payload` (JSONB) abgelegt — fuer
  Debugging und potenzielle Felder, die im strukturierten Schema (noch) fehlen.

---

## CORS

Server-to-Server-Calls (von voice.xkmu.de aus dem Container) brauchen
kein CORS — kein `Origin`-Header noetig. Falls je aus einem Browser-Kontext
gepostet wird, sendet xkmu-business-os einen Standard-Preflight zurueck
(`OPTIONS` antwortet 204 mit den ueblichen Headern).

---

## Nicht-Anforderungen

Aktuell **nicht** Teil des Vertrags (kann spaeter ergaenzt werden):

- Push waehrend des Calls (Live-Transkript-Streaming)
- Mehrere Push-URLs / Fan-Out an mehrere Empfaenger
- Signatur-Verifikation per HMAC (Bearer reicht ueber TLS aus)
- Lieferungs-Garantie (xkmu-business-os bestaetigt mit 2xx; voice.xkmu.de retryt bei !2xx)
- Direkte Twilio-Webhook-Forwards — voice.xkmu.de aggregiert selbst

Falls eines davon konkret gebraucht wird → kurze Absprache, ergaenzen wir.
