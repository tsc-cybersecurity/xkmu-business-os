'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'

interface Company {
  id: string
  name: string
  legalForm: string | null
  status: string
  tags: string[]
}

const statusLabels: Record<string, string> = {
  prospect: 'Interessent',
  lead: 'Lead',
  customer: 'Kunde',
  partner: 'Partner',
  churned: 'Verloren',
  inactive: 'Inaktiv',
}

const statusColors: Record<string, string> = {
  prospect: 'bg-gray-500',
  lead: 'bg-blue-500',
  customer: 'bg-green-500',
  partner: 'bg-purple-500',
  churned: 'bg-red-500',
  inactive: 'bg-gray-400',
}

interface CompanyDetailsHeaderProps {
  company: Company
  onDeleteClick: () => void
}

export function CompanyDetailsHeader({ company, onDeleteClick }: CompanyDetailsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <Button variant="ghost" size="icon" aria-label="Zurueck" asChild className="shrink-0">
          <Link href="/intern/contacts/companies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">{company.name}</h1>
            {company.legalForm && (
              <span className="text-muted-foreground">
                {company.legalForm}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={statusColors[company.status]}>
              {statusLabels[company.status] || company.status}
            </Badge>
            {company.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 shrink-0 self-start">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/intern/contacts/companies/${company.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Link>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteClick}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Löschen
        </Button>
      </div>
    </div>
  )
}
