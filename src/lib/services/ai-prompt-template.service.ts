import { db } from '@/lib/db'
import { aiPromptTemplates } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

// ============================================
// AI Prompt Template Service
// ============================================

export interface AiPromptTemplateData {
  slug: string
  name: string
  description?: string | null
  systemPrompt: string
  userPrompt: string
  outputFormat?: string | null
  isActive?: boolean
  isDefault?: boolean
  version?: number
}

// ============================================
// Platzhalter-Definitionen pro Slug
// ============================================
export const TEMPLATE_PLACEHOLDERS: Record<string, Array<{ key: string; label: string; description: string }>> = {
  lead_research: [
    { key: 'companyName', label: 'Firmenname', description: 'Name der Firma des Leads' },
    { key: 'personName', label: 'Kontaktperson', description: 'Name der Kontaktperson' },
    { key: 'email', label: 'E-Mail', description: 'E-Mail-Adresse' },
    { key: 'website', label: 'Website', description: 'Website-URL der Firma' },
    { key: 'additionalContext', label: 'Zusätzlicher Kontext', description: 'Vorhandene Firmendaten, Notizen etc.' },
    { key: 'websiteContent', label: 'Website-Inhalte', description: 'Gescrapte Website-Texte' },
  ],
  company_research: [
    { key: 'name', label: 'Firmenname', description: 'Name des Unternehmens' },
    { key: 'legalForm', label: 'Rechtsform', description: 'z.B. GmbH, AG, e.K.' },
    { key: 'industry', label: 'Branche', description: 'Branche des Unternehmens' },
    { key: 'website', label: 'Website', description: 'Website-URL' },
    { key: 'city', label: 'Stadt', description: 'Standort/Stadt' },
    { key: 'email', label: 'E-Mail', description: 'Kontakt-E-Mail' },
    { key: 'notes', label: 'Notizen', description: 'Vorhandene Notizen' },
    { key: 'websiteContent', label: 'Website-Inhalte', description: 'Gescrapte Website-Texte' },
  ],
  person_research: [
    { key: 'firstName', label: 'Vorname', description: 'Vorname der Person' },
    { key: 'lastName', label: 'Nachname', description: 'Nachname der Person' },
    { key: 'email', label: 'E-Mail', description: 'E-Mail-Adresse' },
    { key: 'company', label: 'Unternehmen', description: 'Zugehöriges Unternehmen' },
    { key: 'jobTitle', label: 'Position', description: 'Jobtitel/Position' },
    { key: 'city', label: 'Stadt', description: 'Stadt/Standort' },
    { key: 'notes', label: 'Notizen', description: 'Vorhandene Notizen' },
  ],
  quick_score: [
    { key: 'companyName', label: 'Firmenname', description: 'Name der Firma' },
    { key: 'personName', label: 'Kontaktperson', description: 'Name der Person' },
    { key: 'email', label: 'E-Mail', description: 'E-Mail-Adresse' },
    { key: 'website', label: 'Website', description: 'Website-URL' },
  ],
  idea_processing: [
    { key: 'rawContent', label: 'Roher Inhalt', description: 'Der eingegebene Text oder Transkript' },
  ],
  outreach_email: [
    { key: 'companyName', label: 'Firmenname', description: 'Name der Firma' },
    { key: 'personName', label: 'Kontaktperson', description: 'Ansprechpartner' },
    { key: 'score', label: 'Score', description: 'Lead-Score (0-100)' },
    { key: 'strengths', label: 'Stärken', description: 'Erkannte Firmenstärken' },
    { key: 'researchSummary', label: 'Research-Zusammenfassung', description: 'KI-Zusammenfassung der Firmenrecherche' },
  ],
  document_analysis: [
    { key: 'companyName', label: 'Firmenname', description: 'Name der Firma' },
    { key: 'documentText', label: 'Dokumenttext', description: 'Extrahierter Text aus dem PDF' },
  ],
}

