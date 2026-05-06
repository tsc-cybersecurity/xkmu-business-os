import { SocialAccountService } from '@/lib/services/social/social-account.service'
import { AccountCards } from './_components/AccountCards'

export default async function SocialIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const params = await searchParams
  const accounts = await SocialAccountService.listConnected()
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1">Social Media</h1>
      <p className="text-sm text-muted-foreground mb-6">Verbinde deine Plattform-Accounts.</p>
      <AccountCards accounts={accounts} flash={params} />
    </div>
  )
}
