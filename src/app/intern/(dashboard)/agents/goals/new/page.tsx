import { GoalForm } from '@/components/agents/goals/goal-form'

export const dynamic = 'force-dynamic'

export default function GoalNewPage() {
  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-2xl font-semibold">Neues Goal</h1>
      <p className="text-sm text-muted-foreground">
        Beschreibe das Ziel klar und konkret. Der Hauptagent zerlegt es in Steps und fuehrt sie aus.
      </p>
      <GoalForm />
    </div>
  )
}