// ============================================
// Default-Prompts (Fallback & Seed)
// ============================================
export const DEFAULT_TEMPLATES: Record<string, {
  name: string
  description: string
  systemPrompt: string
  userPrompt: string
  outputFormat: string
}> = {
  lead_research: {
    name: 'Lead-Recherche',
    description: 'Analysiert Lead-Informationen und erstellt einen strukturierten Bericht mit Scoring.',
    systemPrompt: `Du bist ein erfahrener B2B-Sales-Researcher für den deutschsprachigen Markt. Deine Aufgabe ist es, Lead-Informationen zu analysieren und einen strukturierten Bericht zu erstellen.

KERNREGELN:
1. Verwende AUSSCHLIESSLICH die bereitgestellten Daten als Grundlage
2. Erfinde KEINE Informationen – bei Unsicherheit schreibe "Nicht ermittelbar"
3. Antworte immer auf Deutsch
4. Bewerte konservativ – wenige Daten = niedriger Score (max 40-50)
5. Empfohlene Aktionen sollen helfen, fehlende Informationen zu beschaffen
6. Halluziniere NICHT – es ist besser "Nicht ermittelbar" zu schreiben als falsche Informationen zu liefern`,
    userPrompt: `Analysiere die folgenden Lead-Informationen:

{{#if companyName}}- Firmenname: {{companyName}}{{/if}}
{{#if personName}}- Kontaktperson: {{personName}}{{/if}}
{{#if email}}- E-Mail: {{email}}{{/if}}
{{#if website}}- Website: {{website}}{{/if}}

{{#if additionalContext}}
Zusätzlicher Kontext:
{{additionalContext}}
{{/if}}

{{#if websiteContent}}
=== GESCRAPTE WEBSITE-INHALTE (ECHTE DATEN - als Primärquelle nutzen!) ===
{{websiteContent}}
=== ENDE DER WEBSITE-INHALTE ===
{{/if}}

Erstelle einen strukturierten Bericht im vorgegebenen JSON-Format.`,
    outputFormat: `Antworte NUR mit dem folgenden JSON (keine weiteren Erklärungen):
{
  "company": {
    "name": "Firmenname",
    "description": "Kurzbeschreibung basierend auf den bereitgestellten Daten (2-3 Sätze, oder 'Nicht ermittelbar')",
    "industry": "Branche (nur aus den Daten ableitbar, sonst 'Nicht ermittelbar')",
    "employeeCount": "Mitarbeiteranzahl (nur wenn aus den Daten bekannt, sonst 'Nicht ermittelbar')",
    "headquarters": "Hauptsitz/Standort (nur wenn bekannt, sonst 'Nicht ermittelbar')",
    "website": "Website-URL (nur wenn bekannt)",
    "products": ["Nur Produkte/Services die aus den Daten hervorgehen"],
    "foundedYear": "Gründungsjahr (nur wenn bekannt, sonst 'Nicht ermittelbar')",
    "targetMarket": "Zielmarkt (nur wenn ableitbar, sonst 'Nicht ermittelbar')",
    "technologies": ["Nur Technologien die aus den Daten hervorgehen"],
    "competitors": ["Nur wenn in den Daten erwähnt"],
    "certifications": ["Nur wenn in den Daten erwähnt"],
    "strengths": ["Nur aus den Daten ableitbare Stärken"],
    "services": ["Nur Dienstleistungen die aus den Daten hervorgehen"]
  },
  "person": {
    "name": "Vollständiger Name",
    "jobTitle": "Position/Titel (nur wenn aus den Daten bekannt, sonst 'Nicht ermittelbar')",
    "company": "Firma",
    "bio": "Einschätzung basierend auf bekannten Daten (oder 'Nicht ermittelbar')"
  },
  "score": 50,
  "scoreReasoning": "Der Score basiert auf: [Begründung mit Verweis auf konkrete Datenlage]",
  "summary": "Zusammenfassung der bekannten Fakten (2-3 Sätze, KEIN JSON!)",
  "recommendedActions": [
    "Konkrete Handlungsempfehlung 1",
    "Konkrete Handlungsempfehlung 2",
    "Konkrete Handlungsempfehlung 3"
  ]
}

Wichtige Hinweise:
- Score 0-100 (0 = ungeeignet, 100 = perfekter Lead)
- KONSERVATIV bewerten: wenig Daten = niedriger Score
- Bei fehlenden Informationen: Score maximal 40-50
- KEINE erfundenen Produkte, Branchen oder Mitarbeiterzahlen!
- "summary" muss ein lesbarer Text sein, KEIN JSON-Objekt`,
  },

  company_research: {
    name: 'Firmen-Recherche',
    description: 'Erstellt ein detailliertes Firmenprofil mit Adressen, Produkten, Finanzdaten und Social Media.',
    systemPrompt: `Du bist ein erfahrener Business-Analyst für den deutschsprachigen Markt. Deine Aufgabe ist es, ein umfassendes Firmenprofil basierend auf den bereitgestellten Daten zu erstellen.

KERNREGELN:
1. Verwende AUSSCHLIESSLICH die bereitgestellten Daten als Grundlage
2. Erfinde KEINE Informationen – bei Unsicherheit schreibe "Nicht ermittelbar"
3. Antworte immer auf Deutsch
4. Extrahiere alle Adressen/Standorte die tatsächlich in den Daten gefunden werden
5. Das Firmenprofil (companyProfile) soll NUR verifizierte Informationen enthalten
6. Adressen MÜSSEN die einzelnen Felder (street, houseNumber, postalCode, city, country) enthalten`,
    userPrompt: `Analysiere die bereitgestellten Informationen über das folgende Unternehmen:

- Name: {{name}}
{{#if legalForm}}- Rechtsform: {{legalForm}}{{/if}}
{{#if industry}}- Branche: {{industry}}{{/if}}
{{#if website}}- Website: {{website}}{{/if}}
{{#if city}}- Standort: {{city}}{{/if}}
{{#if email}}- E-Mail: {{email}}{{/if}}
{{#if notes}}- Notizen: {{notes}}{{/if}}

{{#if websiteContent}}
=== GESCRAPTE WEBSITE-INHALTE (ECHTE DATEN - als Primärquelle nutzen!) ===
{{websiteContent}}
=== ENDE DER WEBSITE-INHALTE ===
{{/if}}

Extrahiere ALLE Adressen/Standorte die in den bereitgestellten Daten gefunden werden.
Erstelle außerdem ein ausführliches Firmenprofil basierend auf den TATSÄCHLICH verfügbaren Daten.`,
    outputFormat: `Antworte NUR mit dem folgenden JSON (keine weiteren Erklärungen):
{
  "description": "Beschreibung basierend auf den bereitgestellten Daten (3-5 Sätze)",
  "industry": "Branche (nur aus den Daten ableitbar, sonst 'Nicht ermittelbar')",
  "employeeCount": "Mitarbeiteranzahl (nur wenn aus den Daten bekannt, sonst 'Nicht ermittelbar')",
  "foundedYear": "Gründungsjahr (nur wenn in den Daten gefunden, sonst 'Nicht ermittelbar')",
  "headquarters": "Hauptsitz (nur wenn bekannt, sonst 'Nicht ermittelbar')",
  "website": "Website-URL",
  "products": ["Nur Produkte die aus den Daten hervorgehen"],
  "services": ["Nur Services die aus den Daten hervorgehen"],
  "targetMarket": "Zielmarkt (nur wenn aus den Daten ableitbar, sonst 'Nicht ermittelbar')",
  "competitors": ["Nur wenn in den Daten erwähnt, sonst leeres Array"],
  "strengths": ["Nur aus den Daten ableitbare Stärken"],
  "recentDevelopments": ["Nur wenn in den Daten gefunden"],
  "socialMedia": {
    "linkedin": "Nur echte URLs aus den Daten, sonst null",
    "xing": "null",
    "twitter": "null",
    "facebook": "null",
    "instagram": "null"
  },
  "financials": {
    "estimatedRevenue": "Nur wenn in den Daten gefunden, sonst 'Nicht ermittelbar'",
    "growthTrend": "Nicht ermittelbar",
    "fundingStatus": "Nicht ermittelbar"
  },
  "technologies": ["Nur Technologien die aus den Daten hervorgehen"],
  "certifications": ["Nur Zertifizierungen die aus den Daten hervorgehen"],
  "addresses": [
    {
      "label": "Hauptsitz",
      "street": "Nur echte Daten",
      "houseNumber": "1",
      "postalCode": "12345",
      "city": "Stadt",
      "country": "DE",
      "phone": "Nur echte Telefonnummern",
      "email": "Nur echte E-Mails"
    }
  ],
  "companyProfile": "Firmenprofil basierend NUR auf den tatsächlich bereitgestellten Daten (5-10 Sätze, KEIN JSON!). Dieses Profil wird als Notiz im CRM gespeichert.",
  "summary": "Executive Summary in 2-3 Sätzen (lesbarer Text, KEIN JSON!)"
}

Wichtig:
- KEINE erfundenen Informationen! Verwende "Nicht ermittelbar" oder leere Arrays []
- Extrahiere nur Adressen die TATSÄCHLICH in den Daten stehen
- companyProfile und summary müssen lesbare Texte sein, KEINE JSON-Objekte`,
  },

  person_research: {
    name: 'Personen-Recherche',
    description: 'Analysiert Informationen über eine Kontaktperson für die optimale Ansprache.',
    systemPrompt: `Du bist ein erfahrener Recherche-Spezialist für Geschäftskontakte im deutschsprachigen Markt. Deine Aufgabe ist es, Personeninformationen zu analysieren und Empfehlungen für die Ansprache zu geben.

KERNREGELN:
1. Verwende AUSSCHLIESSLICH die bereitgestellten Daten als Grundlage
2. Erfinde KEINE Informationen – bei Unsicherheit schreibe "Nicht ermittelbar"
3. Antworte immer auf Deutsch
4. Erfinde KEINE Karrieregeschichte, Ausbildung, Sprachen oder Social-Media-Profile!
5. Verwende leere Arrays [] oder "Nicht ermittelbar" statt erfundener Daten`,
    userPrompt: `Analysiere die bereitgestellten Informationen über die folgende Person:

- Name: {{firstName}} {{lastName}}
{{#if email}}- E-Mail: {{email}}{{/if}}
{{#if company}}- Unternehmen: {{company}}{{/if}}
{{#if jobTitle}}- Position: {{jobTitle}}{{/if}}
{{#if city}}- Stadt: {{city}}{{/if}}
{{#if notes}}- Notizen: {{notes}}{{/if}}

Erstelle einen strukturierten Bericht im vorgegebenen JSON-Format.`,
    outputFormat: `Antworte NUR mit dem folgenden JSON (keine weiteren Erklärungen):
{
  "fullName": "Vollständiger Name",
  "jobTitle": "Position (nur wenn bekannt, sonst 'Nicht ermittelbar')",
  "company": "Unternehmen (nur wenn bekannt, sonst 'Nicht ermittelbar')",
  "department": "Abteilung (nur wenn aus Daten ableitbar, sonst 'Nicht ermittelbar')",
  "bio": "Kurze Zusammenfassung der BEKANNTEN Informationen (2-3 Sätze, lesbarer Text)",
  "expertise": ["Nur aus den Daten ableitbare Fachgebiete"],
  "education": ["Nur wenn in den Daten erwähnt, sonst leeres Array"],
  "careerHistory": ["Nur wenn in den Daten erwähnt, sonst leeres Array"],
  "languages": ["Nur wenn bekannt, sonst leeres Array"],
  "socialMedia": {
    "linkedin": "Nur echte URLs, sonst null",
    "xing": "null",
    "twitter": "null"
  },
  "communicationStyle": "Einschätzung basierend auf bekannter Position/Rolle, oder 'Nicht ermittelbar'",
  "decisionMakerLevel": "Entscheidungsebene basierend auf Position, oder 'Nicht ermittelbar'",
  "interests": ["Nur wenn aus Daten erkennbar, sonst leeres Array"],
  "recommendedApproach": "Ansprache-Empfehlung basierend auf den bekannten Fakten",
  "summary": "Zusammenfassung der BEKANNTEN Fakten in 2-3 Sätzen (lesbarer Text)"
}

Wichtig:
- KEINE erfundenen Profile, Karriereverläufe oder Social-Media-Links!
- Verwende leere Arrays [] oder "Nicht ermittelbar" statt erfundener Daten`,
  },

  quick_score: {
    name: 'Schnell-Scoring',
    description: 'Bewertet einen Lead schnell mit einem Score von 0-100.',
    systemPrompt: `Du bist ein B2B-Sales-Experte. Bewerte Leads mit einem Score von 0-100 basierend auf den verfügbaren Informationen.

KERNREGELN:
1. Bewerte NUR basierend auf den bereitgestellten Daten
2. Wenige Daten = niedriger Score
3. Antworte auf Deutsch
4. Antworte NUR mit dem JSON-Format`,
    userPrompt: `Bewerte den folgenden Lead:

{{#if companyName}}- Firma: {{companyName}}{{/if}}
{{#if personName}}- Person: {{personName}}{{/if}}
{{#if email}}- E-Mail: {{email}}{{/if}}
{{#if website}}- Website: {{website}}{{/if}}`,
    outputFormat: `Antworte NUR mit diesem JSON-Format:
{ "score": <Zahl von 0-100>, "reasoning": "<kurze deutsche Begründung>" }`,
  },
  idea_processing: {
    name: 'Ideen-Verarbeitung',
    description: 'Analysiert spontane Ideen und generiert eine Zusammenfassung mit Tags.',
    systemPrompt: `Du bist ein kreativer Business-Analyst. Deine Aufgabe ist es, spontane Geschäftsideen und Gedanken zu strukturieren.

KERNREGELN:
1. Erstelle eine prägnante Zusammenfassung (2-3 Sätze)
2. Generiere 3-5 relevante deutsche Tags
3. Tags sollen kurz und aussagekräftig sein (1-2 Wörter)
4. Antworte NUR mit dem JSON-Format`,
    userPrompt: `Analysiere die folgende Idee/Notiz:

{{rawContent}}

Erstelle eine strukturierte Zusammenfassung und relevante Tags.`,
    outputFormat: `Antworte NUR mit diesem JSON-Format:
{ "summary": "<2-3 Sätze Zusammenfassung>", "tags": ["tag1", "tag2", "tag3"] }`,
  },
  outreach_email: {
    name: 'Outreach E-Mail',
    description: 'Generiert personalisierte Erstkontakt-E-Mails basierend auf Lead-Research.',
    systemPrompt: `Du bist ein erfahrener B2B-Sales-Experte für den deutschen Markt. Du erstellst personalisierte Erstkontakt-E-Mails.

KERNREGELN:
1. Professioneller, aber persönlicher Ton
2. Beziehe dich auf konkrete Firmenstärken/Details
3. Halte die E-Mail kurz (max. 150 Wörter)
4. Klarer Call-to-Action (z.B. Terminvorschlag)
5. Deutsch, Sie-Form
6. Kein aggressiver Vertriebston
7. Antworte NUR mit dem JSON-Format`,
    userPrompt: `Erstelle eine Erstkontakt-E-Mail für den folgenden Lead:

{{#if companyName}}- Firma: {{companyName}}{{/if}}
{{#if personName}}- Ansprechpartner: {{personName}}{{/if}}
{{#if score}}- Lead-Score: {{score}}/100{{/if}}
{{#if strengths}}- Firmenstärken: {{strengths}}{{/if}}
{{#if researchSummary}}- Research: {{researchSummary}}{{/if}}

Die E-Mail soll die Stärken des Unternehmens würdigen und einen natürlichen Gesprächseinstieg bieten.`,
    outputFormat: `Antworte NUR mit diesem JSON-Format:
{
  "subject": "<E-Mail Betreff>",
  "body": "<E-Mail Text mit Absätzen>",
  "tone": "<professionell|freundlich|direkt>"
}`,
  },
  document_analysis: {
    name: 'Dokumentenanalyse',
    description: 'Analysiert hochgeladene Dokumente und extrahiert Finanzkennzahlen.',
    systemPrompt: `Du bist ein Finanzanalyst. Deine Aufgabe ist es, Geschäftsdokumente zu analysieren und Kennzahlen zu extrahieren.

KERNREGELN:
1. Extrahiere nur tatsächlich im Dokument genannte Zahlen
2. Erfinde KEINE Kennzahlen – schreibe "Nicht ermittelbar" wenn nicht vorhanden
3. Gib Beträge in Euro an (sofern im Dokument erkennbar)
4. Antworte auf Deutsch
5. Antworte NUR mit dem JSON-Format`,
    userPrompt: `Analysiere das folgende Dokument der Firma "{{companyName}}":

=== DOKUMENTINHALT ===
{{documentText}}
=== ENDE DES DOKUMENTS ===

Extrahiere alle verfügbaren Finanzkennzahlen und erstelle eine kurze Zusammenfassung.`,
    outputFormat: `Antworte NUR mit diesem JSON-Format:
{
  "financialKPIs": {
    "revenue": "<Umsatz oder 'Nicht ermittelbar'>",
    "profit": "<Gewinn oder 'Nicht ermittelbar'>",
    "ebitda": "<EBITDA oder 'Nicht ermittelbar'>",
    "employeeCount": "<Mitarbeiterzahl oder 'Nicht ermittelbar'>",
    "growthRate": "<Wachstumsrate oder 'Nicht ermittelbar'>",
    "debtRatio": "<Verschuldungsgrad oder 'Nicht ermittelbar'>"
  },
  "summary": "<2-3 Sätze Zusammenfassung des Dokuments>",
  "documentType": "<z.B. Geschäftsbericht, Jahresabschluss, Präsentation>"
}`,
  },
}

