import { RunDetailView } from '@/components/agents/runs/run-detail-view'

export const dynamic = 'force-dynamic'

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="container py-6">
      <RunDetailView runId={id} />
    </div>
  )
}
