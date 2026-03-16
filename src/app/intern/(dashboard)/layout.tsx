import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { PermissionProvider } from '@/hooks/use-permissions'
import { ChatProvider } from '@/components/chat/chat-provider'
import { ChatButton } from '@/components/chat/chat-button'
import { ChatPanel } from '@/components/chat/chat-panel'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/intern/login')
  }

  return (
    <PermissionProvider>
      <ChatProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header user={session.user} />
            <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
              {children}
            </main>
          </div>
        </div>
        <ChatButton />
        <ChatPanel />
      </ChatProvider>
    </PermissionProvider>
  )
}
