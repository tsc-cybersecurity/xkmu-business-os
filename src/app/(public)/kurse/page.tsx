import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { GraduationCap } from 'lucide-react'
import { CmsPageContent } from '@/app/_components/cms-page-content'
import { generateCmsMetadata } from '@/lib/utils/cms-metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata('/kurse', 'Onlinekurse – xKMU')
}

export default async function PublicCoursesIndexPage() {
  noStore()
  return (
    <CmsPageContent
      slug="/kurse"
      fallback={
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <GraduationCap className="h-8 w-8" />
            Onlinekurse
          </h1>
          <p className="text-muted-foreground mt-3">
            Demnächst gibt es hier freie Lerninhalte.
          </p>
        </div>
      }
    />
  )
}
