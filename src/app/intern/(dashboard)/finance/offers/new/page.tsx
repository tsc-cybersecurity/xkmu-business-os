'use client'

import { DocumentForm } from '../../_components/document-form'

export default function NewOfferPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Neues Angebot</h1>
        <p className="text-muted-foreground">Erstellen Sie ein neues Angebot</p>
      </div>
      <DocumentForm mode="create" documentType="offer" />
    </div>
  )
}
