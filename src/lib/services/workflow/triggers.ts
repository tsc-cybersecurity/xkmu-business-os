/**
 * Zentrale Trigger-Registry — Single Source of Truth.
 *
 * Neuen Trigger ergänzen:
 * 1. Eintrag in WORKFLOW_TRIGGERS unten hinzufügen.
 * 2. An passender Stelle im Code `WorkflowEngine.fire(<key>, { ... })` aufrufen.
 * 3. UI greift automatisch über TRIGGER_LABELS / WORKFLOW_TRIGGERS auf den neuen Trigger zu.
 */

export interface TriggerDefinition {
  key: string
  label: string
  description: string
  /** Hint für UI welche Felder unter {{data.*}} verfügbar sind. Reine Doku, nicht runtime-validiert. */
  dataShape?: string[]
}

export const WORKFLOW_TRIGGERS: TriggerDefinition[] = [
  {
    key: 'contact.submitted',
    label: 'Kontaktformular abgesendet',
    description: 'Wird gefeuert wenn jemand das öffentliche Kontaktformular absendet.',
    dataShape: ['firstName', 'lastName', 'email', 'phone', 'company', 'message'],
  },
  {
    key: 'lead.created',
    label: 'Lead erstellt',
    description: 'Wird gefeuert nach Anlegen eines Leads.',
    dataShape: ['leadId', 'companyId', 'personId', 'source'],
  },
  {
    key: 'lead.scored',
    label: 'Lead bewertet',
    description: 'Wird gefeuert nach erfolgreichem Lead-Scoring.',
    dataShape: ['leadId', 'score', 'priority'],
  },
  {
    key: 'portal.message_sent',
    label: 'Portal: Nachricht gesendet',
    description: 'Wird gefeuert bei Portal-Chat-Nachricht.',
    dataShape: ['messageId', 'companyId', 'senderId', 'senderRole', 'bodyPreview'],
  },
  {
    key: 'portal.document_uploaded',
    label: 'Portal: Dokument hochgeladen',
    description: 'Wird gefeuert bei Portal-Dokument-Upload (Admin oder Kunde).',
    dataShape: ['documentId', 'companyId', 'direction', 'fileName', 'sizeBytes', 'uploaderRole'],
  },
  {
    key: 'portal.change_request_created',
    label: 'Portal: Änderungsantrag gestellt',
    description: 'Wird gefeuert bei Firmendaten-Änderungsantrag im Portal.',
    dataShape: ['changeRequestId', 'companyId', 'requestedBy', 'proposedChanges'],
  },
  {
    key: 'portal.user_invited',
    label: 'Portal: User eingeladen',
    description: 'Wird gefeuert bei Portal-Zugang-Erstellung mit Invite-Link.',
    dataShape: ['userId', 'companyId', 'email'],
  },
  {
    key: 'order.created',
    label: 'Auftrag angelegt',
    description: 'Wird gefeuert nach Erstellen eines Auftrags.',
    dataShape: ['orderId', 'companyId', 'title', 'createdByRole'],
  },
  {
    key: 'order.status_changed',
    label: 'Auftrag: Status geändert',
    description: 'Wird gefeuert nach Status-Übergang eines Auftrags.',
    dataShape: ['orderId', 'companyId', 'fromStatus', 'toStatus'],
  },
  {
    key: 'lead.status_changed',
    label: 'Lead-Status geändert',
    description: 'Wird gefeuert wenn sich der Status eines Leads ändert.',
    dataShape: ['leadId', 'companyId', 'fromStatus', 'toStatus'],
  },
  {
    key: '__scheduled__',
    label: 'Geplant (Cron)',
    description: 'Workflow läuft auf Zeitplan. Konfiguration im Bereich „Zeitplan" oben am Workflow.',
    dataShape: ['scheduledAt', 'workflowId', 'cronJobId'],
  },
]

export const TRIGGER_LABELS: Record<string, string> = Object.fromEntries(
  WORKFLOW_TRIGGERS.map(t => [t.key, t.label]),
)
