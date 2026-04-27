# Onlinekurse — Sub-Projekt 2: Public + Portal Player (Free)

**Projekt:** xkmu-business-os
**Modul:** `/(public)/kurse` + `/portal/kurse`
**Datum:** 2026-04-27
**Status:** Design (genehmigt) → Plan ausstehend
**Vorgänger:** Sub-Projekt 1 (`2026-04-26-onlinekurse-sub1-core-authoring-design.md`) — gemerged in main

## Kontext

Sub-Projekt 1 hat das vollständige Authoring (Schema, Services, API, Intern-UI) geliefert. Sub-Projekt 2 baut die Konsumenten-Seite für **freie Kurse**:

- **Public** (`/(public)/kurse/...`) — anonym zugänglich, SEO-relevant, für Marketing
- **Portal** (`/portal/kurse/...`) — eingeloggte Kunden, integriert in den bestehenden Portal-Header

Beide Surfaces nutzen geteilte Player-Komponenten. Bezahlung, Per-User-Fortschritt, Quizzes und Zuweisung kommen in späteren Sub-Projekten.

## Entscheidungen aus dem Brainstorming

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Public + Portal in einem Sub-Projekt oder split? | **Beides parallel** — Player-UI ist 80 % identisch, gemeinsamer Review |
| 2 | Asset-Serve Auth-Modell | **Caching + DB-Lookup** — In-Process-LRU für `assetId → { courseId, visibility, status }`, TTL 5 min, kein Per-Range-Chunk-DB-Hit |
| 3 | `enforceSequential` in Sub-2 | **Ignorieren** — wirkt erst in Sub-3 mit Progress-Tracking; ohne „abgeschlossen" gibt es keine sinnvolle Sperre |
| 4 | SEO-Tiefe Public | **Solide Basis** — SSR + OG-Tags + dynamische `sitemap.xml`; JSON-LD später |
| 5 | Player-Layout | **Hybrid** — Sidebar-TOC ab `md`, Sheet-TOC mobile |
| 6 | Kurs-Landing-Page | **Schlank** — Cover, Titel, Untertitel, Beschreibung, Lektion-Liste, „Kurs starten" |
| 7 | URL-Struktur | `/kurse/[course-slug]` + `/kurse/[course-slug]/[lesson-slug]` auf beiden Surfaces; Nav-Einträge in beiden Headers |
| 8 | Rendering-Strategie | **Server Components mit Client-Inseln** auf beiden Surfaces (SEO + kein FOUC) |

## Zielbild Sub-Projekt 2

Ein User auf `xkmu.de` öffnet `/kurse`, sieht eine Karten-Liste der freien Kurse, klickt auf einen Kurs, landet auf der Übersichts-Seite, klickt „Kurs starten" und ist im Player mit Video, Markdown-Inhalt, Anhängen und Prev/Next-Navigation. Auf Desktop ist die Lektion-TOC immer sichtbar; mobile öffnet ein „Lektionen"-Button die TOC im Sheet. Eingeloggte Portal-Kunden sehen unter `/portal/kurse` zusätzlich Portal-/Both-Kurse, sonst identische UX.

Crawler bekommen SSR-gerenderte Pages mit korrekten `<title>`/`<meta>`/`og:*`-Tags und finden via `/sitemap.xml` alle public Kurse + Lektionen.

## Abgrenzung

**In Scope:**
- Routen `/(public)/kurse`, `/(public)/kurse/[course-slug]`, `/(public)/kurse/[course-slug]/[lesson-slug]`
- Routen `/portal/kurse`, `/portal/kurse/[course-slug]`, `/portal/kurse/[course-slug]/[lesson-slug]`
- Geteilte Player-Komponenten in `src/components/elearning/`
- `course-public.service.ts` mit visibility-gefiltertem Read-Layer
- `course-asset-acl.ts` mit gecachter Visibility-Auth
- Refactor `/api/v1/courses/assets/serve/[...path]` — falls `withPermission` fehlschlägt, Fallback auf `checkAssetAccess`
- Dynamische `sitemap.xml`-Route
- Nav-Einträge: „Kurse" in `LandingNavbar`, „Onlinekurse" in `PortalNav`
- `generateMetadata()` auf jeder public Page (SSR + OG)
- Tests: Unit für ACL-Cache + Service, Integration für Asset-Serve mit Public/Portal-Mix
- Manuelles UAT-Skript am Ende des Plans

