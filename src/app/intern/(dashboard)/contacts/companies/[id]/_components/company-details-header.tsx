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
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Zurueck" asChild>
          <Link href="/intern/contacts/companies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{company.name}</h1>
            {company.legalForm && (
              <span className="text-muted-foreground">
                {company.legalForm}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
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

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/intern/contacts/companies/${company.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Link>
        </Button>
        <Button
          variant="destructive"
          onClick={onDeleteClick}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Löschen
        </Button>
      </div>
    </div>
  )
}
