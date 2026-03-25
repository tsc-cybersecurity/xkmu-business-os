import { CmsPageContent } from '../../_components/cms-page-content'
import { generateCmsMetadata } from '@/lib/utils/cms-metadata'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata('/ki-automation', 'KI & Automation')
}

export default function KiAutomationPage() {
  return <CmsPageContent slug="/ki-automation" />
}
