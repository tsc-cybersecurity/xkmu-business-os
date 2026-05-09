import { db } from '@/lib/db'
import { agentGoalTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { TemplateForm } from '@/components/agents/templates/template-form'

export const dynamic = 'force-dynamic'

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [tmpl] = await db.select().from(agentGoalTemplates).where(eq(agentGoalTemplates.id, id)).limit(1)
  if (!tmpl) notFound()
  return (
    <div className="container py-6">
      <TemplateForm
        initial={{
          id: tmpl.id, slug: tmpl.slug, name: tmpl.name, description: tmpl.description,
          titleTemplate: tmpl.titleTemplate, descriptionTemplate: tmpl.descriptionTemplate,
          requiredVariables: tmpl.requiredVariables,
          defaultBudgetCents: tmpl.defaultBudgetCents, defaultBudgetTokens: tmpl.defaultBudgetTokens,
          defaultExecutionMode: tmpl.defaultExecutionMode, defaultPriority: tmpl.defaultPriority,
          defaultRequirePlanApproval: tmpl.defaultRequirePlanApproval, isActive: tmpl.isActive,
        }}
      />
    </div>
  )
}
