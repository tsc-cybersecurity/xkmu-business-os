'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Mail,
  Loader2,
  Star,
  Paperclip,
  Search,
  RefreshCcw,
  MailOpen,
  ArrowLeft,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { sanitizeEmailHtml } from '@/lib/utils/sanitize'

interface EmailAccount {
  id: string
  name: string
  email: string
}

interface EmailMessage {
  id: string
  accountId: string
  messageId: string
  fromName: string | null
  fromEmail: string
  toAddresses: string[]
  ccAddresses: string[] | null
  subject: string
  snippet: string | null
  bodyHtml: string | null
  bodyText: string | null
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  attachments: EmailAttachment[] | null
  receivedAt: string
  linkedLeadId: string | null
  linkedCompanyId: string | null
  linkedPersonId: string | null
}

interface EmailAttachment {
  filename: string
  contentType: string
  size: number
}

interface LinkSearchResult {
  id: string
  label: string
  type: 'lead' | 'company' | 'person'
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const emailDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (emailDay.getTime() === today.getTime()) {
    return 'Heute, ' + date.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }
  if (emailDay.getTime() === yesterday.getTime()) {
    return 'Gestern, ' + date.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function EmailsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [linkSearch, setLinkSearch] = useState('')
  const [linkResults, setLinkResults] = useState<LinkSearchResult[]>([])
  const [showLinkDropdown, setShowLinkDropdown] = useState(false)
  const linkSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/email-accounts')
      const data = await response.json()
      if (data.success) {
        setAccounts(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch email accounts', error, { module: 'EmailsPage' })
    }
  }, [])

