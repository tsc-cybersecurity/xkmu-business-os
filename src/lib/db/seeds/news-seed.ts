import { db } from '@/lib/db'
import { newsTopics, aiPromptTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const TOPICS = [
  {
    name: 'IT-Sicherheit & NIS2',
    color: '#dc2626',
    keywords: ['NIS2', 'IT-Sicherheit KMU', 'BSI Grundschutz'],
  },
  {
    name: 'KI für KMU',
    color: '#2563eb',
    keywords: ['KI Mittelstand', 'AI Act KMU', 'Künstliche Intelligenz Unternehmen'],
  },
  {
    name: 'Fördermittel & Digitalisierung',
    color: '#16a34a',
    keywords: ['Digitalbonus', 'Förderung KMU Digitalisierung', 'BAFA Beratung'],
  },
]

const PROMPTS = [
  {
    slug: 'news-deep-research',
    name: 'News Deep Research',
    description: 'Erweitert eine News-Schlagzeile zu strukturierter Recherche.',
    systemPrompt: 'Du bist ein deutscher Recherche-Assistent für KMU-Themen. Du gibst ausschließlich gültiges JSON zurück, ohne Kommentare oder Code-Block-Marker.',
    userPrompt: `Aus folgender News:
Titel: {{title}}
URL: {{url}}
Quelle: {{source}}
Snippet: {{snippet}}

Liefere eine strukturierte Recherche.`,
    outputFormat: '{ "summary": "1-2 Saetze", "keyPoints": ["..."], "sources": [{"title":"...","url":"..."}], "context": "Hintergrund fuer KMU" }',
    triggerInfo: 'News-Pipeline Stufe 1 (deepResearch). Aufgerufen automatisch beim Klick auf "Verarbeiten" pro News-Item.',
  },
  {
    slug: 'news-blog-draft',
    name: 'News Blog Draft',
    description: 'Erzeugt einen Blog-Post-Entwurf aus News + Recherche.',
    systemPrompt: 'Du bist redaktionell erfahren und schreibst hochwertige Blogposts auf Deutsch für KMU-Zielgruppe. Du gibst ausschließlich gültiges JSON zurück. WICHTIG: Das content-Feld beginnt NIE mit dem Titel, NIE mit einer H1/H2 und NIE mit dem Excerpt-Wortlaut — der Titel wird vom Blog separat ueber dem Content gerendert. Erste Zeile von content = Einleitungsabsatz im Fliesstext, danach ## H2-Abschnitte, am Ende ein Fazit-Abschnitt.',
    userPrompt: `Erstelle einen Blogpost aus folgender Recherche:
News-Titel: {{title}}
Recherche (JSON): {{research}}`,
    outputFormat: '{ "title": "...", "excerpt": "...", "content": "Markdown ~600-900 Woerter — startet DIREKT mit einem Einleitungsabsatz im Fliesstext, NICHT mit Titel/Heading/Excerpt", "seoTitle": "<=70 Zeichen", "seoDescription": "<=160 Zeichen", "tags": ["...","..."], "featuredImage": "<detaillierter englischer AI-Bildgenerierungs-Prompt, fotorealistisch, B2B, 16:9, ohne Text/Logos/Wasserzeichen>", "featuredImageAlt": "<beschreibender deutscher Alt-Text, max 200 Zeichen>" }',
    triggerInfo: 'News-Pipeline Stufe 2 (generateBlogPost). Erzeugt blog_posts (status=draft).',
  },
  {
    slug: 'news-social-draft',
    name: 'News Social Draft',
    description: 'Erzeugt einen Social-Media-Post pro Plattform aus News + Blog (X/Facebook/Instagram/LinkedIn, plattform-spezifische Limits, URL zum Blog-Beitrag inline).',
    systemPrompt: `Du bist Social-Media-Manager fuer KMU-Themen (Schwerpunkt: Digitalisierung, KI, Automatisierung, Cybersecurity, Foerderung).

PLATTFORM-SPEZIFISCH SCHREIBEN ({{platform}}):

- x: HARTLIMIT 280 Zeichen inkl. URL und Hashtags. Rechne im Kopf mit:
    laenge(content inkl. URL) + summe(laenge(hashtag) + 1) <= 280.
    URL gehoert ans Ende des content-Feldes (mit Leerzeichen davor). Ziel content 240-260 Zeichen.
- facebook: 1-3 Absaetze, locker-direkt, Du-Form, Storytelling-Hook am Anfang. Bis ~500 Zeichen im content. URL ans Ende. 3-5 Hashtags separat im JSON.
- instagram: Lebendiger Aufmacher, kurze Saetze, Zeilenumbrueche. Bis ~600 Zeichen im content. URL ans Ende. 5-10 Hashtags separat.
- linkedin: Professionell-konkret, Substanz vor Hype, Hook + 2-4 Saetze. Bis ~800 Zeichen im content. URL ans Ende. 3-5 sachliche Hashtags separat.

REGELN:
1. Deutsch, Du-Form (auch LinkedIn)
2. URL ZWINGEND in content am Ende einbauen (kommt als {{url}}, NICHT aendern)
3. Kein Markdown im content
4. Hashtags NICHT im content — separat im JSON-Feld hashtags
5. Max 1 Emoji (FB/IG bis 2)
6. AUSSCHLIESSLICH JSON zurueck.`,
    userPrompt: `Erstelle einen Social-Media-Post fuer Plattform: {{platform}}.
News-Titel: {{title}}
Recherche (JSON): {{research}}
Blog-Titel: {{blogTitle}}
Blog-Excerpt: {{blogExcerpt}}
URL des Blog-Beitrags (zwingend in content am Ende einbauen, mit fuehrendem Leerzeichen, nicht aendern): {{url}}`,
    outputFormat: '{ "platform": "{{platform}}", "title": "optional", "content": "Reiner Text inkl. URL {{url}} am Ende, KEINE Hashtags im content, bei X gesamt (content + Hashtags-Overhead) <= 280 Zeichen", "hashtags": ["#hashtag1","#hashtag2"] }',
    triggerInfo: 'News-Pipeline Stufe 3 (generateSocialPosts). Erzeugt social_media_posts (status=draft) pro konfigurierter Plattform (Topic.socialConfig).',
  },
]

export async function seedNewsModule(): Promise<{ topics: number; prompts: number }> {
  let topicsAdded = 0
  for (const t of TOPICS) {
    const existing = await db.select({ id: newsTopics.id }).from(newsTopics).where(eq(newsTopics.name, t.name)).limit(1)
    if (existing.length === 0) {
      await db.insert(newsTopics).values({
        name: t.name,
        color: t.color,
        keywords: t.keywords,
        sourceType: 'serpapi_news',
        sourceConfig: { maxResults: 10, dateRange: '2d' },
        isActive: false,
      })
      topicsAdded++
    }
  }

  let promptsAdded = 0
  for (const p of PROMPTS) {
    const existing = await db.select({ id: aiPromptTemplates.id }).from(aiPromptTemplates).where(eq(aiPromptTemplates.slug, p.slug)).limit(1)
    if (existing.length === 0) {
      await db.insert(aiPromptTemplates).values({
        slug: p.slug,
        name: p.name,
        description: p.description,
        systemPrompt: p.systemPrompt,
        userPrompt: p.userPrompt,
        outputFormat: p.outputFormat,
        triggerInfo: p.triggerInfo,
        isActive: true,
        isDefault: true,
      })
      promptsAdded++
    }
  }

  if (topicsAdded > 0 || promptsAdded > 0) {
    logger.info(`news seed: ${topicsAdded} topics, ${promptsAdded} prompts added`, { module: 'NewsSeed' })
  }
  return { topics: topicsAdded, prompts: promptsAdded }
}
