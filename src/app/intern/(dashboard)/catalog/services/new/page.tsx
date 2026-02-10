import { ProductForm } from '../../_components/product-form'

export default function NewServicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Neue Dienstleistung</h1>
        <p className="text-muted-foreground">
          Erstellen Sie einen neuen Dienstleistungseintrag
        </p>
      </div>

      <ProductForm mode="create" productType="service" />
    </div>
  )
}
