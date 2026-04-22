'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' })
    router.push('/intern/login')
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={logout}>
      <LogOut className="h-4 w-4 mr-2" /> Abmelden
    </Button>
  )
}
