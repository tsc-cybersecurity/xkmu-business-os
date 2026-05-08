import { GoalDetailView } from '@/components/agents/goals/goal-detail-view'

export const dynamic = 'force-dynamic'

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="container py-6">
      <GoalDetailView goalId={id} />
    </div>
  )
}