**Out of Scope (spätere Sub-Projekte):**
- Per-User-Fortschritt, Completion, Sequential-Enforcement → Sub-3
- PDF-Zertifikate → Sub-3
- Quiz-Player → Sub-4
- Assignment einer Firma/User, Compliance-Dashboard → Sub-5
- Bezahlung (Stripe / Rechnung), Access-Control für Paid → Sub-6
- JSON-LD Schema.org, Lighthouse-Tuning, Cross-Surface-E2E
- Schema-Erweiterungen (`learningOutcomes`, `faq` etc.)

## Architektur

```
                                 ┌────────────────────────────────┐
                                 │  /(public)/kurse/...           │
                                 │  /portal/kurse/...             │
                                 │  (RSC pages, surface="..."Prop)│
                                 └─────────────┬──────────────────┘
                                               │
                       ┌───────────────────────┴────────────────────────┐
                       │                                                │
              ┌────────▼─────────┐                          ┌───────────▼────────────┐
              │ course-public    │                          │ src/components/        │
              │ .service.ts      │                          │   elearning/           │
              │ list/get/lesson  │                          │ shared player + lists  │
              │ +prev/next       │                          │ (some "use client")    │
              └────────┬─────────┘                          └───────────┬────────────┘
                       │                                                │
                       │                                                │ <video src="/api/v1/courses/
                       │                                                │   assets/serve/{path}">
                       │                                                ▼
                       │                                  ┌─────────────────────────────┐
                       │                                  │ /api/v1/courses/assets/     │
                       │                                  │   serve/[...path]           │
                       │                                  │  1. withPermission OK? ─►   │
                       │                                  │     stream                  │
                       │                                  │  2. else checkAssetAccess() │
                       │                                  └─────────────┬───────────────┘
                       │                                                │
                       │                                  ┌─────────────▼───────────────┐
                       │                                  │ course-asset-acl.ts         │
                       │                                  │ LRU cache (Map, cap 500,    │
                       │                                  │ TTL 5min) → assetId →       │
                       │                                  │ { courseId, visibility,     │
                       │                                  │   status }                  │
                       │                                  └─────────────┬───────────────┘
                       │                                                │ on miss
                       ▼                                                ▼
                  ┌────────────────────────────────────────────────────────────┐
                  │              PostgreSQL (drizzle, courses table)            │
                  └────────────────────────────────────────────────────────────┘
```

## Routen & Datei-Layout

```
src/app/(public)/kurse/
  page.tsx                          ← Index (RSC)
  [course-slug]/
    page.tsx                        ← Landing (RSC)
    [lesson-slug]/
      page.tsx                      ← Player (RSC + Client-Inseln)

src/app/portal/kurse/
  page.tsx                          ← Index (visibility ∈ {portal, both})
  [course-slug]/
    page.tsx                        ← Landing
    [lesson-slug]/
      page.tsx                      ← Player

src/components/elearning/
  CourseListGrid.tsx                ← Card-Grid (RSC-fähig)
  CourseLandingHeader.tsx           ← Cover/Titel/Beschreibung/„Kurs starten" (RSC)
  CourseLandingOutline.tsx          ← Lektion-Liste, gruppiert wenn useModules (RSC)
  CoursePlayerLayout.tsx            ← Hybrid-Layout-Shell ('use client' wegen Sheet-State)
  LessonTocSidebar.tsx              ← Desktop-TOC (RSC)
  LessonTocSheet.tsx                ← Mobile-TOC im Sheet ('use client')
  LessonContent.tsx                 ← Markdown-Render + Anhänge-Liste (RSC; ReactMarkdown läuft serverseitig)
  LessonVideoPlayer.tsx             ← <video controls> oder iframe für externalUrl ('use client' falls Tracking nötig wird, sonst RSC)
  LessonPrevNextNav.tsx             ← Bottom-Navigation (RSC mit Links)

src/app/_components/
  landing-navbar.tsx                ← modify: „Kurse" → /kurse (geteilt mit Landing-Pages)

src/app/portal/_components/
  portal-nav.tsx                    ← modify: NAV_ITEMS um „Onlinekurse" → /portal/kurse erweitern

src/app/sitemap.ts                  ← create (existiert noch nicht): public Kurse + Lektionen
src/lib/auth/require-permission.ts  ← modify: tryWithPermission-Helper exportieren
```

