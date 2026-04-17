// ============================================
// Document Template Service (KI-Dokument-Generator)
// ============================================

import { db } from '@/lib/db'
import { documentTemplates } from '@/lib/db/schema'
import type { DocumentTemplate } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { AIService } from '@/lib/services/ai/ai.service'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { TENANT_ID } from '@/lib/constants/tenant'

export const DocumentTemplateService = {
  async list(_tenantId: string, category?: string): Promise<DocumentTemplate[]> {
    const conditions = []
    if (category) conditions.push(eq(documentTemplates.category, category))
    return db.select().from(documentTemplates).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(documentTemplates.name)
  },

  async getById(_tenantId: string, id: string): Promise<DocumentTemplate | null> {
    const [tpl] = await db.select().from(documentTemplates)
      .where(eq(documentTemplates.id, id)).limit(1)
    return tpl ?? null
  },

  async create(_tenantId: string, data: {
    name: string; category?: string; bodyHtml?: string; placeholders?: unknown; headerHtml?: string; footerHtml?: string
  }): Promise<DocumentTemplate> {
    const [tpl] = await db.insert(documentTemplates).values({
      tenantId: TENANT_ID, name: data.name, category: data.category || null,
      bodyHtml: data.bodyHtml || '', placeholders: data.placeholders || [],
      headerHtml: data.headerHtml || null, footerHtml: data.footerHtml || null,
    }).returning()
    return tpl
  },

  async update(_tenantId: string, id: string, data: Partial<{
    name: string; category: string; bodyHtml: string; placeholders: unknown; headerHtml: string; footerHtml: string
  }>): Promise<DocumentTemplate | null> {
    const [tpl] = await db.update(documentTemplates).set({ ...data, updatedAt: new Date() })
      .where(eq(documentTemplates.id, id)).returning()
    return tpl ?? null
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(documentTemplates)
      .where(eq(documentTemplates.id, id))
      .returning({ id: documentTemplates.id })
    return result.length > 0
  },

  applyPlaceholders(html: string, values: Record<string, string>): string {
    let result = html
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return result
  },

  async generateWithAI(_tenantId: string, templateId: string, context: string): Promise<string> {
    const tpl = await this.getById(_templateId)
    if (!tpl) throw new Error('Template nicht gefunden')

    const promptTemplate = await AiPromptTemplateService.getOrDefault(_'document_template_fill')
    const userPrompt = AiPromptTemplateService.applyPlaceholders(promptTemplate.userPrompt, {
      context, template: tpl.bodyHtml || '',
    })

    const response = await AIService.completeWithContext(userPrompt,
      { tenantId: _feature: 'document_template_generate' },
      { maxTokens: 4000, temperature: 0.3, systemPrompt: promptTemplate.systemPrompt })

    return response.text
  },

  async seed(_tenantId: string): Promise<number> {
    let created = 0
    for (const tpl of DEFAULT_DOC_TEMPLATES) {
      const existing = await db.select({ id: documentTemplates.id }).from(documentTemplates)
        .where(eq(documentTemplates.name, tpl.name)).limit(1)
      if (existing.length > 0) continue
      await this.create(_tpl)
      created++
    }
    return created
  },
}