  const fetchEmails = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedAccountId !== 'all') params.set('accountId', selectedAccountId)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/v1/emails?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setEmails(data.data)
      }
    } catch (error) {
      logger.error('Failed to fetch emails', error, { module: 'EmailsPage' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedAccountId, searchQuery])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    setLoading(true)
    fetchEmails()
  }, [fetchEmails])

  const handleSelectEmail = async (email: EmailMessage) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/v1/emails/${email.id}`)
      const data = await response.json()
      if (data.success) {
        setSelectedEmail(data.data)
        // Mark as read
        if (!email.isRead) {
          await fetch(`/api/v1/emails/${email.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          })
          setEmails((prev) =>
            prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
          )
        }
      }
    } catch (error) {
      logger.error('Failed to fetch email detail', error, { module: 'EmailsPage' })
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleToggleRead = async (emailId: string, currentlyRead: boolean) => {
    try {
      await fetch(`/api/v1/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !currentlyRead }),
      })
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, isRead: !currentlyRead } : e))
      )
      if (selectedEmail?.id === emailId) {
        setSelectedEmail((prev) => prev ? { ...prev, isRead: !currentlyRead } : null)
      }
      toast.success(!currentlyRead ? 'Als gelesen markiert' : 'Als ungelesen markiert')
    } catch (error) {
      toast.error('Fehler beim Aktualisieren')
    }
  }

  const handleToggleStar = async (emailId: string, currentlyStarred: boolean) => {
    try {
      await fetch(`/api/v1/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !currentlyStarred }),
      })
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, isStarred: !currentlyStarred } : e))
      )
      if (selectedEmail?.id === emailId) {
        setSelectedEmail((prev) => prev ? { ...prev, isStarred: !currentlyStarred } : null)
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren')
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchEmails()
  }

  const handleLinkSearch = (query: string) => {
    setLinkSearch(query)
    if (linkSearchTimeout.current) clearTimeout(linkSearchTimeout.current)
    if (!query.trim()) {
      setLinkResults([])
      setShowLinkDropdown(false)
      return
    }
    linkSearchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/emails/link-search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        if (data.success) {
          setLinkResults(data.data)
          setShowLinkDropdown(true)
        }
      } catch (error) {
        logger.error('Link search failed', error, { module: 'EmailsPage' })
      }
    }, 300)
  }

  const handleLinkTo = async (result: LinkSearchResult) => {
    if (!selectedEmail) return
    try {
      const payload: Record<string, string> = {}
      if (result.type === 'lead') payload.linkedLeadId = result.id
      if (result.type === 'company') payload.linkedCompanyId = result.id
      if (result.type === 'person') payload.linkedPersonId = result.id

      await fetch(`/api/v1/emails/${selectedEmail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      toast.success(`Verknuepft mit ${result.label}`)
      setShowLinkDropdown(false)
      setLinkSearch('')
    } catch (error) {
      toast.error('Verknuepfung fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-Mails</h1>
          <p className="text-muted-foreground">Eingehende E-Mails verwalten</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          Aktualisieren
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Suche nach Betreff oder Absender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Alle Konten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Konten</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name} ({acc.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main content: two-column layout */}
      <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {/* Email list */}
        <Card className={cn('flex-shrink-0 overflow-hidden', selectedEmail ? 'hidden md:block md:w-[400px] lg:w-[480px]' : 'w-full')}>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <Mail className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Keine E-Mails</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'Keine E-Mails fuer diese Suche gefunden.'
                    : 'Es wurden noch keine E-Mails synchronisiert.'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {emails.map((email) => (
                  <button
                    key={email.id}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                      selectedEmail?.id === email.id && 'bg-muted',
                      !email.isRead && 'bg-primary/5'
                    )}
                    onClick={() => handleSelectEmail(email)}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="mt-0.5 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleStar(email.id, email.isStarred)
                        }}
                      >
                        <Star
                          className={cn(
                            'h-4 w-4',
                            email.isStarred
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground/40'
                          )}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-sm',
                              !email.isRead ? 'font-semibold' : 'text-muted-foreground'
                            )}
                          >
                            {email.fromName || email.fromEmail}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatRelativeDate(email.receivedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'truncate text-sm',
                              !email.isRead ? 'font-medium' : 'text-muted-foreground'
                            )}
                          >
                            {email.subject || '(Kein Betreff)'}
                          </span>
                          {email.hasAttachments && (
                            <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        {email.snippet && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {email.snippet}
                          </p>
                        )}
                      </div>
                      {!email.isRead && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail view */}
        {selectedEmail && (
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  {/* Detail header */}
                  <div className="border-b p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setSelectedEmail(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex flex-wrap gap-2 ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRead(selectedEmail.id, selectedEmail.isRead)}
                        >
                          <MailOpen className="mr-1 h-3 w-3" />
                          {selectedEmail.isRead ? 'Ungelesen' : 'Gelesen'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStar(selectedEmail.id, selectedEmail.isStarred)}
                        >
                          <Star
                            className={cn(
                              'mr-1 h-3 w-3',
                              selectedEmail.isStarred && 'fill-yellow-400 text-yellow-400'
                            )}
                          />
                          {selectedEmail.isStarred ? 'Ent-markieren' : 'Markieren'}
                        </Button>
                      </div>
                    </div>

                    <h2 className="text-xl font-semibold">
                      {selectedEmail.subject || '(Kein Betreff)'}
                    </h2>

                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium text-muted-foreground w-12">Von:</span>
                        <span>
                          {selectedEmail.fromName
                            ? `${selectedEmail.fromName} <${selectedEmail.fromEmail}>`
                            : selectedEmail.fromEmail}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium text-muted-foreground w-12">An:</span>
                        <span>{selectedEmail.toAddresses?.join(', ')}</span>
                      </div>
                      {selectedEmail.ccAddresses && selectedEmail.ccAddresses.length > 0 && (
                        <div className="flex gap-2">
                          <span className="font-medium text-muted-foreground w-12">CC:</span>
                          <span>{selectedEmail.ccAddresses.join(', ')}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="font-medium text-muted-foreground w-12">Datum:</span>
                        <span>{formatRelativeDate(selectedEmail.receivedAt)}</span>
                      </div>
                    </div>

                    {/* Link to entity */}
                    <div className="mt-3 relative">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <Input
                          className="h-8 text-sm"
                          placeholder="Mit Lead, Firma oder Person verknuepfen..."
                          value={linkSearch}
                          onChange={(e) => handleLinkSearch(e.target.value)}
                          onFocus={() => linkResults.length > 0 && setShowLinkDropdown(true)}
                          onBlur={() => setTimeout(() => setShowLinkDropdown(false), 200)}
                        />
                      </div>
                      {showLinkDropdown && linkResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                          {linkResults.map((result) => (
                            <button
                              key={`${result.type}-${result.id}`}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                              onMouseDown={() => handleLinkTo(result)}
                            >
                              <Badge variant="secondary" className="text-xs">
                                {result.type === 'lead'
                                  ? 'Lead'
                                  : result.type === 'company'
                                    ? 'Firma'
                                    : 'Person'}
                              </Badge>
                              <span>{result.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="border-b px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Paperclip className="h-4 w-4" />
                        {selectedEmail.attachments.length} Anhang
                        {selectedEmail.attachments.length > 1 ? 'e' : ''}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((att, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="cursor-default py-1"
                          >
                            {att.filename} ({formatFileSize(att.size)})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Email body - sanitized with DOMPurify via sanitizeEmailHtml */}
                  <div className="flex-1 overflow-auto p-4">
                    {selectedEmail.bodyHtml ? (
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeEmailHtml(selectedEmail.bodyHtml),
                        }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">
                        {selectedEmail.bodyText || 'Kein Inhalt'}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No selection placeholder (desktop only) */}
        {!selectedEmail && !loading && emails.length > 0 && (
          <Card className="hidden flex-1 md:block">
            <CardContent className="flex h-full flex-col items-center justify-center py-16 text-center">
              <Mail className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-muted-foreground">
                Waehlen Sie eine E-Mail aus der Liste
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
