import { CmsPageContent } from '../../_components/cms-page-content'
import { generateCmsMetadata } from '@/lib/utils/cms-metadata'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata('/datenschutz', 'Datenschutzerklaerung')
}

export default function DatenschutzPage() {
  return <CmsPageContent slug="/datenschutz" />
}
