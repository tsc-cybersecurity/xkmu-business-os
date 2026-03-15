'use client'

import { ActivityTimeline } from '../../_components/activity-timeline'

interface LeadOutreachSectionProps {
  leadId: string
  companyId?: string
  aiResearchCompleted: boolean
}

export function LeadOutreachSection({ leadId, companyId, aiResearchCompleted }: LeadOutreachSectionProps) {
  return (
    <ActivityTimeline
      leadId={leadId}
      companyId={companyId}
      showOutreachButton={true}
      outreachEnabled={aiResearchCompleted}
    />
  )
}