// ============================================
// Platzhalter-System
// ============================================

/**
 * Ersetzt {{variable}} und {{#if variable}}...{{/if}} Blöcke in Templates
 */
function applyPlaceholders(template: string, data: Record<string, string | undefined>): string {
  let result = template

  // 1. Konditionale Blöcke: {{#if key}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key: string, content: string) => {
      const value = data[key]
      if (value && value.trim() !== '') {
        // Rekursiv die Platzhalter im Block ersetzen
        return applyPlaceholders(content, data)
      }
      return ''
    }
  )

  // 2. Einfache Platzhalter: {{key}}
  result = result.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => {
      return data[key] || ''
    }
  )

  // 3. Mehrfache Leerzeilen entfernen (durch konditionale Blöcke entstanden)
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}

// ============================================
// Service
// ============================================
export const AiPromptTemplateService = {
  // ============================================
  // CRUD
  // ============================================

  async list(tenantId: string) {
    return db
      .select()
      .from(aiPromptTemplates)
      .where(eq(aiPromptTemplates.tenantId, tenantId))
      .orderBy(asc(aiPromptTemplates.slug))
  },

  async getById(tenantId: string, id: string) {
    const [template] = await db
      .select()
      .from(aiPromptTemplates)
      .where(and(eq(aiPromptTemplates.tenantId, tenantId), eq(aiPromptTemplates.id, id)))
      .limit(1)
    return template || null
  },

  async getBySlug(tenantId: string, slug: string) {
    const [template] = await db
      .select()
      .from(aiPromptTemplates)
      .where(
        and(
          eq(aiPromptTemplates.tenantId, tenantId),
          eq(aiPromptTemplates.slug, slug),
          eq(aiPromptTemplates.isActive, true)
        )
      )
      .limit(1)
    return template || null
  },

  async create(tenantId: string, data: AiPromptTemplateData) {
    const [template] = await db
      .insert(aiPromptTemplates)
      .values({
        tenantId,
        slug: data.slug,
        name: data.name,
        description: data.description || null,
        systemPrompt: data.systemPrompt,
        userPrompt: data.userPrompt,
        outputFormat: data.outputFormat || null,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        version: data.version ?? 1,
      })
      .returning()

    return template
  },

  async update(tenantId: string, id: string, data: Partial<AiPromptTemplateData>) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt
    if (data.userPrompt !== undefined) updateData.userPrompt = data.userPrompt
    if (data.outputFormat !== undefined) updateData.outputFormat = data.outputFormat
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.version !== undefined) updateData.version = data.version

    const [template] = await db
      .update(aiPromptTemplates)
      .set(updateData)
      .where(and(eq(aiPromptTemplates.tenantId, tenantId), eq(aiPromptTemplates.id, id)))
      .returning()

    return template || null
  },

  async delete(tenantId: string, id: string) {
    // Don't allow deleting default templates
    const existing = await this.getById(tenantId, id)
    if (!existing || existing.isDefault) {
      return false
    }

    const [deleted] = await db
      .delete(aiPromptTemplates)
      .where(and(eq(aiPromptTemplates.tenantId, tenantId), eq(aiPromptTemplates.id, id)))
      .returning({ id: aiPromptTemplates.id })

    return !!deleted
  },

  // ============================================
  // Seed-Defaults
  // ============================================

  async seedDefaults(tenantId: string) {
    for (const [slug, defaults] of Object.entries(DEFAULT_TEMPLATES)) {
      // Check if template already exists for this tenant+slug
      const existing = await this.getBySlug(tenantId, slug)
      if (!existing) {
        await this.create(tenantId, {
          slug,
          name: defaults.name,
          description: defaults.description,
          systemPrompt: defaults.systemPrompt,
          userPrompt: defaults.userPrompt,
          outputFormat: defaults.outputFormat,
          isActive: true,
          isDefault: true,
        })
      }
    }
  },

  async resetToDefault(tenantId: string, id: string) {
    const existing = await this.getById(tenantId, id)
    if (!existing) return null

    const defaults = DEFAULT_TEMPLATES[existing.slug]
    if (!defaults) return null

    return this.update(tenantId, id, {
      systemPrompt: defaults.systemPrompt,
      userPrompt: defaults.userPrompt,
      outputFormat: defaults.outputFormat,
      name: defaults.name,
      description: defaults.description,
    })
  },

  // ============================================
  // Template Loading with Fallback
  // ============================================

  /**
   * Lädt Template aus DB oder verwendet hart codierte Defaults als Fallback
   */
  async getOrDefault(tenantId: string, slug: string): Promise<{
    systemPrompt: string
    userPrompt: string
    outputFormat: string
  }> {
    // Versuche aus DB zu laden
    const template = await this.getBySlug(tenantId, slug)
    if (template) {
      return {
        systemPrompt: template.systemPrompt,
        userPrompt: template.userPrompt,
        outputFormat: template.outputFormat || '',
      }
    }

    // Fallback auf Default-Templates
    const defaults = DEFAULT_TEMPLATES[slug]
    if (defaults) {
      return {
        systemPrompt: defaults.systemPrompt,
        userPrompt: defaults.userPrompt,
        outputFormat: defaults.outputFormat,
      }
    }

    // Kein Template gefunden – leere Defaults
    return {
      systemPrompt: '',
      userPrompt: '',
      outputFormat: '',
    }
  },

  // ============================================
  // Platzhalter-System
  // ============================================
  applyPlaceholders,

  // ============================================
  // Platzhalter-Info
  // ============================================
  getPlaceholdersForSlug(slug: string) {
    return TEMPLATE_PLACEHOLDERS[slug] || []
  },
}
