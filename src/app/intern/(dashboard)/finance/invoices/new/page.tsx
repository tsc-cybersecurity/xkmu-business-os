'use client'

import { DocumentForm } from '../../_components/document-form'

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Neue Rechnung</h1>
        <p className="text-muted-foreground">Erstellen Sie eine neue Rechnung</p>
      </div>
      <DocumentForm mode="create" documentType="invoice" />
    </div>
  )
}
