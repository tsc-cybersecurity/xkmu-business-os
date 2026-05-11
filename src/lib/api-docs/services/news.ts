import type { ApiService } from '../types'

export const newsService: ApiService = {
  name: 'News-Pipeline',
  slug: 'news',
  description:
    'IT-News-Recherche und -Verarbeitung: Themen verwalten, automatische Recherche ueber externe Quellen ausloesen, News-Items kuratieren und Pipeline (Research -> Blog -> Social Drafts) starten. Permission: news (read/create/update/delete).',
  basePath: '/api/v1/news',
  auth: 'session',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/news/topics',
      summary: 'News-Themen auflisten',
      description:
        'Listet alle News-Themen auf. Mit activeOnly=true werden nur aktive Themen zurueckgegeben. Permission: news.read.',
      params: [
        { name: 'activeOnly', in: 'query', required: false, type: 'boolean', description: 'Nur aktive Themen zurueckgeben', example: 'true' },
      ],
      response: {
        success: true,
        data: [
          {
            id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            name: 'KI-Adoption im deutschen Mittelstand',
            keywords: ['KI Mittelstand', 'AI SME Germany', 'KMU Digitalisierung'],
            language: 'de',
            isActive: true,
            createdAt: '2026-04-15T09:00:00.000Z',
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/news/topics?activeOnly=true" \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/news/topics',
      summary: 'News-Thema anlegen',
      description:
        'Legt ein neues News-Thema mit Keywords und Sprache an. Validierung via createNewsTopicSchema. Permission: news.create.',
      requestBody: {
        name: 'EU AI Act fuer KMU',
        keywords: ['EU AI Act', 'KI-Regulierung KMU', 'AI Act mittelstand'],
        language: 'de',
        isActive: true,
      },
      response: {
        success: true,
        data: {
          id: 't2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'EU AI Act fuer KMU',
          keywords: ['EU AI Act', 'KI-Regulierung KMU', 'AI Act mittelstand'],
          language: 'de',
          isActive: true,
          createdAt: '2026-05-11T10:00:00.000Z',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/news/topics \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"name":"EU AI Act fuer KMU","keywords":["EU AI Act","KI-Regulierung KMU"],"language":"de","isActive":true}'`,
    },
    {
      method: 'GET',
      path: '/api/v1/news/topics/{id}',
      summary: 'News-Thema-Details abrufen',
      description:
        'Gibt Details eines einzelnen News-Themas zurueck. Permission: news.read.',
      response: {
        success: true,
        data: {
          id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'KI-Adoption im deutschen Mittelstand',
          keywords: ['KI Mittelstand', 'AI SME Germany'],
          language: 'de',
          isActive: true,
          createdAt: '2026-04-15T09:00:00.000Z',
        },
      },
      curl: `curl https://example.com/api/v1/news/topics/t1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/news/topics/{id}',
      summary: 'News-Thema aktualisieren',
      description:
        'Aktualisiert Felder eines News-Themas (Name, Keywords, Sprache, isActive). Validierung via updateNewsTopicSchema. Permission: news.update.',
      requestBody: {
        keywords: ['KI Mittelstand', 'AI SME Germany', 'KMU Digitalisierung 2026'],
        isActive: true,
      },
      response: {
        success: true,
        data: {
          id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          name: 'KI-Adoption im deutschen Mittelstand',
          keywords: ['KI Mittelstand', 'AI SME Germany', 'KMU Digitalisierung 2026'],
          language: 'de',
          isActive: true,
        },
      },
      curl: `curl -X PATCH https://example.com/api/v1/news/topics/t1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"keywords":["KI Mittelstand","AI SME Germany","KMU Digitalisierung 2026"],"isActive":true}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/news/topics/{id}',
      summary: 'News-Thema loeschen',
      description:
        'Loescht ein News-Thema. Permission: news.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/news/topics/t1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/news/research',
      summary: 'Recherche fuer alle aktiven Themen ausloesen',
      description:
        'Startet die Recherche-Pipeline fuer alle aktiven News-Themen, schreibt das Ergebnis ins Audit-Log und liefert eine Zusammenfassung. Permission: news.update.',
      response: {
        success: true,
        data: {
          summary: {
            topicsProcessed: 3,
            itemsCreated: 12,
            itemsSkipped: 4,
            errors: [],
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/news/research \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/news/topics/{id}/research',
      summary: 'Recherche fuer einzelnes Thema ausloesen',
      description:
        'Startet die Recherche-Pipeline fuer ein einzelnes News-Thema, schreibt das Ergebnis ins Audit-Log. Permission: news.update.',
      response: {
        success: true,
        data: {
          topicId: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          itemsCreated: 5,
          itemsSkipped: 2,
          source: 'tavily',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/news/topics/t1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/research \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/news/items',
      summary: 'News-Items auflisten',
      description:
        'Listet News-Items auf. Mit topicId nach Thema gefiltert (flache Liste), ohne topicId nach Themen gruppiert (Dashboard-View). Mit hidden=true werden auch ausgeblendete Items zurueckgegeben. Loest best-effort den Pipeline-Watchdog aus. Permission: news.read.',
      params: [
        { name: 'topicId', in: 'query', required: false, type: 'string', description: 'UUID des Themas', example: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6' },
        { name: 'hidden', in: 'query', required: false, type: 'boolean', description: 'Ausgeblendete Items einbeziehen', example: 'false' },
      ],
      response: {
        success: true,
        data: [
          {
            topic: { id: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6', name: 'KI-Adoption im deutschen Mittelstand' },
            items: [
              {
                id: 'ni1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
                title: 'Bitkom-Studie: 73 Prozent der KMU planen KI-Einsatz bis 2027',
                url: 'https://www.bitkom.org/Presse/Presseinformation/KMU-KI-2027',
                summary: 'Eine neue Bitkom-Umfrage unter 504 Mittelstaendlern zeigt ...',
                publishedAt: '2026-05-09T07:30:00.000Z',
                pipelineStatus: 'idle',
                isHidden: false,
              },
            ],
          },
        ],
      },
      curl: `curl "https://example.com/api/v1/news/items?topicId=t1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6" \\
  -b cookies.txt`,
    },
    {
      method: 'GET',
      path: '/api/v1/news/items/{id}',
      summary: 'News-Item-Details inkl. Drafts',
      description:
        'Gibt ein News-Item samt zugehoeriger Blog- und Social-Media-Drafts (sourceNewsItemId) zurueck. Permission: news.read.',
      response: {
        success: true,
        data: {
          item: {
            id: 'ni1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            topicId: 't1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
            title: 'Bitkom-Studie: 73 Prozent der KMU planen KI-Einsatz bis 2027',
            url: 'https://www.bitkom.org/Presse/Presseinformation/KMU-KI-2027',
            summary: 'Eine neue Bitkom-Umfrage unter 504 Mittelstaendlern zeigt ...',
            publishedAt: '2026-05-09T07:30:00.000Z',
            pipelineStatus: 'completed',
            isHidden: false,
          },
          drafts: {
            blog: [
              { id: 'bp1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6', title: 'KI im Mittelstand: Was die neue Bitkom-Studie fuer KMU bedeutet', status: 'draft' },
            ],
            social: [
              { id: 'sm1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6', platform: 'linkedin', status: 'draft' },
            ],
          },
        },
      },
      curl: `curl https://example.com/api/v1/news/items/ni1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'PATCH',
      path: '/api/v1/news/items/{id}',
      summary: 'News-Item aktualisieren (z.B. ausblenden)',
      description:
        'Aktualisiert ein News-Item. Aktuell unterstuetzt: isHidden (Ausblenden/Einblenden). Validierung via updateNewsItemSchema. Permission: news.update.',
      requestBody: {
        isHidden: true,
      },
      response: {
        success: true,
        data: { updated: true },
      },
      curl: `curl -X PATCH https://example.com/api/v1/news/items/ni1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"isHidden":true}'`,
    },
    {
      method: 'DELETE',
      path: '/api/v1/news/items/{id}',
      summary: 'News-Item loeschen',
      description:
        'Loescht ein News-Item dauerhaft. Permission: news.delete.',
      response: {
        success: true,
        data: { deleted: true },
      },
      curl: `curl -X DELETE https://example.com/api/v1/news/items/ni1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6 \\
  -b cookies.txt`,
    },
    {
      method: 'POST',
      path: '/api/v1/news/items/{id}/pipeline',
      summary: 'Pipeline (Research/Blog/Social) fuer News-Item starten',
      description:
        'Queued eine News-Pipeline-Task (Stages: research, blog, social) fuer das angegebene Item und setzt pipelineStatus auf queued. Antwortet mit 202 Accepted. Konflikt 409, falls Pipeline bereits laeuft (queued/researching/generating). Permission: news.update.',
      response: {
        success: true,
        data: {
          taskId: 'tq1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6',
          status: 'queued',
        },
      },
      curl: `curl -X POST https://example.com/api/v1/news/items/ni1a2b3c-d5e6-f7a8-b9c0-d1e2f3a4b5c6/pipeline \\
  -b cookies.txt`,
    },
  ],
}
