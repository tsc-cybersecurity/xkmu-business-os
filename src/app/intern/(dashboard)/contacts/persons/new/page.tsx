import { Suspense } from 'react'
import { PersonForm } from '../_components/person-form'

function PersonFormWrapper() {
  return <PersonForm mode="create" />
}

export default function NewPersonPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Neue Person</h1>
        <p className="text-muted-foreground">
          Erstellen Sie einen neuen Personenkontakt
        </p>
      </div>

      <Suspense fallback={<div>Laden...</div>}>
        <PersonFormWrapper />
      </Suspense>
    </div>
  )
}
