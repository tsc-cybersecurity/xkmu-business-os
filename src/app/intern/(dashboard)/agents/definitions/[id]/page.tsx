import { db } from '@/lib/db'
import { agentDefinitions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { DefinitionForm } from '@/components/agents/definitions/definition-form'

export const dynamic = 'force-dynamic'

export default async function DefinitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [def] = await db
    .select()
    .from(agentDefinitions)
    .where(eq(agentDefinitions.id, id))
    .limit(1)
  if (!def) notFound()
  return (
    <div className="container py-6">
      <DefinitionForm
        initial={{
          id: def.id,
          slug: def.slug,
          role: def.role,
          name: def.name,
          systemPrompt: def.systemPrompt,
          allowedTools: def.allowedTools,
          modelHint: def.modelHint,
          maxTokensPerCall: def.maxTokensPerCall,
          maxIterations: def.maxIterations,
          isActive: def.isActive,
        }}
      />
    </div>
  )
}
