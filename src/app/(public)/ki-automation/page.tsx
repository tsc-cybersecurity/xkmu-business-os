import { Bot } from 'lucide-react'

export default function KIAutomationPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/30 p-6">
          <Bot className="h-12 w-12 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-4">KI & Automation</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Nutzen Sie die Kraft künstlicher Intelligenz, um Ihre Geschäftsprozesse zu automatisieren und zu optimieren.
      </p>
      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          Inhalt folgt in Kürze. Wir arbeiten an einer detaillierten Übersicht unserer
          KI-Integrations- und Automatisierungslösungen, einschließlich Chatbots, Datenanalyse und Prozessautomatisierung.
        </p>
      </div>
    </div>
  )
}
