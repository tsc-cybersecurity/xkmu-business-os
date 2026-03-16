# KI-Chatbot mit Kontext-Uebergabe

## Uebersicht
Globaler KI-Chatbot als Slide-Over Panel, erreichbar von jeder Seite. Modell-Auswahl, Chat-Verlauf, Streaming, Kontext-Injection von der aktuellen Seite.

## Datenbank

### chat_conversations
```
id: UUID PK
tenantId: UUID FK tenants
userId: UUID FK users
title: VARCHAR(255)
providerId: UUID FK ai_providers (nullable)
model: VARCHAR(100)
context: JSONB (nullable) - gespeicherter Kontext
createdAt, updatedAt: TIMESTAMP
```

### chat_messages
```
id: UUID PK
conversationId: UUID FK chat_conversations (cascade)
role: VARCHAR(20) - user/assistant/system
content: TEXT
createdAt: TIMESTAMP
```

## API

### POST /api/v1/chat - Streaming Chat
- Body: { message, providerId?, conversationId?, context? }
- Response: Server-Sent Events (text/event-stream)
- Erstellt neue Conversation wenn keine conversationId
- Speichert User + Assistant Messages
- Kontext wird als System-Message vorangestellt

### GET /api/v1/chat/conversations - Liste
### GET /api/v1/chat/conversations/[id] - Detail mit Messages
### DELETE /api/v1/chat/conversations/[id] - Loeschen

## Komponenten

### ChatProvider (React Context)
- Wrapped um Dashboard-Layout
- State: currentContext, isOpen, conversationId
- Methods: setContext(), openChat(), closeChat()

### ChatButton (Floating Action Button)
- Position: fixed bottom-right
- Zeigt Kontext-Badge wenn vorhanden
- Oeffnet ChatPanel

### ChatPanel (Sheet von rechts)
- Header: Provider/Modell-Dropdown, Neuer Chat, Schliessen
- Kontext-Banner mit Typ + Name + X zum Entfernen
- Messages-Liste mit Markdown-Rendering
- Input-Textarea mit Send-Button
- Streaming-Indikator

### ChatPage (/intern/chat)
- Vollbild-Version mit Sidebar fuer Conversation-History
- Gleiche Chat-Logik wie Panel

## Kontext-Typen
- company: Name, Branche, Adresse, Kontakte, Aktivitaeten, Notizen
- lead: Lead-Daten, Score, Research, Company
- person: Name, Position, Firma, Kontaktdaten
- opportunity: Name, Branche, Stadt, Bewertung, Status
- document: Rechnungs/Angebotsdaten, Positionen, Summen

## Streaming
- API nutzt ReadableStream + TextEncoder
- Frontend nutzt EventSource oder fetch mit ReadableStream
- Chunks werden progressiv angezeigt
- Provider muss Streaming unterstuetzen (Gemini, OpenAI, OpenRouter)
