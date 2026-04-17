/**
 * Lead Pipeline Service
 *
 * Handles post-creation enrichment of leads from the contact form:
 * 1. Find or create company
 * 2. Find or create person
 * 3. Link lead to company + person
 * 4. Trigger KI research on company
 * 5. KI-based lead scoring
 * 6. Log activity
 * 7. Admin notification
 */

import { db } from '@/lib/db'
import { leads, companies, persons, activities } from '@/lib/db/schema'
import { eq, and, ilike, or } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'


interface LeadPipelineInput {
  leadId: string
  firstName: string
  lastName: string
  email: string
  company?: string
  phone?: string
  interests: string[]
  message: string
}

const NO_COMPANY_NAME = '– ohne Firma –'

export const LeadPipelineService = {
  /**
   * Run the full pipeline (async, non-blocking from the contact API)
   */
  async process(input: LeadPipelineInput): Promise<void> {
    const { leadId } = input
    logger.info(`Pipeline started for lead ${leadId}`, { module: 'LeadPipeline' })
    try {
      // Step 1: Find or create company
      logger.info(`Step 1: Finding/creating company "${input.company || '(none)'}"`, { module: 'LeadPipeline' })
      const companyId = await this.findOrCreateCompany(input.company)
      logger.info(`Step 1 done: companyId=${companyId}`, { module: 'LeadPipeline' })

      // Step 2: Find or create person
      logger.info(`Step 2: Finding/creating person ${input.email}`, { module: 'LeadPipeline' })
      const personId = await this.findOrCreatePerson({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        companyId,
      })
      logger.info(`Step 2 done: personId=${personId}`, { module: 'LeadPipeline' })

      // Step 3: Link lead to company + person
      logger.info(`Step 3: Linking lead ${leadId}`, { module: 'LeadPipeline' })
      await db
        .update(leads)
        .set({
          companyId,
          personId,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId))
      logger.info(`Step 3 done: lead linked`, { module: 'LeadPipeline' })

      // Step 4: KI company research (async, non-blocking)
      if (input.company) {
        this.triggerCompanyResearch(companyId, input.company).catch(() => {})
      }

      // Step 5: KI-based lead scoring
      await this.scoreLeadWithKI(leadId, input)

      // Step 6: Log activity
      await this.logActivity(leadId, companyId, personId, input)

      // Step 7: Admin notification
      await this.notifyAdmin(leadId, input)

      logger.info(`Pipeline completed for lead ${leadId}`, { module: 'LeadPipeline' })
    } catch (error) {
      logger.error(`Lead pipeline FAILED for ${leadId}: ${error instanceof Error ? error.message : String(error)}`, error, { module: 'LeadPipeline' })
    }
  },

  /**
   * Find existing company by name or create new one
   */
  async findOrCreateCompany(companyName?: string): Promise<string> {
    const name = companyName?.trim()

    if (!name) {
      // No company given – find or create placeholder
      const [existing] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.name, NO_COMPANY_NAME))
        .limit(1)

      if (existing) return existing.id

      const [created] = await db
        .insert(companies)
        .values({ name: NO_COMPANY_NAME, status: 'active', country: 'DE' })
        .returning({ id: companies.id })
      return created.id
    }

    // Search for existing company (case-insensitive)
    const [existing] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(ilike(companies.name, name))
      .limit(1)

    if (existing) return existing.id

    // Create new company
    const [created] = await db
      .insert(companies)
      .values({ name, status: 'active', country: 'DE' })
      .returning({ id: companies.id })

    logger.info(`Created company: ${name}`, { module: 'LeadPipeline' })
    return created.id
  },

  /**
   * Find existing person by email or create new one
   */
  async findOrCreatePerson(data: { firstName: string; lastName: string; email: string; phone?: string; companyId: string }
  ): Promise<string> {
    // Search by email first
    const [existing] = await db
      .select({ id: persons.id })
      .from(persons)
      .where(ilike(persons.email, data.email))
      .limit(1)

    if (existing) {
      // Update company link if changed
      await db
        .update(persons)
        .set({ companyId: data.companyId, updatedAt: new Date() })
        .where(eq(persons.id, existing.id))
      return existing.id
    }

    // Create new person
    const [created] = await db
      .insert(persons)
      .values({
        companyId: data.companyId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        status: 'active',
      })
      .returning({ id: persons.id })

    logger.info(`Created person: ${data.firstName} ${data.lastName}`, { module: 'LeadPipeline' })
    return created.id
  },

  /**
   * Trigger async KI research on the company
   */
  async triggerCompanyResearch(companyId: string, companyName: string): Promise<void> {
    try {
      const { TaskQueueService } = await import('@/lib/services/task-queue.service')
      await TaskQueueService.create({
        type: 'ai',
        priority: 2,
        payload: {
          action: 'company_research',
          companyId,
          companyName,
          prompt: `Recherchiere die Firma "${companyName}". Finde: Website, Branche, ungefähre Mitarbeiterzahl, Standort, und eine kurze Beschreibung was das Unternehmen macht. Antworte auf Deutsch in JSON: {"website":"","branche":"","mitarbeiter":"","standort":"","beschreibung":""}`,
        },
        referenceType: 'company',
        referenceId: companyId,
      })
      logger.info(`Queued company research for: ${companyName}`, { module: 'LeadPipeline' })
    } catch (error) {
      logger.warn(`Company research queue failed for ${companyName}`, { module: 'LeadPipeline' })
    }
  },

  /**
   * Score lead based on available data + interests
   */
  async scoreLeadWithKI(leadId: string, input: LeadPipelineInput): Promise<void> {
    try {
      let score = 20 // Basis

      // Contact completeness
      if (input.email) score += 15
      if (input.phone) score += 10
      if (input.company) score += 15

      // Interest-based scoring (high-value services score higher)
      const highValueInterests = [
        'Security Quick Check', 'Hardening & Baselines', 'Incident Response',
        'NIS-2 Unterstützung', 'Datenschutz & Compliance', 'Kombinations-Modul',
      ]
      const midValueInterests = [
        'KI-Beratung', 'KI-Automatisierung', 'IT-Assessment', 'IT-Architektur & Cloud',
      ]
      for (const interest of input.interests) {
        if (highValueInterests.includes(interest)) score += 10
        else if (midValueInterests.includes(interest)) score += 7
        else score += 3
      }

      // Message length indicates engagement
      if (input.message.length > 200) score += 10
      else if (input.message.length > 50) score += 5

      // Cap at 100
      score = Math.min(100, Math.max(0, score))

      await db
        .update(leads)
        .set({ score, updatedAt: new Date() })
        .where(eq(leads.id, leadId))

      logger.info(`Scored lead ${leadId}: ${score}`, { module: 'LeadPipeline' })
    } catch (error) {
      logger.warn(`Lead scoring failed for ${leadId}`, { module: 'LeadPipeline' })
    }
  },

  /**
   * Log activity for the lead
   */
  async logActivity(leadId: string,
    companyId: string,
    personId: string,
    input: LeadPipelineInput
  ): Promise<void> {
    try {
      await db.insert(activities).values({
        leadId,
        companyId,
        personId,
        type: 'note',
        subject: 'Kontaktformular ausgefüllt',
        content: [
          `**Interessen:** ${input.interests.join(', ')}`,
          `**Nachricht:** ${input.message}`,
          input.company ? `**Firma:** ${input.company}` : null,
          input.phone ? `**Telefon:** ${input.phone}` : null,
        ].filter(Boolean).join('\n\n'),
        metadata: {
          source: 'contact_form',
          interests: input.interests,
        },
      })
    } catch (error) {
      logger.warn(`Activity log failed for lead ${leadId}`, { module: 'LeadPipeline' })
    }
  },

  /**
   * Notify admin about new lead via task queue email
   */
  async notifyAdmin(leadId: string, input: LeadPipelineInput): Promise<void> {
    try {
      const { TaskQueueService } = await import('@/lib/services/task-queue.service')
      await TaskQueueService.create({
        type: 'email',
        priority: 1,
        payload: {
          templateSlug: 'lead_admin_notification',
          to: '__ADMIN__', // Email-Service resolves to tenant admin email
          placeholders: {
            name: `${input.firstName} ${input.lastName}`,
            firma: input.company || '–',
            email: input.email,
            telefon: input.phone || '–',
            interessen: input.interests.join(', '),
            nachricht: input.message.substring(0, 500),
            leadUrl: `/intern/leads/${leadId}`,
          },
          leadId,
        },
        referenceType: 'lead',
        referenceId: leadId,
      })
    } catch (error) {
      logger.warn(`Admin notification failed for lead ${leadId}`, { module: 'LeadPipeline' })
    }
  },
}
