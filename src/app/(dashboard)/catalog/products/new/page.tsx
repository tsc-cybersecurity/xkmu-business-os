import { ProductForm } from '../../_components/product-form'

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Neues Produkt</h1>
        <p className="text-muted-foreground">
          Erstellen Sie einen neuen Produkteintrag
        </p>
      </div>

      <ProductForm mode="create" productType="product" />
    </div>
  )
}
