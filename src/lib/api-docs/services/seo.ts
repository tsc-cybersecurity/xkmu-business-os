import type { ApiService } from '../types'

export const seoService: ApiService = {
  name: 'SEO-Tools',
  slug: 'seo',
  description:
    'SEO-Werkzeuge fuer das Blog/CMS. Aktuell verfuegbar: KI-gestuetzte Keyword-Recherche mit optionaler SerpAPI-Anreicherung (falls als AiProvider konfiguriert). Permission-Modul: blog.',
  basePath: '/api/v1/seo',
  auth: 'session',
  endpoints: [
    {
      method: 'POST',
      path: '/api/v1/seo/keywords',
      summary: 'KI-Keyword-Recherche',
      description:
        'Analysiert ein Keyword via KI (Prompt-Template "seo_keywords"). Wenn ein SerpAPI-Provider hinterlegt ist, werden zusaetzlich totalResults, relatedSearches und Top-5-Organic-Results von Google in den Prompt-Kontext eingespeist. Liefert ein strukturiertes JSON-Analyse-Objekt (Fallback: raw text). Permission: blog.read.',
      requestBody: {
        keyword: 'KI-Beratung Mittelstand',
        language: 'de',
      },
      response: {
        success: true,
        data: {
          keyword: 'KI-Beratung Mittelstand',
          analysis: {
            searchIntent: 'commercial',
            difficulty: 'medium',
            relatedKeywords: ['KI-Strategie KMU', 'AI Consulting Mittelstand', 'Foerdermittel KI'],
            contentIdeas: [
              'Foerdermittel-Checkliste fuer KI-Projekte',
              'KI-Pilotprojekte mit unter 10k EUR Budget',
            ],
          },
          serpData: {
            totalResults: '1.240.000',
            relatedSearches: ['KI Beratung Foerderung', 'KI fuer kleine Unternehmen'],
            topResults: [
              { title: 'KI-Beratung fuer den Mittelstand', url: 'https://example.com/ki-beratung' },
            ],
          },
        },
      },
      curl: `curl -X POST https://example.com/api/v1/seo/keywords \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{"keyword":"KI-Beratung Mittelstand","language":"de"}'`,
    },
  ],
}
