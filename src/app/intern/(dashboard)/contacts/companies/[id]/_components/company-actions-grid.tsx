'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Mail,
  Reply as MailReply,
  CalendarPlus,
  Heart,
  FileText,
  ArrowRightLeft,
  TrendingUp,
  RotateCcw,
  BarChart3,
  Users,
  Target,
  Map,
  Share2,
  Award,
  Newspaper,
  Ticket,
  ClipboardList,
  PhoneOutgoing,
  ListChecks,
  ShieldAlert,
  Megaphone,
  Building,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Icon map
const ICON_MAP: Record<string, LucideIcon> = {
  Mail,
  MailReply,
  CalendarPlus,
  Heart,
  FileText,
  ArrowRightLeft,
  TrendingUp,
  RotateCcw,
  BarChart3,
  Users,
  Target,
  Map,
  Share2,
  Award,
  Newspaper,
  Ticket,
  ClipboardList,
  PhoneOutgoing,
  ListChecks,
  ShieldAlert,
  Megaphone,
  Building,
}

// Action definitions (mirrors server-side COMPANY_ACTIONS)
const COMPANY_ACTIONS = [
  { slug: 'company_first_contact', name: 'Erstansprache', category: 'communication', color: 'blue', activityType: 'email', icon: 'Mail' },
  { slug: 'company_follow_up', name: 'Follow-Up', category: 'communication', color: 'blue', activityType: 'email', icon: 'MailReply' },
  { slug: 'company_appointment', name: 'Terminvereinbarung', category: 'communication', color: 'blue', activityType: 'email', icon: 'CalendarPlus' },
  { slug: 'company_thank_you', name: 'Dankesschreiben', category: 'communication', color: 'blue', activityType: 'email', icon: 'Heart' },
  { slug: 'company_offer_letter', name: 'Angebots-Brief', category: 'sales', color: 'green', activityType: 'email', icon: 'FileText' },
  { slug: 'company_cross_selling', name: 'Cross-Selling', category: 'sales', color: 'green', activityType: 'note', icon: 'ArrowRightLeft' },
  { slug: 'company_upselling', name: 'Upselling', category: 'sales', color: 'green', activityType: 'note', icon: 'TrendingUp' },
  { slug: 'company_reactivation', name: 'Reaktivierung', category: 'sales', color: 'green', activityType: 'email', icon: 'RotateCcw' },
  { slug: 'company_swot', name: 'SWOT-Analyse', category: 'analysis', color: 'purple', activityType: 'note', icon: 'BarChart3' },
  { slug: 'company_competitor_analysis', name: 'Wettbewerb', category: 'analysis', color: 'purple', activityType: 'note', icon: 'Users' },
  { slug: 'company_needs_analysis', name: 'Bedarfsanalyse', category: 'analysis', color: 'purple', activityType: 'note', icon: 'Target' },
  { slug: 'company_development_plan', name: 'Entwicklungsplan', category: 'analysis', color: 'purple', activityType: 'note', icon: 'Map' },
  { slug: 'company_social_post', name: 'Social Post', category: 'marketing', color: 'amber', activityType: 'note', icon: 'Share2' },
  { slug: 'company_reference_request', name: 'Referenz-Anfrage', category: 'marketing', color: 'amber', activityType: 'email', icon: 'Award' },
  { slug: 'company_newsletter', name: 'Newsletter', category: 'marketing', color: 'amber', activityType: 'note', icon: 'Newspaper' },
  { slug: 'company_event_invite', name: 'Event-Einladung', category: 'marketing', color: 'amber', activityType: 'email', icon: 'Ticket' },
  { slug: 'company_meeting_summary', name: 'Meeting-Protokoll', category: 'internal', color: 'gray', activityType: 'meeting', icon: 'ClipboardList' },
  { slug: 'company_call_guide', name: 'Gesprächsleitfaden', category: 'internal', color: 'gray', activityType: 'call', icon: 'PhoneOutgoing' },
  { slug: 'company_next_steps', name: 'Nächste Schritte', category: 'internal', color: 'gray', activityType: 'note', icon: 'ListChecks' },
  { slug: 'company_risk_assessment', name: 'Risikobewertung', category: 'internal', color: 'gray', activityType: 'note', icon: 'ShieldAlert' },
] as const

type ActionDef = (typeof COMPANY_ACTIONS)[number]

