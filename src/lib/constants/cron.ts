export const INTERVAL_OPTIONS = [
  { value: '5min', label: 'Alle 5 Minuten' },
  { value: '15min', label: 'Alle 15 Minuten' },
  { value: '30min', label: 'Alle 30 Minuten' },
  { value: '60min', label: 'Stündlich' },
  { value: 'daily', label: 'Täglich' },
]

export const ACTION_TYPE_OPTIONS = [
  { value: 'email_sync', label: 'E-Mail Sync (alle Accounts)' },
  { value: 'workflow', label: 'Workflow auslösen' },
  { value: 'api_call', label: 'API-Endpoint aufrufen' },
  { value: 'process_queue', label: 'Task-Queue abarbeiten (ausstehende Tasks)' },
  { value: 'course_assignment_reminders', label: 'Pflichtkurs-Erinnerungen versenden' },
  { value: 'custom', label: 'Benutzerdefiniert' },
]