const DEFAULT_DOC_TEMPLATES = [
  {
    name: 'Massnahmenplan',
    category: 'report',
    bodyHtml: `<h1>Massnahmenplan: {{projektname}}</h1>
<h2>1. Zusammenfassung</h2><p>{{zusammenfassung}}</p>
<h2>2. Ist-Analyse</h2><p>{{istAnalyse}}</p>
<h2>3. Massnahmen</h2><p>{{massnahmen}}</p>
<h2>4. Zeitplan</h2><p>{{zeitplan}}</p>
<h2>5. Verantwortlichkeiten</h2><p>{{verantwortlichkeiten}}</p>`,
    placeholders: [
      { key: 'projektname', label: 'Projektname', aiFillable: false },
      { key: 'zusammenfassung', label: 'Zusammenfassung', aiFillable: true },
      { key: 'istAnalyse', label: 'Ist-Analyse', aiFillable: true },
      { key: 'massnahmen', label: 'Massnahmen', aiFillable: true },
      { key: 'zeitplan', label: 'Zeitplan', aiFillable: true },
      { key: 'verantwortlichkeiten', label: 'Verantwortlichkeiten', aiFillable: true },
    ],
  },
  {
    name: 'Security-Roadmap',
    category: 'security',
    bodyHtml: `<h1>Security-Roadmap: {{firmenname}}</h1>
<h2>Audit-Ergebnis</h2><p>{{auditErgebnis}}</p>
<h2>Kurzfristige Massnahmen (0-3 Monate)</h2><p>{{kurzfristig}}</p>
<h2>Mittelfristige Massnahmen (3-6 Monate)</h2><p>{{mittelfristig}}</p>
<h2>Langfristige Massnahmen (6-12 Monate)</h2><p>{{langfristig}}</p>
<h2>Budget-Schaetzung</h2><p>{{budget}}</p>`,
    placeholders: [
      { key: 'firmenname', label: 'Firmenname', aiFillable: false },
      { key: 'auditErgebnis', label: 'Audit-Ergebnis', aiFillable: true },
      { key: 'kurzfristig', label: 'Kurzfristig', aiFillable: true },
      { key: 'mittelfristig', label: 'Mittelfristig', aiFillable: true },
      { key: 'langfristig', label: 'Langfristig', aiFillable: true },
      { key: 'budget', label: 'Budget', aiFillable: true },
    ],
  },
  {
    name: 'Betriebshandbuch',
    category: 'runbook',
    bodyHtml: `<h1>Betriebshandbuch: {{firmenname}}</h1>
<h2>1. Systemuebersicht</h2><p>{{systeme}}</p>
<h2>2. Zugaenge & Konten</h2><p>{{zugaenge}}</p>
<h2>3. Netzwerk</h2><p>{{netzwerk}}</p>
<h2>4. Backup & Recovery</h2><p>{{backup}}</p>
<h2>5. Wartung & Updates</h2><p>{{wartung}}</p>
<h2>6. Ansprechpartner</h2><p>{{kontakte}}</p>`,
    placeholders: [
      { key: 'firmenname', label: 'Firmenname', aiFillable: false },
      { key: 'systeme', label: 'Systeme', aiFillable: true },
      { key: 'zugaenge', label: 'Zugaenge', aiFillable: true },
      { key: 'netzwerk', label: 'Netzwerk', aiFillable: true },
      { key: 'backup', label: 'Backup', aiFillable: true },
      { key: 'wartung', label: 'Wartung', aiFillable: true },
      { key: 'kontakte', label: 'Kontakte', aiFillable: true },
    ],
  },
  {
    name: 'Backup-Strategie',
    category: 'security',
    bodyHtml: `<h1>Backup-Strategie: {{firmenname}}</h1>
<h2>3-2-1-Regel</h2><p>{{dreizweieins}}</p>
<h2>RPO / RTO</h2><p>{{rpoRto}}</p>
<h2>Backup-Systeme</h2><p>{{systeme}}</p>
<h2>Verantwortlichkeiten</h2><p>{{verantwortlichkeiten}}</p>
<h2>Test-Zeitplan</h2><p>{{testplan}}</p>`,
    placeholders: [
      { key: 'firmenname', label: 'Firmenname', aiFillable: false },
      { key: 'dreizweieins', label: '3-2-1 Umsetzung', aiFillable: true },
      { key: 'rpoRto', label: 'RPO/RTO', aiFillable: true },
      { key: 'systeme', label: 'Systeme', aiFillable: true },
      { key: 'verantwortlichkeiten', label: 'Verantwortlichkeiten', aiFillable: true },
      { key: 'testplan', label: 'Testplan', aiFillable: true },
    ],
  },
  {
    name: 'Security-Richtlinie',
    category: 'security',
    bodyHtml: `<h1>IT-Sicherheitsrichtlinie: {{firmenname}}</h1>
<h2>1. Passwort-Richtlinie</h2><p>{{passwort}}</p>
<h2>2. E-Mail-Sicherheit</h2><p>{{email}}</p>
<h2>3. BYOD / Mobile Geraete</h2><p>{{byod}}</p>
<h2>4. Datenschutz & DSGVO</h2><p>{{datenschutz}}</p>
<h2>5. Meldepflichten</h2><p>{{meldepflichten}}</p>
<h2>6. Schulungspflicht</h2><p>{{schulung}}</p>`,
    placeholders: [
      { key: 'firmenname', label: 'Firmenname', aiFillable: false },
      { key: 'passwort', label: 'Passwort-Richtlinie', aiFillable: true },
      { key: 'email', label: 'E-Mail', aiFillable: true },
      { key: 'byod', label: 'BYOD', aiFillable: true },
      { key: 'datenschutz', label: 'Datenschutz', aiFillable: true },
      { key: 'meldepflichten', label: 'Meldepflichten', aiFillable: true },
      { key: 'schulung', label: 'Schulung', aiFillable: true },
    ],
  },
  {
    name: 'Notfall-Playbook',
    category: 'security',
    bodyHtml: `<h1>Notfall-Playbook: {{firmenname}}</h1>
<h2>Szenario 1: Ransomware</h2><p>{{ransomware}}</p>
<h2>Szenario 2: Datenverlust</h2><p>{{datenverlust}}</p>
<h2>Szenario 3: Phishing-Vorfall</h2><p>{{phishing}}</p>
<h2>Szenario 4: Systemausfall</h2><p>{{systemausfall}}</p>
<h2>Meldewege</h2><p>{{meldewege}}</p>
<h2>Notfallkontakte</h2><p>{{kontakte}}</p>`,
    placeholders: [
      { key: 'firmenname', label: 'Firmenname', aiFillable: false },
      { key: 'ransomware', label: 'Ransomware', aiFillable: true },
      { key: 'datenverlust', label: 'Datenverlust', aiFillable: true },
      { key: 'phishing', label: 'Phishing', aiFillable: true },
      { key: 'systemausfall', label: 'Systemausfall', aiFillable: true },
      { key: 'meldewege', label: 'Meldewege', aiFillable: true },
      { key: 'kontakte', label: 'Kontakte', aiFillable: true },
    ],
  },
  {
    name: 'Awareness-Schulung',
    category: 'security',
    bodyHtml: `<h1>IT-Sicherheits-Awareness: {{firmenname}}</h1>
<h2>Modul 1: Phishing erkennen</h2><p>{{phishing}}</p>
<h2>Modul 2: Sichere Passwoerter</h2><p>{{passwoerter}}</p>
<h2>Modul 3: Social Engineering</h2><p>{{socialEngineering}}</p>
<h2>Modul 4: Datenschutz im Alltag</h2><p>{{datenschutz}}</p>
<h2>Quiz / Selbsttest</h2><p>{{quiz}}</p>`,
    placeholders: [
      { key: 'firmenname', label: 'Firmenname', aiFillable: false },
      { key: 'phishing', label: 'Phishing', aiFillable: true },
      { key: 'passwoerter', label: 'Passwoerter', aiFillable: true },
      { key: 'socialEngineering', label: 'Social Engineering', aiFillable: true },
      { key: 'datenschutz', label: 'Datenschutz', aiFillable: true },
      { key: 'quiz', label: 'Quiz', aiFillable: true },
    ],
  },
]
