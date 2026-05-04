import Link from 'next/link'

export default function TermineIndexPage() {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-medium">Terminbuchung — Setup</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Dieses Modul ist gerade im Aufbau. Phase 1 stellt die Google-Calendar-Anbindung bereit.
      </p>
      <Link
        href="/intern/termine/calendar-connect"
        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Google Calendar verbinden →
      </Link>
    </div>
  )
}
