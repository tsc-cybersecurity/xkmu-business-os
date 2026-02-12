import { Newspaper } from 'lucide-react'

export default function ITNewsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-6">
          <Newspaper className="h-12 w-12 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-4">IT-News</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Aktuelle Nachrichten und Trends aus der IT-Welt.
      </p>
      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          Inhalt folgt in Kürze. Hier finden Sie bald aktuelle Artikel, Analysen und Einblicke
          rund um IT-Sicherheit, Künstliche Intelligenz und Digitalisierung.
        </p>
      </div>
    </div>
  )
}
