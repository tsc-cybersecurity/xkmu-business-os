// ============================================
// Centralized Status Labels & Colors
// ============================================

// Company statuses
export const companyStatusLabels: Record<string, string> = {
  prospect: 'Interessent',
  lead: 'Lead',
  customer: 'Kunde',
  partner: 'Partner',
  churned: 'Verloren',
  inactive: 'Inaktiv',
}

export const companyStatusColors: Record<string, string> = {
  prospect: 'bg-gray-500',
  lead: 'bg-blue-500',
  customer: 'bg-green-500',
  partner: 'bg-purple-500',
  churned: 'bg-red-500',
  inactive: 'bg-gray-400',
}

// Lead statuses
export const leadStatusLabels: Record<string, string> = {
  new: 'Neu',
  qualifying: 'Qualifizierung',
  qualified: 'Qualifiziert',
  contacted: 'Kontaktiert',
  meeting_scheduled: 'Termin vereinbart',
  proposal_sent: 'Angebot gesendet',
  won: 'Gewonnen',
  lost: 'Verloren',
}

export const leadStatusColors: Record<string, string> = {
  new: 'bg-blue-400',
  qualifying: 'bg-yellow-500',
  qualified: 'bg-green-400',
  contacted: 'bg-purple-500',
  meeting_scheduled: 'bg-indigo-500',
  proposal_sent: 'bg-orange-500',
  won: 'bg-green-600',
  lost: 'bg-gray-500',
}

// Lead sources
export const leadSourceLabels: Record<string, string> = {
  api: 'API',
  form: 'Formular',
  import: 'Import',
  manual: 'Manuell',
  idea: 'Idee',
  website: 'Website',
}

// Person statuses
export const personStatusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  do_not_contact: 'Nicht kontaktieren',
}

export const personStatusColors: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  do_not_contact: 'bg-red-500',
}

// User statuses
export const userStatusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  pending: 'Ausstehend',
}

// User roles
export const userRoleLabels: Record<string, string> = {
  owner: 'Inhaber',
  admin: 'Administrator',
  member: 'Mitarbeiter',
  viewer: 'Betrachter',
}

// Idea statuses
export const ideaStatusLabels: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'In Bearbeitung',
  converted: 'Konvertiert',
}

export const ideaStatusColors: Record<string, string> = {
  backlog: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  converted: 'bg-green-500',
}

// AI Research statuses
export const aiStatusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  processing: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
}

// Document statuses
export const invoiceStatusLabels: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
}

export const offerStatusLabels: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  expired: 'Abgelaufen',
}

// Product statuses
export const productStatusLabels: Record<string, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  draft: 'Entwurf',
}

// Generic helper: get label with fallback
export function getStatusLabel(
  labels: Record<string, string>,
  status: string
): string {
  return labels[status] || status
}