**Surface-Prop:** Geteilte Komponenten kriegen `surface: 'public' | 'portal'`-Prop. Steuert nur Link-Präfixe und kosmetische Unterschiede (z. B. „Zurück zur Kursliste" vs „Zurück zum Portal").

## Daten-Layer

### `src/lib/services/course-public.service.ts`

Read-only, ohne Audit-Log (kein Mutating).

```ts
export interface PublicLessonWithContext {
  course: Course
  lesson: CourseLesson & { contentMarkdown: string | null; videoAssetId: string | null; videoExternalUrl: string | null }
  modules: CourseModule[]
  lessons: CourseLesson[]            // alle, für TOC
  assets: CourseAsset[]              // nur für aktuelle lesson
  prev: { courseSlug: string; lessonSlug: string } | null
  next: { courseSlug: string; lessonSlug: string } | null
}

export const CoursePublicService = {
  listPublic({ q?, page?, limit? }): Promise<{ items: Course[]; total: number }>
  getPublicBySlug(slug: string): Promise<{ course: Course; modules: CourseModule[]; lessons: CourseLesson[] } | null>
  getPublicLesson(courseSlug: string, lessonSlug: string): Promise<PublicLessonWithContext | null>

  listPortal(...): wie listPublic, visibility ∈ {portal, both}
  getPortalBySlug(...): wie getPublicBySlug
  getPortalLesson(...): wie getPublicLesson
}
```

**Visibility-Filter:**
- Public: `status = 'published' AND visibility IN ('public', 'both')`
- Portal: `status = 'published' AND visibility IN ('portal', 'both')`

**Prev/Next-Logik:**
1. Lektionen alle laden, sortieren nach `(modulePosition ?? 0, position)` (modul-los werden vor Modulen einsortiert oder am Ende — Entscheidung im Plan: am Ende)
2. Index der aktuellen Lektion finden, ±1 als prev/next zurückgeben (oder null)

### `src/lib/utils/course-asset-acl.ts`

```ts
interface CachedAccess {
  courseId: string
  visibility: 'public' | 'portal' | 'both'
  status: 'draft' | 'published' | 'archived'
  cachedAt: number
}

const cache = new Map<string, CachedAccess>()  // key = assetId
const TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 500

function evictIfFull() { /* drop oldest insertion when size > MAX_ENTRIES */ }
function isStale(entry: CachedAccess) { /* now - cachedAt > TTL_MS */ }

export async function checkAssetAccess(
  assetPath: string,
  session: Session | null,
): Promise<{ allowed: true } | { allowed: false; status: 403 | 404 }> {
  const assetId = extractAssetIdFromPath(assetPath)  // {courseId}/{assetId}.{ext} → assetId
  if (!assetId) return { allowed: false, status: 404 }

  let entry = cache.get(assetId)
  if (!entry || isStale(entry)) {
    const fresh = await loadAssetAccessFromDb(assetId)
    if (!fresh) return { allowed: false, status: 404 }
    entry = { ...fresh, cachedAt: Date.now() }
    evictIfFull()
    cache.set(assetId, entry)
  }

  if (entry.status !== 'published') return { allowed: false, status: 404 }
  if (entry.visibility === 'public' || entry.visibility === 'both') return { allowed: true }
  // visibility === 'portal'
  if (session?.user) return { allowed: true }
  return { allowed: false, status: 403 }
}

export function invalidateAssetAccess(assetId: string) {
  cache.delete(assetId)
}
```

**Invalidation-Hooks:** Im Plan ergänzen — `CourseService.update` (visibility-Change), `CourseService.archive`, `CoursePublishService.publish/unpublish` und `CourseAssetService.delete` rufen `invalidateAssetAccess` für betroffene Assets. Single-Process reicht für Sub-2 (kein Multi-Container-Scale-out im Asset-Serve-Pfad).

### Asset-Serve-Route Refactor

`src/app/api/v1/courses/assets/serve/[...path]/route.ts`:

```ts
export async function GET(request, ctx) {
  const session = await getSession()
  // 1. Try permission-based auth (Intern-Vorschau-Pfad bleibt funktional)
  const permResult = await tryWithPermission(request, 'courses', 'read')
  if (permResult.allowed) {
    return streamAsset(...)
  }
  // 2. Fallback: visibility-based ACL (Public/Portal-Pfad)
  const acl = await checkAssetAccess(rawPath, session)
  if (!acl.allowed) {
    return NextResponse.json({ success: false, error: { code: acl.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND' } }, { status: acl.status })
  }
  return streamAsset(...)
}
```

