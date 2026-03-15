'use client'

import { AIResearchCard } from '@/components/shared'

interface CompanyResearchSectionProps {
  companyId: string
  company: { id: string; name: string; website: string | null }
  onResearchComplete: () => void
}

export function CompanyResearchSection({ companyId, company, onResearchComplete }: CompanyResearchSectionProps) {
  return (
    <AIResearchCard
      entityType="company"
      entityId={companyId}
      entityLabel={company.name}
      companyData={company}
      companyWebsite={company.website || undefined}
      onResearchComplete={onResearchComplete}
    />
  )
}
