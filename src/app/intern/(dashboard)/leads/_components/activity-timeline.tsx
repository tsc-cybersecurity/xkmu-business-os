'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Mail,
  Phone,
  FileText,
  Brain,
  Calendar,
  Plus,
  Loader2,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface ActivityUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

interface Activity {
  id: string
  type: string
  subject: string | null
  content: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: ActivityUser | null
}

interface ActivityTimelineProps {
  leadId?: string
  companyId?: string
  personId?: string
  showOutreachButton?: boolean
  outreachEnabled?: boolean
  recipientEmail?: string
  recipientName?: string
}

const typeConfig: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: 'E-Mail', color: 'text-blue-500' },
  call: { icon: Phone, label: 'Anruf', color: 'text-green-500' },
  note: { icon: FileText, label: 'Notiz', color: 'text-gray-500' },
  meeting: { icon: Calendar, label: 'Meeting', color: 'text-purple-500' },
  ai_outreach: { icon: Brain, label: 'KI-Outreach', color: 'text-amber-500' },
}

export function ActivityTimeline({
  leadId,
  companyId,
  personId,
  showOutreachButton = false,
  outreachEnabled = true,
  recipientEmail,
  recipientName,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [generatingOutreach, setGeneratingOutreach] = useState(false)
  const [outreachResult, setOutreachResult] = useState<{ subject: string; body: string; tone: string } | null>(null)
  const [showOutreachDialog, setShowOutreachDialog] = useState(false)
  const [copied, setCopied] = useState(false)

  // Activity detail/edit dialog
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editSubject, setEditSubject] = useState('')
  const [editContent, setEditContent] = useState('')
  const [savingActivity, setSavingActivity] = useState(false)
  const [deletingActivity, setDeletingActivity] = useState(false)

  // Email send dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (leadId) params.set('leadId', leadId)
      if (companyId) params.set('companyId', companyId)
      if (personId) params.set('personId', personId)

      const response = await fetch(`/api/v1/activities?${params}`)
      const data = await response.json()
      if (data.success) {
        setActivities(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch activities', error, { module: 'LeadsPage' })
    } finally {
      setLoading(false)
    }
  }, [leadId, companyId, personId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    setSavingNote(true)
    try {
      const response = await fetch('/api/v1/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: leadId || undefined,
          companyId: companyId || undefined,
          personId: personId || undefined,
          type: 'note',
          content: noteContent,
        }),
      })
      if (response.ok) {
        setNoteContent('')
        setShowNoteForm(false)
        toast.success('Notiz hinzugefuegt')
        await fetchActivities()
      }
    } catch (error) {
      toast.error('Fehler beim Speichern der Notiz')
    } finally {
      setSavingNote(false)
    }
  }

  const handleGenerateOutreach = async () => {
    if (!leadId) return
    setGeneratingOutreach(true)
    try {
      const response = await fetch(`/api/v1/leads/${leadId}/outreach`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        setOutreachResult(data.data)
        setShowOutreachDialog(true)
        await fetchActivities()
      } else {
        toast.error(data.error?.message || 'Outreach-Generierung fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Fehler bei der Outreach-Generierung')
    } finally {
      setGeneratingOutreach(false)
    }
  }

  const handleCopyOutreach = () => {
    if (!outreachResult) return
    const text = `Betreff: ${outreachResult.subject}\n\n${outreachResult.body}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('In Zwischenablage kopiert')
    setTimeout(() => setCopied(false), 2000)
  }

  // Open activity detail
  const openActivityDetail = (activity: Activity) => {
    setSelectedActivity(activity)
    setEditSubject(activity.subject || '')
    setEditContent(activity.content || '')
    setEditMode(false)
    setShowActivityDialog(true)
  }

  // Copy activity content
  const handleCopyActivity = (activity: Activity) => {
    const text = activity.subject
      ? `Betreff: ${activity.subject}\n\n${activity.content || ''}`
      : activity.content || ''
    navigator.clipboard.writeText(text)
    toast.success('In Zwischenablage kopiert')
  }

  // Save activity changes
  const handleSaveActivity = async () => {
    if (!selectedActivity) return
    setSavingActivity(true)
    try {
      const response = await fetch(`/api/v1/activities/${selectedActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editSubject || null,
          content: editContent || null,
        }),
      })
      if (response.ok) {
        toast.success('Aktivitaet aktualisiert')
        setEditMode(false)
        setShowActivityDialog(false)
        await fetchActivities()
      } else {
        toast.error('Fehler beim Speichern')
      }
    } catch (error) {
      toast.error('Fehler beim Speichern')
    } finally {
      setSavingActivity(false)
    }
  }

  // Delete activity
  const handleDeleteActivity = async () => {
    if (!selectedActivity) return
    setDeletingActivity(true)
    try {
      const response = await fetch(`/api/v1/activities/${selectedActivity.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Aktivitaet geloescht')
        setShowActivityDialog(false)
        setSelectedActivity(null)
        await fetchActivities()
      } else {
        toast.error('Fehler beim Loeschen')
      }
    } catch (error) {
      toast.error('Fehler beim Loeschen')
    } finally {
      setDeletingActivity(false)
    }
  }

  // Open email dialog
  const openEmailDialog = (activity?: Activity) => {
    if (activity) {
      setEmailSubject(activity.subject || '')
      setEmailBody(activity.content || '')
    } else if (outreachResult) {
      setEmailSubject(outreachResult.subject)
      setEmailBody(outreachResult.body)
    }
    setEmailTo(recipientEmail || '')
    setShowEmailDialog(true)
    setShowActivityDialog(false)
    setShowOutreachDialog(false)
  }

  // Send email via API or open in mail client
  const handleSendEmail = async (method: 'api' | 'gmail' | 'mailto') => {
    if (method === 'mailto') {
      // Open default mail client
      const mailtoUrl = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      window.open(mailtoUrl, '_blank')
      setShowEmailDialog(false)
      toast.success('E-Mail-Client geoeffnet')
      return
    }

    if (method === 'gmail') {
      // Open Gmail compose
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      window.open(gmailUrl, '_blank')
      setShowEmailDialog(false)
      toast.success('Gmail geoeffnet')
      return
    }

    // API method - send via backend
    setSendingEmail(true)
    try {
      const response = await fetch('/api/v1/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
          leadId: leadId || undefined,
          companyId: companyId || undefined,
          personId: personId || undefined,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('E-Mail gesendet')
        setShowEmailDialog(false)
        await fetchActivities()
      } else {
        toast.error(data.error?.message || 'E-Mail-Versand fehlgeschlagen')
      }
    } catch (error) {
      toast.error('Fehler beim E-Mail-Versand')
    } finally {
      setSendingEmail(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getUserName = (user: ActivityUser | null) => {
    if (!user) return 'System'
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }
    return user.email
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Aktivitaeten
          </CardTitle>
          <div className="flex items-center gap-2">
            {showOutreachButton && leadId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateOutreach}
                disabled={!outreachEnabled || generatingOutreach}
                title={!outreachEnabled ? 'Bitte zuerst KI-Recherche durchführen' : undefined}
              >
                {generatingOutreach ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Outreach generieren
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNoteForm(!showNoteForm)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Notiz
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline Note Form */}
        {showNoteForm && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Textarea
              placeholder="Notiz schreiben..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowNoteForm(false); setNoteContent('') }}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleAddNote} disabled={savingNote || !noteContent.trim()}>
                {savingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Noch keine Aktivitaeten vorhanden.
          </p>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            {activities.map((activity) => {
              const config = typeConfig[activity.type] || typeConfig.note
              const Icon = config.icon
              const isOutreach = activity.type === 'ai_outreach'

              return (
                <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0 group">
                  {/* Icon circle */}
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background ${config.color} ${isOutreach ? 'cursor-pointer hover:ring-2 hover:ring-amber-400/50' : ''}`}
                    onClick={() => isOutreach && openActivityDetail(activity)}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${isOutreach ? 'cursor-pointer hover:bg-amber-100' : ''}`}
                        onClick={() => isOutreach && openActivityDetail(activity)}
                      >
                        {config.label}
                      </Badge>
                      {activity.subject && (
                        <span
                          className={`text-sm font-medium truncate ${isOutreach ? 'cursor-pointer hover:text-amber-600' : ''}`}
                          onClick={() => isOutreach && openActivityDetail(activity)}
                        >
                          {activity.subject}
                        </span>
                      )}

                      {/* Actions dropdown */}
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openActivityDetail(activity)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Anzeigen
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyActivity(activity)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Kopieren
                            </DropdownMenuItem>
                            {(isOutreach || activity.type === 'email') && (
                              <DropdownMenuItem onClick={() => openEmailDialog(activity)}>
                                <Send className="mr-2 h-4 w-4" />
                                Als E-Mail senden
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedActivity(activity)
                                setEditSubject(activity.subject || '')
                                setEditContent(activity.content || '')
                                setEditMode(true)
                                setShowActivityDialog(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedActivity(activity)
                                handleDeleteActivity()
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Loeschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {activity.content && (
                      <p
                        className={`mt-1 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 ${isOutreach ? 'cursor-pointer hover:text-foreground' : ''}`}
                        onClick={() => isOutreach && openActivityDetail(activity)}
                      >
                        {activity.content}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(activity.createdAt)}</span>
                      <span>·</span>
                      <span>{getUserName(activity.user)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Outreach Result Dialog (for newly generated) */}
      <Dialog open={showOutreachDialog} onOpenChange={setShowOutreachDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Generierter Outreach
            </DialogTitle>
          </DialogHeader>
          {outreachResult && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Betreff</label>
                <p className="mt-1 font-medium">{outreachResult.subject}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Inhalt</label>
                <div className="mt-1 p-4 border rounded-lg bg-muted/30 whitespace-pre-wrap text-sm max-h-[300px] overflow-y-auto">
                  {outreachResult.body}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Ton:</label>
                <Badge variant="secondary">{outreachResult.tone}</Badge>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowOutreachDialog(false)}>
              Schliessen
            </Button>
            <Button variant="outline" onClick={handleCopyOutreach}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? 'Kopiert!' : 'Kopieren'}
            </Button>
            <Button onClick={() => openEmailDialog()}>
              <Send className="mr-2 h-4 w-4" />
              Als E-Mail senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Detail Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedActivity && (
                <>
                  {(() => {
                    const config = typeConfig[selectedActivity.type] || typeConfig.note
                    const Icon = config.icon
                    return <Icon className={`h-5 w-5 ${config.color}`} />
                  })()}
                  {editMode ? 'Aktivitaet bearbeiten' : (typeConfig[selectedActivity.type]?.label || 'Aktivitaet')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              {editMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Betreff</Label>
                    <Input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="Betreff eingeben..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inhalt</Label>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Inhalt eingeben..."
                      rows={10}
                      className="resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {selectedActivity.subject && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Betreff</label>
                      <p className="mt-1 font-medium">{selectedActivity.subject}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Inhalt</label>
                    <div className="mt-1 p-4 border rounded-lg bg-muted/30 whitespace-pre-wrap text-sm max-h-[400px] overflow-y-auto">
                      {selectedActivity.content || 'Kein Inhalt'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDate(selectedActivity.createdAt)}</span>
                    <span>·</span>
                    <span>{getUserName(selectedActivity.user)}</span>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)} disabled={savingActivity}>
                  Abbrechen
                </Button>
                <Button onClick={handleSaveActivity} disabled={savingActivity}>
                  {savingActivity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Speichern
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteActivity}
                  disabled={deletingActivity}
                >
                  {deletingActivity ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Loeschen
                </Button>
                <Button variant="outline" onClick={() => handleCopyActivity(selectedActivity!)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Kopieren
                </Button>
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
                {(selectedActivity?.type === 'ai_outreach' || selectedActivity?.type === 'email') && (
                  <Button onClick={() => openEmailDialog(selectedActivity)}>
                    <Send className="mr-2 h-4 w-4" />
                    Als E-Mail senden
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Send Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              E-Mail senden
            </DialogTitle>
            <DialogDescription>
              Senden Sie diese Nachricht per E-Mail
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empfaenger</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="empfaenger@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Betreff</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Betreff eingeben..."
              />
            </div>
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Nachricht eingeben..."
                rows={10}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Abbrechen
            </Button>
            <Button variant="outline" onClick={() => handleSendEmail('mailto')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Im E-Mail-Client oeffnen
            </Button>
            <Button variant="outline" onClick={() => handleSendEmail('gmail')}>
              <Mail className="mr-2 h-4 w-4" />
              In Gmail oeffnen
            </Button>
            <Button onClick={() => handleSendEmail('api')} disabled={sendingEmail || !emailTo}>
              {sendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Direkt senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
