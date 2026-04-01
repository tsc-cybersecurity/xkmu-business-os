'use client'

import { Badge } from '@/components/ui/badge'

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Entwurf', className: 'bg-gray-400' },
  sent: { label: 'Versendet', className: 'bg-blue-500' },
  paid: { label: 'Bezahlt', className: 'bg-green-500' },
  overdue: { label: 'Überfällig', className: 'bg-red-500' },
  cancelled: { label: 'Storniert', className: 'bg-gray-600' },
}

const offerStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Entwurf', className: 'bg-gray-400' },
  sent: { label: 'Versendet', className: 'bg-blue-500' },
  accepted: { label: 'Angenommen', className: 'bg-green-500' },
  rejected: { label: 'Abgelehnt', className: 'bg-red-500' },
  expired: { label: 'Abgelaufen', className: 'bg-orange-500' },
}

const contractStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Entwurf', className: 'bg-gray-400' },
  sent: { label: 'Versendet', className: 'bg-blue-500' },
  signed: { label: 'Unterschrieben', className: 'bg-green-600' },
  active: { label: 'Aktiv', className: 'bg-green-500' },
  terminated: { label: 'Beendet', className: 'bg-gray-600' },
  expired: { label: 'Abgelaufen', className: 'bg-orange-500' },
  rejected: { label: 'Abgelehnt', className: 'bg-red-500' },
}

interface DocumentStatusBadgeProps {
  status: string
  type: string
}

export function DocumentStatusBadge({ status, type }: DocumentStatusBadgeProps) {
  const config = type === 'invoice'
    ? invoiceStatusConfig
    : type === 'contract'
      ? contractStatusConfig
      : offerStatusConfig
  const statusInfo = config[status] || { label: status, className: 'bg-gray-400' }

  return (
    <Badge className={statusInfo.className}>
      {statusInfo.label}
    </Badge>
  )
}

export function getStatusLabel(status: string, type: string): string {
  const config = type === 'invoice'
    ? invoiceStatusConfig
    : type === 'contract'
      ? contractStatusConfig
      : offerStatusConfig
  return config[status]?.label || status
}

export const invoiceStatuses = Object.entries(invoiceStatusConfig).map(([value, { label }]) => ({ value, label }))
export const offerStatuses = Object.entries(offerStatusConfig).map(([value, { label }]) => ({ value, label }))
export const contractStatuses = Object.entries(contractStatusConfig).map(([value, { label }]) => ({ value, label }))
