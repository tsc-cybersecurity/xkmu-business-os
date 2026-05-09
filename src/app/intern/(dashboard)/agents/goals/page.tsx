import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GoalListTable } from '@/components/agents/goals/goal-list-table'

export const dynamic = 'force-dynamic'

export default function GoalsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agenten-Goals</h1>
          <p className="text-sm text-muted-foreground">Aufgaben fuer den Hauptagenten — Plan/Execute/ReplanLoop.</p>
        </div>
        <Button asChild>
          <Link href="/intern/agents/goals/new">Neues Goal</Link>
        </Button>
      </div>
      <GoalListTable />
    </div>
  )
}
