import { unstable_noStore as noStore } from 'next/cache'
import { CmsPageContent } from '../../_components/cms-page-content'
import { generateCmsMetadata } from '@/lib/utils/cms-metadata'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata('/kontakt', 'Kontakt')
}

export default async function KontaktPage() {
  noStore()
  return <CmsPageContent slug="/kontakt" />
}
