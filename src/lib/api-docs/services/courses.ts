import type { ApiService } from '../types'

export const coursesService: ApiService = {
  name: 'Onlinekurse',
  slug: 'courses',
  description:
    'Verwaltung von Onlinekursen inklusive Module, Lektionen, Lektions-Bloecken, Assets (Video/Dokumente), Quizzes, Zuweisungen, Fortschritt, Reports und SCORM-Import/-Export. Alle Endpunkte erfordern eine aktive Session und Berechtigungen auf dem Modul "courses".',
  basePath: '/api/v1/courses',
  auth: 'session',
  endpoints: [
    // ---------- Kurs-CRUD ----------
    {
      method: 'GET',
      path: '/api/v1/courses',
      summary: 'Kurse auflisten',
      description:
        'Listet Kurse paginiert. Optional filterbar nach status, visibility und Suchbegriff (q). Erfordert Berechtigung courses:read.',
      params: [
        { name: 'page', in: 'query', required: false, type: 'number', description: 'Seitennummer (Default 1)', example: '1' },
        { name: 'limit', in: 'query', required: false, type: 'number', description: 'Anzahl pro Seite (Default 20)', example: '20' },
        { name: 'status', in: 'query', required: false, type: 'string', description: 'draft | published | archived' },
        { name: 'visibility', in: 'query', required: false, type: 'string', description: 'portal | public | both' },
        { name: 'q', in: 'query', required: false, type: 'string', description: 'Volltextsuche in Titel/Slug' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            title: 'Einfuehrung in KI-Beratung',
            slug: 'einfuehrung-ki-beratung',
            status: 'published',
            visibility: 'portal',
            createdAt: '2026-04-10T08:30:00.000Z',
          },
        ],
        meta: { total: 7, page: 1, limit: 20 },
      },
      curl: `curl 'https://example.com/api/v1/courses?page=1&limit=20&status=published' \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses',
      summary: 'Kurs anlegen',
      description:
        'Erstellt einen neuen Kurs (initial Status "draft"). Slug muss eindeutig sein. Erfordert Berechtigung courses:create.',
      requestBody: {
        title: 'Einfuehrung in KI-Beratung',
        slug: 'einfuehrung-ki-beratung',
        description: 'Grundlagen, Tools und Praxisbeispiele fuer KMU.',
        visibility: 'portal',
      },
      response: {
        success: true,
        data: {
          id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Einfuehrung in KI-Beratung',
          slug: 'einfuehrung-ki-beratung',
          status: 'draft',
          visibility: 'portal',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Einfuehrung in KI-Beratung","slug":"einfuehrung-ki-beratung","visibility":"portal"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/courses/{id}',
      summary: 'Kurs-Detail abrufen',
      description:
        'Liefert einen Kurs inkl. seiner Module und Lektionen. Erfordert Berechtigung courses:read.',
      response: {
        success: true,
        data: {
          id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Einfuehrung in KI-Beratung',
          slug: 'einfuehrung-ki-beratung',
          status: 'published',
          modules: [
            { id: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', title: 'Grundlagen', position: 1 },
          ],
          lessons: [
            { id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', title: 'Was ist KI?', moduleId: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', position: 1 },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/courses/{id}',
      summary: 'Kurs aktualisieren',
      description:
        'Aktualisiert Stammdaten eines Kurses (Titel, Slug, Beschreibung, Visibility). Erfordert Berechtigung courses:update.',
      requestBody: {
        title: 'Einfuehrung in KI-Beratung (Update 2026)',
        description: 'Aktualisierte Inhalte fuer 2026.',
      },
      response: {
        success: true,
        data: {
          id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Einfuehrung in KI-Beratung (Update 2026)',
          slug: 'einfuehrung-ki-beratung',
        },
      },
      curl: `curl -X PATCH https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Einfuehrung in KI-Beratung (Update 2026)"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}',
      summary: 'Kurs loeschen',
      description: 'Loescht einen Kurs (Soft- oder Hard-Delete je nach Service-Konfiguration). Erfordert Berechtigung courses:delete.',
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/archive',
      summary: 'Kurs archivieren',
      description: 'Setzt einen Kurs auf Status "archived". Erfordert Berechtigung courses:update.',
      response: {
        success: true,
        data: { id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', status: 'archived' },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/archive \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/restore',
      summary: 'Archivierten Kurs wiederherstellen',
      description: 'Setzt einen archivierten Kurs zurueck auf "draft". Liefert 422, wenn der Kurs nicht im Status "archived" ist. Erfordert Berechtigung courses:update.',
      response: {
        success: true,
        data: { id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', status: 'draft' },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/restore \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/publish',
      summary: 'Kurs veroeffentlichen',
      description:
        'Veroeffentlicht einen Kurs. Validiert vorher Module/Lektionen (Pflichtfelder). Bei Validierungsfehlern wird Code PUBLISH_VALIDATION (422) mit Details zurueckgegeben. Erfordert Berechtigung courses:update.',
      response: {
        success: true,
        data: {
          id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'published',
          publishedAt: '2026-05-10T09:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/publish \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/unpublish',
      summary: 'Kurs depublizieren',
      description: 'Setzt einen veroeffentlichten Kurs zurueck auf "draft". Liefert 422 bei unzulaessigem Statuswechsel. Erfordert Berechtigung courses:update.',
      response: {
        success: true,
        data: { id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', status: 'draft' },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/unpublish \\
  -b cookies.txt`,
    },

    // ---------- Module ----------
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/modules',
      summary: 'Modul anlegen',
      description: 'Erstellt ein neues Modul innerhalb eines Kurses. Erfordert Berechtigung courses:update.',
      requestBody: { title: 'Grundlagen', description: 'Begriffe und Konzepte' },
      response: {
        success: true,
        data: {
          id: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          courseId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Grundlagen',
          position: 1,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/modules \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Grundlagen","description":"Begriffe und Konzepte"}'`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/courses/{id}/modules/{moduleId}',
      summary: 'Modul aktualisieren',
      description: 'Aktualisiert Titel/Beschreibung eines Moduls. Erfordert Berechtigung courses:update.',
      requestBody: { title: 'Grundlagen (Update)' },
      response: {
        success: true,
        data: { id: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', title: 'Grundlagen (Update)' },
      },
      curl: `curl -X PATCH https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/modules/m1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Grundlagen (Update)"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/modules/{moduleId}',
      summary: 'Modul loeschen',
      description: 'Loescht ein Modul (Lektionen werden je nach Service-Logik entkoppelt oder mitgeloescht). Erfordert Berechtigung courses:update.',
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/modules/m1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/modules/reorder',
      summary: 'Module neu sortieren',
      description: 'Sortiert Module eines Kurses neu. Body: Liste von { id, position }. Erfordert Berechtigung courses:update.',
      requestBody: {
        items: [
          { id: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', position: 2 },
          { id: 'm2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', position: 1 },
        ],
      },
      response: { success: true, data: { reordered: 2 } },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/modules/reorder \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"items":[{"id":"m1...","position":2},{"id":"m2...","position":1}]}'`,
    },

    // ---------- Lektionen ----------
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/lessons',
      summary: 'Lektion anlegen',
      description: 'Erstellt eine neue Lektion innerhalb eines Kurses (optional in einem Modul). Slug muss eindeutig sein. Erfordert Berechtigung courses:update.',
      requestBody: {
        title: 'Was ist KI?',
        slug: 'was-ist-ki',
        moduleId: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
      },
      response: {
        success: true,
        data: {
          id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Was ist KI?',
          slug: 'was-ist-ki',
          moduleId: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          position: 1,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/lessons \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Was ist KI?","slug":"was-ist-ki","moduleId":"m1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/lessons/{lessonId}',
      summary: 'Lektion-Detail abrufen',
      description: 'Liefert eine Lektion inkl. zugehoeriger Assets. Erfordert Berechtigung courses:read.',
      response: {
        success: true,
        data: {
          id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          title: 'Was ist KI?',
          slug: 'was-ist-ki',
          content: 'Lektions-Inhalt als Markdown.',
          assets: [
            { id: 'a1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', kind: 'video', label: 'Intro-Video' },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/lessons/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/courses/{id}/lessons/{lessonId}',
      summary: 'Lektion aktualisieren',
      description: 'Aktualisiert eine Lektion (Titel, Slug, Inhalt). Erfordert Berechtigung courses:update.',
      requestBody: { title: 'Was ist KI? (Update)', content: 'Neuer Inhalt' },
      response: {
        success: true,
        data: { id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', title: 'Was ist KI? (Update)' },
      },
      curl: `curl -X PATCH https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/lessons/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"title":"Was ist KI? (Update)"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/lessons/{lessonId}',
      summary: 'Lektion loeschen',
      description: 'Loescht eine Lektion. Erfordert Berechtigung courses:update.',
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/lessons/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/lessons/reorder',
      summary: 'Lektionen neu sortieren',
      description: 'Sortiert Lektionen eines Kurses neu (optional zusammen mit Moduluebergaengen). Erfordert Berechtigung courses:update.',
      requestBody: {
        items: [
          { id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', position: 1, moduleId: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6' },
          { id: 'l2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', position: 2, moduleId: 'm1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6' },
        ],
      },
      response: { success: true, data: { reordered: 2 } },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/lessons/reorder \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"items":[{"id":"l1...","position":1}]}'`,
    },

    // ---------- Lektions-Bloecke ----------
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/blocks',
      summary: 'Lektions-Bloecke auflisten',
      description: 'Listet alle Bloecke einer Lektion (inkl. ausgeblendete). Erfordert Berechtigung courses:read.',
      response: {
        success: true,
        data: [
          {
            id: 'b1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            lessonId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            kind: 'text',
            position: 1,
            content: { html: '<p>Einfuehrung</p>' },
            hidden: false,
          },
        ],
      },
      curl: `curl https://example.com/api/v1/courses/c1.../lessons/l1.../blocks \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/blocks',
      summary: 'Lektions-Block anlegen',
      description: 'Erstellt einen Block in einer Lektion (text, video, image, quiz-ref usw.). Erfordert Berechtigung courses:update.',
      requestBody: { kind: 'text', content: { html: '<p>Neuer Block</p>' } },
      response: {
        success: true,
        data: {
          id: 'b1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          lessonId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          kind: 'text',
          position: 1,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1.../lessons/l1.../blocks \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"kind":"text","content":{"html":"<p>Neuer Block</p>"}}'`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/blocks/{blockId}',
      summary: 'Lektions-Block aktualisieren',
      description: 'Aktualisiert einen Block (Inhalt, Sichtbarkeit). Erfordert Berechtigung courses:update.',
      requestBody: { content: { html: '<p>Aktualisierter Inhalt</p>' } },
      response: {
        success: true,
        data: { id: 'b1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', kind: 'text' },
      },
      curl: `curl -X PATCH https://example.com/api/v1/courses/c1.../lessons/l1.../blocks/b1... \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"content":{"html":"<p>Aktualisiert</p>"}}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/blocks/{blockId}',
      summary: 'Lektions-Block loeschen',
      description: 'Loescht einen Block aus einer Lektion. Erfordert Berechtigung courses:update.',
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1.../lessons/l1.../blocks/b1... \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/blocks/reorder',
      summary: 'Lektions-Bloecke neu sortieren',
      description: 'Sortiert die Bloecke einer Lektion neu. Erfordert Berechtigung courses:update.',
      requestBody: {
        items: [
          { id: 'b1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', position: 2 },
          { id: 'b2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7', position: 1 },
        ],
      },
      response: { success: true, data: { reordered: 2 } },
      curl: `curl -X POST https://example.com/api/v1/courses/c1.../lessons/l1.../blocks/reorder \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"items":[{"id":"b1...","position":2}]}'`,
    },

    // ---------- Assets ----------
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/assets',
      summary: 'Asset zu einer Lektion hochladen',
      description:
        'Laedt eine Datei (Video oder Dokument) hoch und verknuepft sie mit einer Lektion. multipart/form-data mit den Feldern file, kind (video|document), lessonId und optional label. Liefert 413 bei zu grossen Dateien. Erfordert Berechtigung courses:update.',
      params: [
        { name: 'file', in: 'body', required: true, type: 'file', description: 'Asset-Datei' },
        { name: 'kind', in: 'body', required: true, type: 'string', description: 'video | document' },
        { name: 'lessonId', in: 'body', required: true, type: 'uuid', description: 'Lektion fuer die Verknuepfung' },
        { name: 'label', in: 'body', required: false, type: 'string', description: 'Anzeigename' },
      ],
      response: {
        success: true,
        data: {
          id: 'a1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          courseId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          lessonId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          kind: 'video',
          label: 'Intro-Video',
          path: 'c1a2.../videos/intro.mp4',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/assets \\
  -b cookies.txt \\
  -F "file=@./intro.mp4" \\
  -F "kind=video" \\
  -F "lessonId=l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6" \\
  -F "label=Intro-Video"`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/assets/{assetId}',
      summary: 'Asset loeschen',
      description: 'Loescht ein Asset (Datei + DB-Eintrag). Erfordert Berechtigung courses:update.',
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/assets/a1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/courses/assets/serve/{...path}',
      summary: 'Asset-Datei ausliefern',
      description:
        'Liefert eine hochgeladene Asset-Datei aus (mit Range-/Streaming-Support fuer Videos). Editoren mit courses:read erhalten Vollzugriff; sonst greift eine visibility-basierte ACL (public/portal/both). Pfad-Traversal ist blockiert.',
      params: [
        { name: 'path', in: 'path', required: true, type: 'string[]', description: 'Pfad-Segmente unter dem Asset-Verzeichnis' },
        { name: 'Range', in: 'header', required: false, type: 'string', description: 'Byte-Range, z.B. "bytes=0-1048575"' },
      ],
      response: { contentType: 'video/mp4 | application/pdf | ...', status: '200 (oder 206 bei Range)' },
      curl: `curl https://example.com/api/v1/courses/assets/serve/c1a2.../videos/intro.mp4 \\
  -b cookies.txt \\
  -H "Range: bytes=0-1048575" \\
  -o intro-part.mp4`,
    },

    // ---------- Fortschritt & Lektion-Complete ----------
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/progress',
      summary: 'Fortschritt des aktuellen Benutzers',
      description:
        'Liefert die Liste abgeschlossener Lektion-IDs und eine zusammenfassende Statistik (erledigt/gesamt/Prozent) fuer den eingeloggten Benutzer. Erfordert Berechtigung courses:read.',
      response: {
        success: true,
        data: {
          completedLessonIds: ['l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6'],
          summary: { completedLessons: 1, totalLessons: 8, percentage: 13 },
        },
      },
      curl: `curl https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/progress \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/complete',
      summary: 'Lektion als abgeschlossen markieren',
      description:
        'Markiert eine Lektion fuer den aktuellen Benutzer als abgeschlossen. Liefert 409 wenn die Lektion gesperrt ist (LESSON_LOCKED) oder zuerst ein Quiz bestanden werden muss (QUIZ_REQUIRED). Erfordert nur eine aktive Session.',
      response: {
        success: true,
        data: {
          userId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          lessonId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          completedAt: '2026-05-11T14:32:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/lessons/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/complete \\
  -b cookies.txt`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/complete',
      summary: 'Lektions-Abschluss zuruecksetzen',
      description: 'Entfernt die Abschluss-Markierung fuer eine Lektion und den aktuellen Benutzer. Erfordert nur eine aktive Session.',
      response: { success: true, data: { uncompleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/lessons/l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/complete \\
  -b cookies.txt`,
    },

    // ---------- Zugriffsrechte (Grants) ----------
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/access',
      summary: 'Zugriffsrechte (Grants) auflisten',
      description: 'Listet alle Grants (Personen/Gruppen mit Zugriff auf den Kurs). Erfordert Berechtigung courses:read.',
      response: {
        success: true,
        data: [
          {
            id: 'g1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            courseId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            subjectKind: 'user',
            subjectId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/access \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/access',
      summary: 'Zugriffsrecht (Grant) hinzufuegen',
      description: 'Gewaehrt einem Subjekt (user|group|customer) Zugriff auf einen Kurs. Liefert 404 wenn das Subjekt nicht existiert (SUBJECT_NOT_FOUND). Erfordert Berechtigung courses:update.',
      requestBody: {
        subjectKind: 'user',
        subjectId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
      },
      response: {
        success: true,
        data: {
          id: 'g1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          subjectKind: 'user',
          subjectId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/access \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"subjectKind":"user","subjectId":"u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/access/{grantId}',
      summary: 'Zugriffsrecht (Grant) entfernen',
      description: 'Entfernt ein Grant. Erfordert Berechtigung courses:update.',
      response: { success: true, data: { removed: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/access/g1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },

    // ---------- Quiz ----------
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/quiz',
      summary: 'Quiz-Konfiguration (Autorensicht) abrufen',
      description: 'Liefert die Quiz-Konfiguration mitsamt Fragen in der Autoren-Sicht (inkl. korrekter Antworten). Gibt null zurueck, wenn fuer die Lektion kein Quiz existiert. Erfordert Berechtigung courses:read.',
      response: {
        success: true,
        data: {
          id: 'q1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          lessonId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          passThreshold: 80,
          allowRetake: true,
          questions: [
            {
              id: 'qq1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              prompt: 'Was bedeutet KI?',
              options: ['Kuenstliche Intelligenz', 'Kostenintensiv'],
              correctIndex: 0,
            },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/courses/c1.../lessons/l1.../quiz \\
  -b cookies.txt`,
    },
    {
      method: 'PUT',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/quiz',
      summary: 'Quiz-Konfiguration anlegen/aktualisieren (Upsert)',
      description: 'Legt die Quiz-Konfiguration fuer eine Lektion an oder aktualisiert sie. Liefert 404 wenn die Lektion nicht existiert. Erfordert Berechtigung courses:update.',
      requestBody: { passThreshold: 80, allowRetake: true },
      response: {
        success: true,
        data: {
          id: 'q1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          lessonId: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          passThreshold: 80,
          allowRetake: true,
        },
      },
      curl: `curl -X PUT https://example.com/api/v1/courses/c1.../lessons/l1.../quiz \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"passThreshold":80,"allowRetake":true}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/quiz',
      summary: 'Quiz einer Lektion loeschen',
      description: 'Loescht das Quiz und alle Fragen einer Lektion. Erfordert Berechtigung courses:update.',
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1.../lessons/l1.../quiz \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/quiz/attempts',
      summary: 'Quiz-Versuch absenden',
      description:
        'Sendet die Antworten des aktuellen Benutzers fuer das Quiz und liefert Score, Pass/Fail sowie eine Aufschluesselung pro Frage. Liefert 409 bei NO_RETAKE / EMPTY_QUIZ / NO_QUIZ / LESSON_NOT_FOUND. Erfordert nur eine aktive Session.',
      requestBody: {
        answers: [
          { questionId: 'qq1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', selectedIndex: 0 },
        ],
      },
      response: {
        success: true,
        data: {
          score: 100,
          passed: true,
          perQuestion: [
            { questionId: 'qq1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', correct: true },
          ],
          attemptId: 'at1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1.../lessons/l1.../quiz/attempts \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"answers":[{"questionId":"qq1-...","selectedIndex":0}]}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/quiz/attempts',
      summary: 'Eigene Quiz-Versuche auflisten',
      description: 'Listet die Quiz-Versuche des aktuell eingeloggten Benutzers. Liefert leere Liste wenn kein Quiz existiert. Erfordert nur eine aktive Session.',
      response: {
        success: true,
        data: [
          {
            id: 'at1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            quizId: 'q1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            score: 100,
            passed: true,
            createdAt: '2026-05-11T14:35:00.000Z',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/courses/c1.../lessons/l1.../quiz/attempts \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/quiz/questions',
      summary: 'Quiz-Frage hinzufuegen',
      description: 'Fuegt einer bestehenden Quiz-Konfiguration eine Frage hinzu. Liefert 404 wenn kein Quiz fuer die Lektion existiert; 400 bei Validierungsfehlern. Erfordert Berechtigung courses:update.',
      requestBody: {
        prompt: 'Was bedeutet KI?',
        options: ['Kuenstliche Intelligenz', 'Kostenintensiv'],
        correctIndex: 0,
      },
      response: {
        success: true,
        data: {
          id: 'qq1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          prompt: 'Was bedeutet KI?',
          options: ['Kuenstliche Intelligenz', 'Kostenintensiv'],
          correctIndex: 0,
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1.../lessons/l1.../quiz/questions \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"prompt":"Was bedeutet KI?","options":["Kuenstliche Intelligenz","Kostenintensiv"],"correctIndex":0}'`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/quiz/questions/{questionId}',
      summary: 'Quiz-Frage aktualisieren',
      description: 'Aktualisiert eine Quiz-Frage. Liefert 404 wenn Frage nicht existiert; 400 bei Validierungsfehlern. Erfordert Berechtigung courses:update.',
      requestBody: {
        prompt: 'Was bedeutet KI? (korrigiert)',
        options: ['Kuenstliche Intelligenz', 'Kostenintensiv'],
        correctIndex: 0,
      },
      response: {
        success: true,
        data: { id: 'qq1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', prompt: 'Was bedeutet KI? (korrigiert)' },
      },
      curl: `curl -X PATCH https://example.com/api/v1/courses/c1.../lessons/l1.../quiz/questions/qq1-... \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"prompt":"Was bedeutet KI? (korrigiert)","options":["..."],"correctIndex":0}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/lessons/{lessonId}/quiz/questions/{questionId}',
      summary: 'Quiz-Frage loeschen',
      description: 'Loescht eine Quiz-Frage. Erfordert Berechtigung courses:update.',
      response: { success: true, data: { deleted: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1.../lessons/l1.../quiz/questions/qq1-... \\
  -b cookies.txt`,
    },

    // ---------- Zuweisungen (Assignments) ----------
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/assignments',
      summary: 'Kurs-Zuweisungen auflisten',
      description: 'Listet alle Zuweisungen (Pflichtbelegungen) eines Kurses. Erfordert Berechtigung courses:read.',
      response: {
        success: true,
        data: [
          {
            id: 'as1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            courseId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            subjectKind: 'group',
            subjectId: 'gr1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            dueDate: '2026-06-30',
          },
        ],
      },
      curl: `curl https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/assignments \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/assignments',
      summary: 'Kurs zuweisen',
      description: 'Weist einen Kurs einem Subjekt (user|group|customer) mit optionalem Faelligkeitsdatum zu. Liefert 404 bei SUBJECT_NOT_FOUND. Erfordert Berechtigung courses:update.',
      requestBody: {
        subjectKind: 'group',
        subjectId: 'gr1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
        dueDate: '2026-06-30',
      },
      response: {
        success: true,
        data: {
          id: 'as1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          courseId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          subjectKind: 'group',
          subjectId: 'gr1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          dueDate: '2026-06-30T00:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/assignments \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"subjectKind":"group","subjectId":"gr1-...","dueDate":"2026-06-30"}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/courses/{id}/assignments/{assignmentId}',
      summary: 'Kurs-Zuweisung entfernen',
      description: 'Entfernt eine Zuweisung. Erfordert Berechtigung courses:update.',
      response: { success: true, data: { removed: true } },
      curl: `curl -X DELETE https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/assignments/as1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },

    // ---------- Reports ----------
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/report',
      summary: 'Kurs-Report (JSON oder CSV)',
      description:
        'Liefert einen Report mit Teilnehmer-Fortschritt, Quiz-Scores und Faelligkeiten. Mit format=csv wird eine UTF-8-CSV-Datei zum Download geliefert. Erfordert Berechtigung courses:read.',
      params: [
        { name: 'format', in: 'query', required: false, type: 'string', description: 'csv fuer CSV-Download, sonst JSON' },
      ],
      response: {
        success: true,
        data: {
          course: { id: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', slug: 'einfuehrung-ki-beratung' },
          lessons: [{ id: 'l1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', title: 'Was ist KI?' }],
          rows: [
            {
              userId: 'u1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
              name: 'Max Mustermann',
              email: 'max@mustermann-gmbh.de',
              percentage: 50,
              completedLessons: 4,
              totalLessons: 8,
              source: ['assignment'],
            },
          ],
        },
      },
      curl: `curl 'https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/report?format=csv' \\
  -b cookies.txt \\
  -o report.csv`,
    },

    // ---------- SCORM ----------
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/scorm/export',
      summary: 'Kurs als SCORM-Paket exportieren',
      description:
        'Exportiert einen Kurs als SCORM-ZIP. Liefert 404 (COURSE_NOT_FOUND) bzw. 400 bei sonstigen Export-Fehlern. Erfordert Berechtigung courses:read.',
      response: { contentType: 'application/zip', filename: 'course-<slug>-scorm.zip' },
      curl: `curl https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/scorm/export \\
  -b cookies.txt \\
  -o course-scorm.zip`,
    },
    {
      method: 'POST',
      path: '/api/v1/courses/{id}/scorm/import',
      summary: 'SCORM-Paket in einen Kurs importieren',
      description:
        'Importiert ein SCORM-ZIP in einen Kurs (multipart/form-data, Feld "file"). Liefert 413 (FILE_TOO_LARGE, Default-Limit 500 MB ueber SCORM_PACKAGE_MAX_MB), 400 bei nicht-zip oder ungueltigem Paket, 404 bei unbekanntem Kurs. Erfordert Berechtigung courses:update.',
      params: [
        { name: 'file', in: 'body', required: true, type: 'file', description: 'SCORM-ZIP-Datei' },
      ],
      response: {
        success: true,
        data: {
          packageId: 'sc1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          courseId: 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          version: 'SCORM 1.2',
          launchPath: 'index.html',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/scorm/import \\
  -b cookies.txt \\
  -F "file=@./course.zip"`,
    },
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/scorm/{packageId}/files',
      summary: 'Dateien eines SCORM-Pakets auflisten',
      description:
        'Diagnostik-Endpoint: listet alle Dateien (Pfad + Groesse) innerhalb eines SCORM-Pakets. Hilft beim Debugging von 404-Fehlern im SCORM-Player. Liefert 404 wenn das Paket-Verzeichnis nicht existiert. Erfordert Berechtigung courses:read.',
      response: {
        success: true,
        data: {
          root: 'C:/.../public/uploads/courses/c1a2.../scorm/sc1-...',
          count: 2,
          files: [
            { path: 'index.html', size: 1842 },
            { path: 'assets/main.js', size: 23456 },
          ],
        },
      },
      curl: `curl https://example.com/api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/scorm/sc1-b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/files \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/courses/{id}/scorm/{packageId}/serve/{...path}',
      summary: 'SCORM-Paket-Datei ausliefern',
      description:
        'Liefert eine Datei aus einem SCORM-Paket (HTML/JS/CSS/Assets) mit passenden Browser-MIMEs aus, sodass der SCORM-Iframe-Player Inhalte rendern kann. Editor-Zugriff (courses:read) gilt fuer alle Stati; sonst greift eine visibility-basierte ACL (public/portal/both) + published-Status-Check. Pfad-Traversal blockiert; Fallback case-insensitive Lookup auf Linux.',
      params: [
        { name: 'path', in: 'path', required: true, type: 'string[]', description: 'Pfad-Segmente innerhalb des SCORM-Pakets' },
      ],
      response: { contentType: 'text/html | application/javascript | ...', status: 200 },
      curl: `curl https://example.com/api/v1/courses/c1a2.../scorm/sc1-.../serve/index.html \\
  -b cookies.txt`,
    },
  ],
}
