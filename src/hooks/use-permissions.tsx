'use client'

import { createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Module, Action } from '@/lib/types/permissions'
import { logger } from '@/lib/utils/logger'

type PermissionMap = Record<string, Record<string, boolean>>

interface PermissionContextValue {
  permissions: PermissionMap
  loading: boolean
  hasPermission: (module: Module, action: Action) => boolean
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: {},
  loading: true,
  hasPermission: () => false,
})

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPermissions() {
      try {
        const response = await fetch('/api/v1/auth/permissions')
        const data = await response.json()
        if (data.success) {
          setPermissions(data.data.permissions)
        }
      } catch {
        logger.error('Fehler beim Laden der Berechtigungen', undefined, { module: 'UsePermissions' })
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [])

  const hasPermission = (module: Module, action: Action): boolean => {
    return permissions[module]?.[action] ?? false
  }

  return (
    <PermissionContext.Provider value={{ permissions, loading, hasPermission }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionContext)
}

export function useHasPermission(module: Module, action: Action): boolean {
  const { permissions } = useContext(PermissionContext)
  return permissions[module]?.[action] ?? false
}

/**
 * Bedingte Rendering-Komponente basierend auf Berechtigungen.
 *
 * Beispiel: <Can module="companies" action="create"><Button>Neue Firma</Button></Can>
 */
export function Can({
  module,
  action,
  children,
  fallback = null,
}: {
  module: Module
  action: Action
  children: ReactNode
  fallback?: ReactNode
}) {
  const { permissions, loading } = useContext(PermissionContext)

  if (loading) return null

  const allowed = permissions[module]?.[action] ?? false
  return allowed ? <>{children}</> : <>{fallback}</>
}
