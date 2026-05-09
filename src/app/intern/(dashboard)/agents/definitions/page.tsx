import { DefinitionsList } from '@/components/agents/definitions/definitions-list'

export const dynamic = 'force-dynamic'

export default function DefinitionsPage() {
  return (
    <div className="container py-6">
      <DefinitionsList />
    </div>
  )
}
