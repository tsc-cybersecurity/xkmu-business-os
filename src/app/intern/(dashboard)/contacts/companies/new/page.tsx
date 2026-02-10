import { CompanyForm } from '../_components/company-form'

export default function NewCompanyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Neue Firma</h1>
        <p className="text-muted-foreground">
          Erstellen Sie einen neuen Firmeneintrag
        </p>
      </div>

      <CompanyForm mode="create" />
    </div>
  )
}
