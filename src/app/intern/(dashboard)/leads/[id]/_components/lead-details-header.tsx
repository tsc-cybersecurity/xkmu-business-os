'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  Trash2,
} from 'lucide-react'

const statusLabels: Record<string, string> = {
  new: 'Neu',
  qualifying: 'Qualifizierung',
  qualified: 'Qualifiziert',
  contacted: 'Kontaktiert',
  meeting_scheduled: 'Termin vereinbart',
  proposal_sent: 'Angebot gesendet',
  won: 'Gewonnen',
  lost: 'Verloren',
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  qualifying: 'bg-yellow-500',
  qualified: 'bg-green-400',
  contacted: 'bg-purple-500',
  meeting_scheduled: 'bg-indigo-500',
  proposal_sent: 'bg-orange-500',
  won: 'bg-green-600',
  lost: 'bg-gray-500',
}

const sourceLabels: Record<string, string> = {
  api: 'API',
  form: 'Formular',
  import: 'Import',
  manual: 'Manuell',
  idea: 'Idee',
  website: 'Website',
}

interface Lead {
  title: string | null
  source: string
  status: string
  score: number | null
  company: { id: string; name: string } | null
  person: { id: string; firstName: string; lastName: string; email: string | null } | null
  sourceDetail: string | null
}

interface LeadDetailsHeaderProps {
  lead: Lead
  editing: boolean
  saving: boolean
  editTitle: string
  onEditTitleChange: (title: string) => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onSave: () => void
  onDeleteClick: () => void
}

export function LeadDetailsHeader({
  lead,
  editing,
  saving,
  editTitle,
  onEditTitleChange,
  onStartEditing,
  onCancelEditing,
  onSave,
  onDeleteClick,
}: LeadDetailsHeaderProps) {
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Zurück" asChild>
          <Link href="/intern/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          {editing ? (
            <Input
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              placeholder="Lead-Titel eingeben..."
              className="text-2xl font-bold h-auto py-1 mb-2"
            />
          ) : (
            <h1 className="text-3xl font-bold">
              {lead.title ||
                lead.company?.name ||
                (lead.person
                  ? `${lead.person.firstName} ${lead.person.lastName}`
                  : lead.sourceDetail || 'Lead')}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusColors[lead.status]}>
              {statusLabels[lead.status] || lead.status}
            </Badge>
            <Badge variant="outline">
              {sourceLabels[lead.source] || lead.source}
            </Badge>
            {lead.score !== null && (
              <span className={`font-bold ${getScoreColor(lead.score)}`}>
                Score: {lead.score}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {editing ? (
          <>
            <Button variant="outline" onClick={onCancelEditing} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Abbrechen
            </Button>
            <Button onClick={onSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onStartEditing}>
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteClick}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