`tryWithPermission` ist eine kleine Variante des bestehenden `withPermission`, die statt einer 401/403-Response ein Result-Objekt zurückgibt:

```ts
export async function tryWithPermission(
  request: NextRequest,
  module: Module,
  action: Action,
): Promise<{ allowed: true; auth: AuthContext } | { allowed: false }>
```

Implementierung extrahiert die bestehende Auth/Permission-Logik aus `withPermission` in eine geteilte interne Funktion, die beide Helpers nutzen — kein duplizierter Code.

## SEO

### `generateMetadata()` pro Page

```ts
// /(public)/kurse/[course-slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { course } = await CoursePublicService.getPublicBySlug((await params).courseSlug) ?? {}
  if (!course) return {}
  return {
    title: `${course.title} – xKMU`,
    description: course.subtitle ?? course.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: course.title,
      description: course.subtitle ?? undefined,
      images: course.coverImageId ? [`/api/v1/media/${course.coverImageId}`] : undefined,
      type: 'website',
    },
  }
}
```

Analog für `/(public)/kurse` (statisch) und `/(public)/kurse/[course-slug]/[lesson-slug]/page.tsx` (Lesson-Title + Course-Title in `og:title`).

Portal-Pages bekommen `metadata.robots = { index: false, follow: false }` (Auth-only, soll nicht in Suchmaschinen).

### `src/app/sitemap.ts`

