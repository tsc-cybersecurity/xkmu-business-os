# Smart Firecrawl Filtering

**Datum:** 2026-03-22
**Status:** Approved

## Problem

Firecrawl crawlt 20 Seiten ab Root-URL ohne Steuerung. Blog-Posts, AGBs, Datenschutz und CMS-Noise belegen Slots, die für business-relevante Seiten (Leistungen, Team, Produkte, Referenzen) verschwendet werden.

## Lösung

Den bestehenden 1-Crawl-Call um `includePaths` und `excludePaths` erweitern. `includePaths` werden per kurzem AI-Call aus den Homepage-Links ermittelt, `excludePaths` sind eine statische Noise-Liste.

## Flow

1. **Homepage nativ fetchen** (kostenlos, bestehende `scrapePage`) → alle internen Links extrahieren
2. **AI-Call** (Gemini Flash / günstigstes Modell): Bekommt Link-Liste, liefert bis zu 20 Glob-Patterns der relevantesten Business-Pfade. Keine Halluzination — nur Patterns die aus den tatsächlichen Links ableitbar sind. Falls weniger als 20 relevant, nur die tatsächlich relevanten.
3. **1 Crawl-Call** an Firecrawl mit `includePaths` (AI-Ergebnis) + `excludePaths` (statische Liste)

## Kosten

- 0 extra Firecrawl-Credits (Homepage-Fetch ist nativ)
- 1 kleiner AI-Call (wenige hundert Tokens)

## excludePaths — statische Noise-Liste

```
/blog/*, /news/*, /aktuelles/*, /magazin/*, /presse/*, /pressemitteilungen/*
/artikel/*, /beitraege/*, /journal/*
/datenschutz*, /privacy*, /data-protection*
/agb*, /terms*, /nutzungsbedingungen*, /conditions*
/cookie*, /widerruf*, /disclaimer*, /haftungsausschluss*
/wp-admin/*, /wp-login*, /wp-content/*, /wp-json/*
/cdn-cgi/*, /api/*, /feed*, /rss*, /sitemap*
/xmlrpc*, /.well-known/*
/tag/*, /tags/*, /category/*, /kategorie/*
/page/*, /seite/*, /author/*, /autor/*
/archive/*, /archiv/*
/search*, /suche*, /login*, /register*, /anmelden*
/warenkorb*, /cart*, /checkout*, /kasse*, /mein-konto*
/wishlist*, /merkzettel*
/media/*, /uploads/*, /download/*, /downloads/*
```

## includePaths — AI-generiert

Prompt erhält die extrahierten Homepage-Links und liefert bis zu 20 Glob-Patterns.
Template-Slug: `firecrawl_smart_filter`

## Änderungen

### 1. `src/lib/services/firecrawl.service.ts`
- Konstante `CRAWL_EXCLUDE_PATHS`
- `crawl()` bekommt optionalen `includePaths` Parameter
- Beide werden an den Firecrawl API-Call angehängt

### 2. `src/lib/services/ai/website-scraper.service.ts`
- Neue Methode `extractLinksFromHtml(html)` → gibt interne Links zurück
- Neue Methode `getSmartIncludePaths(url, tenantId)`:
  1. Fetcht Homepage
  2. Extrahiert Links
  3. AI-Call → Glob-Patterns
- `scrapeCompanyWebsite()` ruft `getSmartIncludePaths()` auf bevor `FirecrawlService.crawl()` aufgerufen wird

### 3. `src/lib/services/ai-prompt-template.defaults.ts`
- Neues Template `firecrawl_smart_filter` mit Placeholder `links`
