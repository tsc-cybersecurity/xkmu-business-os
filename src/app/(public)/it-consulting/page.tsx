import { Monitor } from 'lucide-react'

export default function ITConsultingPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-6">
          <Monitor className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-4">IT Consulting</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Strategische IT-Beratung für die digitale Transformation Ihres Unternehmens.
      </p>
      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          Inhalt folgt in Kürze. Wir arbeiten an einer detaillierten Übersicht unserer
          IT-Beratungsleistungen, einschließlich Digitalisierung, Cloud Migration und IT-Strategie.
        </p>
      </div>
    </div>
  )
}
