import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { products, productCategories, leads, businessProfiles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { AIService } from '@/lib/services/ai/ai.service'
import { TenantService } from '@/lib/services/tenant.service'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async (_auth) => {
    try {

      // 1. Load tenant info
      const tenant = await TenantService.getById(TENANT_ID)
      if (!tenant) return apiError('NOT_FOUND', 'Tenant nicht gefunden', 404)

      const tenantSettings = (tenant.settings ?? {}) as Record<string, unknown>
      const companyDescription = (tenantSettings.companyDescription as string) || ''

      // 2. Load products
      const allProducts = await db
        .select({ name: products.name, description: products.description, type: products.type, price: products.priceNet })
        .from(products)
      const productList = allProducts
        .filter(p => p.type === 'product' || !p.type)
        .map(p => `- ${p.name}${p.description ? ': ' + p.description : ''}${p.price ? ' (' + p.price + ' EUR)' : ''}`)
        .join('\n') || 'Keine Produkte vorhanden'

      const serviceList = allProducts
        .filter(p => p.type === 'service')
        .map(p => `- ${p.name}${p.description ? ': ' + p.description : ''}${p.price ? ' (' + p.price + ' EUR)' : ''}`)
        .join('\n') || 'Keine Dienstleistungen vorhanden'

      // 3. Load categories
      const allCategories = await db
        .select({ name: productCategories.name, description: productCategories.description })
        .from(productCategories)
      const categoryList = allCategories.map(c => `- ${c.name}${c.description ? ': ' + c.description : ''}`).join('\n') || 'Keine Kategorien vorhanden'

      // 4. Load lead interests summary
      const recentLeads = await db
        .select({ title: leads.title, tags: leads.tags, contactCompany: leads.contactCompany, score: leads.score })
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(50)

      const tagCounts: Record<string, number> = {}
      for (const lead of recentLeads) {
        for (const tag of (lead.tags || [])) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      }
      const topInterests = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag, count]) => `- ${tag} (${count}x)`)
        .join('\n')

      const leadSummary = [
        `${recentLeads.length} Leads insgesamt`,
        topInterests ? `\nTop-Interessen:\n${topInterests}` : '',
        `\nFirmen: ${[...new Set(recentLeads.map(l => l.contactCompany).filter(Boolean))].slice(0, 10).join(', ') || 'Keine'}`,
      ].join('\n')

      // 5. Load business profile if exists
      const [latestProfile] = await db
        .select({ analysis: businessProfiles.rawAnalysis })
        .from(businessProfiles)
        .orderBy(desc(businessProfiles.createdAt))
        .limit(1)

      const biSummary = latestProfile?.analysis
        ? (typeof latestProfile.analysis === 'string' ? latestProfile.analysis : JSON.stringify(latestProfile.analysis)).substring(0, 2000)
        : 'Keine Business-Intelligence-Analyse vorhanden'

      // 6. Get prompt template
      const template = await AiPromptTemplateService.getOrDefault(TENANT_ID, 'company_knowledge_analysis')

      const userPrompt = AiPromptTemplateService.applyPlaceholders(template.userPrompt, {
        companyName: tenant.name,
        companyDescription: companyDescription || 'Keine Beschreibung vorhanden',
        products: productList,
        services: serviceList,
        categories: categoryList,
        leads: leadSummary,
        businessProfile: biSummary,
      })

      // 7. Call AI
      const fullPrompt = `${template.systemPrompt}\n\n${userPrompt}`
      const aiResult = await AIService.completeWithContext(fullPrompt, {
        feature: 'company_knowledge',
      }, {
        maxTokens: 4000,
        temperature: 0.3,
      })

      if (!aiResult.text) {
        return apiError('AI_ERROR', 'KI-Analyse fehlgeschlagen – keine Antwort', 500)
      }

      // 8. Save result to tenant settings
      await TenantService.update(TENANT_ID, {
        settings: {
          ...tenantSettings,
          companyKnowledge: aiResult.text,
          companyKnowledgeUpdatedAt: new Date().toISOString(),
        },
      })

      logger.info(`Company knowledge analysis completed for ${tenant.name}`, { module: 'TenantAnalyze' })

      return apiSuccess({
        knowledge: aiResult.text,
        stats: {
          products: allProducts.filter(p => p.type !== 'service').length,
          services: allProducts.filter(p => p.type === 'service').length,
          categories: allCategories.length,
          leads: recentLeads.length,
          topInterests: Object.keys(tagCounts).length,
        },
      })
    } catch (error) {
      logger.error('Company knowledge analysis failed', error, { module: 'TenantAnalyze' })
      return apiError('ANALYSIS_FAILED', `Analyse fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`, 500)
    }
  })
}
