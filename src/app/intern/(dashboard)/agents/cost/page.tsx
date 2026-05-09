import { CostCharts } from '@/components/agents/cost/cost-charts'

export const dynamic = 'force-dynamic'

export default function CostPage() {
  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-2xl font-bold">Agent-Kosten</h1>
      <p className="text-muted-foreground">Cost-Analytics ueber alle Agent-Runs.</p>
      <CostCharts />
    </div>
  )
}