interface CategoryDef {
  key: string
  label: string
  icon: LucideIcon
  colorClass: string
  borderClass: string
}

const CATEGORIES: CategoryDef[] = [
  { key: 'communication', label: 'Kommunikation', icon: Mail, colorClass: 'text-blue-500', borderClass: 'border-l-blue-500' },
  { key: 'sales', label: 'Vertrieb', icon: TrendingUp, colorClass: 'text-green-500', borderClass: 'border-l-green-500' },
  { key: 'analysis', label: 'Analyse', icon: BarChart3, colorClass: 'text-purple-500', borderClass: 'border-l-purple-500' },
  { key: 'marketing', label: 'Marketing', icon: Megaphone, colorClass: 'text-amber-500', borderClass: 'border-l-amber-500' },
  { key: 'internal', label: 'Intern', icon: Building, colorClass: 'text-gray-500', borderClass: 'border-l-gray-500' },
]

const COLOR_HOVER: Record<string, string> = {
  blue: 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30',
  green: 'hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30',
  purple: 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30',
  amber: 'hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30',
  gray: 'hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950/30',
}

const COLOR_BORDER: Record<string, string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  purple: 'border-l-purple-500',
  amber: 'border-l-amber-500',
  gray: 'border-l-gray-500',
}

const COLOR_ICON: Record<string, string> = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  purple: 'text-purple-500',
  amber: 'text-amber-500',
  gray: 'text-gray-500',
}

interface CompanyActionsGridProps {
  companyId: string
}

export function CompanyActionsGrid({ companyId }: CompanyActionsGridProps) {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<ActionDef | null>(null)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)

  const handleGenerate = async (action: ActionDef) => {
    setLoadingSlug(action.slug)

    try {
      const response = await fetch(`/api/v1/companies/${companyId}/actions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionSlug: action.slug }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        setActiveAction(action)
        setSubject(String(data.data.subject || ''))
        setContent(String(data.data.content || ''))
        setSummary(String(data.data.summary || ''))
        setDialogOpen(true)
      } else {
        toast.error(data.error?.message || 'KI-Aktion fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Fehler bei der KI-Aktion: ' + (error instanceof Error ? error.message : 'Unbekannt'))
    } finally {
      setLoadingSlug(null)
    }
  }

  const handleSave = async () => {
    if (!activeAction) return

    setSaving(true)
    try {
      const response = await fetch('/api/v1/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          type: activeAction.activityType,
          subject: subject || activeAction.name,
          content,
          metadata: { source: 'company_action', actionSlug: activeAction.slug, ...(summary ? { summary } : {}) },
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Aktivitaet gespeichert')
        setDialogOpen(false)
        setActiveAction(null)
        setSubject('')
        setContent('')
      } else {
        toast.error(data.error?.message || 'Speichern fehlgeschlagen')
      }
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const actionsByCategory = (categoryKey: string) =>
    COMPANY_ACTIONS.filter(a => a.category === categoryKey)

  return (
    <>
      <div className="space-y-4">
        {CATEGORIES.map(cat => {
          const CategoryIcon = cat.icon
          const actions = actionsByCategory(cat.key)

          return (
            <Card key={cat.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CategoryIcon className={`h-5 w-5 ${cat.colorClass}`} />
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {actions.map(action => {
                    const ActionIcon = ICON_MAP[action.icon] || Mail
                    const isLoading = loadingSlug === action.slug

                    return (
                      <Button
                        key={action.slug}
                        variant="outline"
                        size="sm"
                        className={`justify-start border-l-4 ${COLOR_BORDER[action.color]} ${COLOR_HOVER[action.color]} transition-colors`}
                        onClick={() => handleGenerate(action)}
                        disabled={loadingSlug !== null}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ActionIcon className={`mr-2 h-4 w-4 ${COLOR_ICON[action.color]}`} />
                        )}
                        {action.name}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Result Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeAction?.name || 'KI-Ergebnis'}</DialogTitle>
            <DialogDescription>
              KI-generiertes Ergebnis. Sie können den Inhalt bearbeiten und als Aktivität speichern.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Show subject field for email-type actions */}
            {activeAction?.activityType === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="action-subject">Betreff</Label>
                <Input
                  id="action-subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Betreff..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="action-content">Inhalt</Label>
              <Textarea
                id="action-content"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={12}
                className="resize-y"
                placeholder="Inhalt..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving || !content.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Als Aktivität speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
