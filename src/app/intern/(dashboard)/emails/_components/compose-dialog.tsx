'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
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
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface EmailAddress {
  address: string
  name?: string
}

interface OriginalEmail {
  id: string
  accountId: string
  fromAddress: string
  fromName: string
  toAddresses: EmailAddress[]
  ccAddresses: EmailAddress[]
  subject: string
  bodyHtml: string
  date: string
}

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Array<{ id: string; name: string; email: string }>
  mode: 'new' | 'reply' | 'replyAll' | 'forward'
  originalEmail?: OriginalEmail
  onSent?: () => void
}

function formatAddresses(addresses: EmailAddress[]): string {
  return addresses.map((a) => a.address).join(', ')
}

function buildQuotedBody(original: OriginalEmail): string {
  const dateFormatted = new Date(original.date).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `<br><br>
<div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
  <p>Am ${dateFormatted} schrieb ${original.fromName} &lt;${original.fromAddress}&gt;:</p>
  ${original.bodyHtml}
</div>`
}

function stripHtml(html: string): string {
  // Basic HTML-to-text for the textarea (plain text editing for now)
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function textToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

export function ComposeDialog({
  open,
  onOpenChange,
  accounts,
  mode,
  originalEmail,
  onSent,
}: ComposeDialogProps) {
  const [accountId, setAccountId] = useState('')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [sending, setSending] = useState(false)

  const initializeFields = useCallback(() => {
    if (!open) return

    // Account selection
    if (originalEmail?.accountId) {
      setAccountId(originalEmail.accountId)
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id)
    }

    switch (mode) {
      case 'reply': {
        if (originalEmail) {
          setTo(originalEmail.fromAddress)
          setCc('')
          setBcc('')
          setSubject(
            originalEmail.subject.startsWith('Re: ')
              ? originalEmail.subject
              : `Re: ${originalEmail.subject}`
          )
          setBody('\n\n' + stripHtml(buildQuotedBody(originalEmail)))
          setShowCcBcc(false)
        }
        break
      }
      case 'replyAll': {
        if (originalEmail) {
          setTo(originalEmail.fromAddress)
          // Add original to/cc addresses, excluding the sending account
          const sendingAccount = accounts.find(
            (a) => a.id === (originalEmail.accountId || accounts[0]?.id)
          )
          const sendingEmail = sendingAccount?.email?.toLowerCase()

          const allTo = originalEmail.toAddresses
            .map((a) => a.address)
            .filter((addr) => addr.toLowerCase() !== sendingEmail)
          const allCc = originalEmail.ccAddresses
            .map((a) => a.address)
            .filter((addr) => addr.toLowerCase() !== sendingEmail)

          if (allTo.length > 0) {
            setTo([originalEmail.fromAddress, ...allTo].join(', '))
          }
          if (allCc.length > 0) {
            setCc(allCc.join(', '))
            setShowCcBcc(true)
          } else {
            setCc('')
            setShowCcBcc(false)
          }
          setBcc('')
          setSubject(
            originalEmail.subject.startsWith('Re: ')
              ? originalEmail.subject
              : `Re: ${originalEmail.subject}`
          )
          setBody('\n\n' + stripHtml(buildQuotedBody(originalEmail)))
        }
        break
      }
      case 'forward': {
        if (originalEmail) {
          setTo('')
          setCc('')
          setBcc('')
          setSubject(
            originalEmail.subject.startsWith('Fwd: ')
              ? originalEmail.subject
              : `Fwd: ${originalEmail.subject}`
          )
          setBody('\n\n' + stripHtml(buildQuotedBody(originalEmail)))
          setShowCcBcc(false)
        }
        break
      }
      case 'new':
      default: {
        setTo('')
        setCc('')
        setBcc('')
        setSubject('')
        setBody('')
        setShowCcBcc(false)
        break
      }
    }
  }, [open, mode, originalEmail, accounts])

  useEffect(() => {
    initializeFields()
  }, [initializeFields])

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error('Bitte geben Sie mindestens einen Empfaenger an.')
      return
    }
    if (!accountId) {
      toast.error('Bitte waehlen Sie ein E-Mail-Konto aus.')
      return
    }

    setSending(true)

    try {
      const bodyHtml = textToHtml(body)
      const toAddresses = to
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const ccAddresses = cc
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const bccAddresses = bcc
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const isReply = (mode === 'reply' || mode === 'replyAll') && originalEmail

      const url = isReply
        ? `/api/v1/emails/${originalEmail!.id}/reply`
        : '/api/v1/emails/send'

      const payload = {
        accountId,
        to: toAddresses,
        cc: ccAddresses.length > 0 ? ccAddresses : undefined,
        bcc: bccAddresses.length > 0 ? bccAddresses : undefined,
        subject,
        bodyHtml,
        ...(isReply && { replyAll: mode === 'replyAll' }),
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Senden fehlgeschlagen')
      }

      toast.success('E-Mail wurde gesendet.')
      onSent?.()
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Senden fehlgeschlagen'
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  const modeLabel = {
    new: 'Neue E-Mail',
    reply: 'Antworten',
    replyAll: 'Allen antworten',
    forward: 'Weiterleiten',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{modeLabel[mode]}</DialogTitle>
          <DialogDescription>
            {mode === 'new'
              ? 'Verfassen Sie eine neue E-Mail.'
              : mode === 'forward'
                ? 'Leiten Sie die E-Mail weiter.'
                : 'Antworten Sie auf die E-Mail.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account selector */}
          <div className="space-y-1.5">
            <Label htmlFor="compose-account">Von</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="compose-account">
                <SelectValue placeholder="Konto waehlen" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="compose-to">An</Label>
              {!showCcBcc && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-0.5 text-xs text-muted-foreground"
                  onClick={() => setShowCcBcc(true)}
                >
                  CC/BCC
                </Button>
              )}
            </div>
            <Input
              id="compose-to"
              placeholder="empfaenger@beispiel.de"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {/* CC */}
          {showCcBcc && (
            <div className="space-y-1.5">
              <Label htmlFor="compose-cc">CC</Label>
              <Input
                id="compose-cc"
                placeholder="cc@beispiel.de"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </div>
          )}

          {/* BCC */}
          {showCcBcc && (
            <div className="space-y-1.5">
              <Label htmlFor="compose-bcc">BCC</Label>
              <Input
                id="compose-bcc"
                placeholder="bcc@beispiel.de"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="compose-subject">Betreff</Label>
            <Input
              id="compose-subject"
              placeholder="Betreff"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="compose-body">Nachricht</Label>
            <Textarea
              id="compose-body"
              rows={12}
              placeholder="Ihre Nachricht..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSend} disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Senden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
