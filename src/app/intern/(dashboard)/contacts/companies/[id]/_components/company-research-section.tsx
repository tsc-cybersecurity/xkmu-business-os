'use client'

import { AIResearchCard } from '@/components/shared'

interface Company {
  id: string
  name: string
  website: string | null
  [key: string]: unknown
}

interface CompanyResearchSectionProps {
  companyId: string
  company: Company
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