```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await CoursePublicService.listPublic({ limit: 1000 })
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://xkmu.de'
  const entries: MetadataRoute.Sitemap = []

  for (const c of courses.items) {
    entries.push({
      url: `${baseUrl}/kurse/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
    const detail = await CoursePublicService.getPublicBySlug(c.slug)
    for (const l of detail?.lessons ?? []) {
      entries.push({
        url: `${baseUrl}/kurse/${c.slug}/${l.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    }
  }
  return entries
}
```

`src/app/sitemap.ts` existiert noch nicht — wird im Plan neu angelegt. Andere public Routen (CMS, Blog) sind aktuell nicht in einer Sitemap; Erweiterung um deren Pages ist out of scope für Sub-2 (kann in Folge-PR ergänzt werden, wenn nötig).

`robots.txt` / `src/app/robots.ts` existiert ebenfalls nicht. Für Sub-2 nicht zwingend — Suchmaschinen finden `/sitemap.xml` auch ohne expliziten Verweis. Kann in Folge-PR ergänzt werden, falls Crawler-Steuerung nötig wird.

## Daten-Flow Beispiel

Request `GET /(public)/kurse/grundlagen-it/lektion-1` als anonymer User:

1. Next.js routet zu `[course-slug]/[lesson-slug]/page.tsx` (RSC)
2. Server: `CoursePublicService.getPublicLesson('grundlagen-it', 'lektion-1')`
   - Visibility-Filter: nur `published + (public|both)`
   - Wenn `null` → `notFound()` (Next 404)
3. RSC rendert HTML mit `<CoursePlayerLayout course={...} lesson={...} surface="public" prev={...} next={...}>` als Shell, darin `<LessonContent>`, `<LessonVideoPlayer>`, `<LessonPrevNextNav>`
4. Browser bekommt fertiges HTML inkl. Markdown
5. `<video src="/api/v1/courses/assets/serve/{courseId}/{assetId}.mp4">` triggert Range-Request
6. Asset-Serve:
   - `tryWithPermission('courses', 'read')` → fail (kein Login)
   - `checkAssetAccess(rawPath, null)` → Cache-Miss → DB-Lookup → Cache-Hit setzen → `{ visibility: 'public', status: 'published' }` → allow
7. File-Stream (206 mit Content-Range) raus

Folge-Range-Chunks: Cache-Hit, kein DB-Hit.

## Permissions

Keine neuen. Asset-Serve nutzt bestehende `('courses','read')` für Intern-User; Public/Portal-Pfad arbeitet permission-frei via `checkAssetAccess`.

## Status-Codes

- Pages: 200 oder 404 (über `notFound()`)
- Asset-Serve neu:
  - 200/206 — Asset gefunden + erlaubt (wie heute)
  - 403 — Visibility=portal, kein Login
  - 404 — Asset existiert nicht oder Kurs ist `draft`/`archived`
  - 416 — Range-Request invalid (wie heute)

## Testing

### Unit
- `course-public.service.test.ts`
  - `listPublic` filtert `archived` raus
  - `listPublic` filtert `visibility=portal` raus
  - `listPortal` filtert `visibility=public` raus
  - `getPublicLesson` setzt prev/next korrekt (Anfang/Mitte/Ende)
  - `getPublicLesson` mit `useModules=true` sortiert über Module + innerhalb
- `course-asset-acl.test.ts`
  - Cache-Miss → DB-Hit → cached
  - Cache-Hit → kein DB-Hit
  - TTL-Ablauf → erneuter DB-Hit
  - Eviction bei `MAX_ENTRIES`
  - Visibility=public + anon → allowed
  - Visibility=portal + anon → 403
  - Visibility=portal + session → allowed
  - Visibility=both + anon → allowed
  - Status=draft → 404 (auch mit Login)
  - Status=archived → 404

### Integration
- `course-assets-serve-public.route.test.ts`
  - Anonym + public-Kurs-Asset → 200
  - Anonym + portal-Kurs-Asset → 403
  - Anonym + draft-Kurs-Asset → 404
  - Eingeloggter Portal-User + portal-Kurs-Asset → 200
  - Intern-User mit `courses:read` + draft-Kurs-Asset → 200 (Vorschau-Pfad bleibt)

### UI
Keine etablierte UI-Test-Pipeline für Pages → manuelles UAT-Skript am Ende des Plans:
1. Public-Index lädt → Kurs-Karte sichtbar
2. Klick → Landing → „Kurs starten" → erste Lektion
3. Video lädt + spielt + Seek funktioniert (Range)
4. Prev/Next navigiert korrekt (auch über Modul-Grenzen)
5. Sidebar-TOC auf Desktop ≥ md, Sheet-TOC mobile
6. Anhänge laden + Download funktioniert
7. Portal: gleiche Schritte unter `/portal/kurse`, Portal-Header sichtbar
8. SEO: View-Source einer Lektion zeigt korrekten `<title>`, `<meta description>`, `<meta og:*>`
9. `/sitemap.xml` listet alle public Kurse + Lektionen
10. Anonymer Asset-Serve auf portal-Kurs-Video → 403; auf draft-Kurs → 404

### Performance-Check
- Asset-Serve mit 100 sequentiellen Range-Requests auf dasselbe Video: erwartet 1 DB-Query, 99 Cache-Hits

## Body-Limits / Deployment

Keine neuen. Asset-Serve liefert nur aus, NGINX-`client_max_body_size` betrifft nur Uploads.

## Performance & Skalierung (Sub-2-spezifisch)

- LRU-Cache: ~500 Einträge × ~100 Bytes = ~50 kB pro Worker. Vernachlässigbar.
- Single-Process-Cache: bei mehreren Container-Replikas hat jeder Worker eigenen Cache, in Worst Case `replicas × 1` DB-Hit pro Asset alle 5 min — akzeptabel.
- Sitemap: bei vielen Kursen + Lektionen kann das langsam werden (DB-Hit pro Kurs für Lektionen). Plan: in-memory-Cache mit kurzer TTL (z. B. 60 s) auf Sitemap-Ebene, falls > 100 Kurse zu erwarten sind. Für Sub-2-Launch wahrscheinlich < 10 Kurse → ohne Cache OK.

## Migration / Backwards-Compat

- Asset-Serve-Refactor: bestehender Permission-Pfad bleibt unangetastet, neuer Public/Portal-Pfad ist additiv → keine Breaking Change für Intern.
- Keine Schema-Änderungen.
- Keine API-Route-Removals.

## Offene Punkte (out of scope, für spätere Sub-Projekte oder Folge-PRs)

- JSON-LD `Course`/`LearningResource` Markup → wenn echte Kurse Traffic kriegen
- Lighthouse-SEO-Tuning (Image-Sizes, Critical-CSS) → bei Bedarf
- Cross-Surface-Auth-Flow E2E-Test (Public-Click → Login-Redirect → zurück zu Kurs)
- Sitemap-Cache bei > 100 Kursen
- Distributed Cache (Redis) für Asset-ACL bei Multi-Container-Setup
- Analytics für Kurs-Aufrufe → wenn relevant
