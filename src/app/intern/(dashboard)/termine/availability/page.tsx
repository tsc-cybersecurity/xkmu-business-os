import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AvailabilityService } from '@/lib/services/availability.service'
import { AvailabilityView } from './_components/AvailabilityView'

export default async function AvailabilityPage() {
  const session = await getSession()
  if (!session) redirect('/intern/login')

  const [rules, overrides] = await Promise.all([
    AvailabilityService.listRules(session.user.id),
    AvailabilityService.listOverrides(session.user.id),
  ])

  return (
    <AvailabilityView
      initialRules={rules}
      initialOverrides={overrides.map(o => ({
        id: o.id,
        userId: o.userId,
        startAt: o.startAt.toISOString(),
        endAt: o.endAt.toISOString(),
        kind: o.kind as 'free' | 'block',
        reason: o.reason,
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  )
}
