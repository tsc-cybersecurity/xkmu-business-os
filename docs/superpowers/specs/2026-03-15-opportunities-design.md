# Chancen (Opportunities via SerpAPI/Google Maps)

## Uebersicht
Neues Modul "Chancen" - Nutzer gibt Branche(n) + Ort(e) ein, SerpAPI durchsucht Google Maps, Ergebnisse werden als Chancen in eigener Tabelle gespeichert. Bei Interesse Konvertierung zu Firma+Lead per Button.

## Datenbank: opportunities Tabelle
```
id: UUID PK
tenantId: UUID FK tenants (cascade)
name: VARCHAR(255) NOT NULL
industry: VARCHAR(255)
address: VARCHAR(500)
city: VARCHAR(255)
postalCode: VARCHAR(20)
country: VARCHAR(10) DEFAULT 'DE'
phone: VARCHAR(100)
email: VARCHAR(255)
website: VARCHAR(500)
rating: DECIMAL(2,1)
reviewCount: INTEGER
placeId: VARCHAR(255) -- Google unique ID
status: VARCHAR(30) DEFAULT 'new' -- new/contacted/qualified/rejected/converted
source: VARCHAR(50) DEFAULT 'google_maps'
searchQuery: VARCHAR(255) -- original search term
searchLocation: VARCHAR(255) -- original location
convertedCompanyId: UUID FK companies (nullable)
notes: TEXT
metadata: JSONB DEFAULT {}
createdAt: TIMESTAMP
updatedAt: TIMESTAMP

UNIQUE: tenantId + placeId
INDEX: tenantId + status
INDEX: tenantId + createdAt
INDEX: tenantId + city
```

## API-Endpunkte
- POST /api/v1/opportunities/search - SerpAPI-Suche (body: { queries: string, locations: string, radius: number, maxPerLocation: number })
- GET /api/v1/opportunities - Liste mit Filter/Pagination (query: status, city, search, page, limit)
- GET /api/v1/opportunities/[id] - Detail
- PUT /api/v1/opportunities/[id] - Status/Notizen aendern
- DELETE /api/v1/opportunities/[id] - Loeschen
- POST /api/v1/opportunities/[id]/convert - Zu Firma+Lead konvertieren

## SerpAPI-Integration
- Endpoint: https://serpapi.com/search?engine=google_maps
- Parameter: q (Branche), ll (Koordinaten aus Ort via geocoding), radius (in Metern)
- API Key: SERPAPI_KEY in env oder als AI-Provider mit providerType='serpapi'
- Multi-Ort: Iteriert ueber jeden Ort, dedupliziert per placeId
- Multi-Branche: Kommasepariert, jede Branche = eigene Suche
- Rate Limit: max 5 Anfragen pro Suche, 1s delay zwischen Anfragen

## Konvertierung
POST /api/v1/opportunities/[id]/convert:
1. Erstellt Company (name, address, city, postalCode, phone, email, website, industry, status='prospect')
2. Erstellt Lead (companyId, status='new', source='google_maps')
3. Setzt opportunity.status='converted', convertedCompanyId
4. Returns { company, lead }

## UI: /intern/chancen
- Header: "Chancen" + "Neue Suche" Button
- Suchformular (Dialog): Branche, Orte, Radius (5/10/25/50km), Max pro Ort (10/20/40)
- Ergebnisliste: Tabelle mit Name, Branche, Ort, Bewertung, Telefon, Website, Status
- Status-Tabs: Alle/Neu/Kontaktiert/Qualifiziert/Abgelehnt/Konvertiert
- Zeilen-Aktionen: Status aendern, Konvertieren, Loeschen
- Navigation: Sidebar "Chancen" mit Telescope Icon
