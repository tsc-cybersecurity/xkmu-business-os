'use client'

import { useEffect } from 'react'
import { installCsrfInterceptor } from '@/lib/utils/csrf'

export function CsrfProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installCsrfInterceptor()
  }, [])

  return <>{children}</>
}
