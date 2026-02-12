import { Shield } from 'lucide-react'

export default function CyberSecurityPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/30 p-6">
          <Shield className="h-12 w-12 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-4">Cyber Security</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Schützen Sie Ihr Unternehmen vor digitalen Bedrohungen mit unseren umfassenden Sicherheitslösungen.
      </p>
      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          Inhalt folgt in Kürze. Wir arbeiten an einer detaillierten Übersicht unserer
          Cyber-Security-Dienstleistungen, einschließlich Penetration Testing, IT-Audit und Cloud Security.
        </p>
      </div>
    </div>
  )
}
