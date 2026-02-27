import { BlockTemplatesManager } from './_components/block-templates-manager'

export default function BlockTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Block-Vorlagen</h1>
        <p className="text-muted-foreground mt-1">
          Wiederverwendbare Blockvorlagen fuer CMS-Seiten verwalten
        </p>
      </div>
      <BlockTemplatesManager />
    </div>
  )
}
