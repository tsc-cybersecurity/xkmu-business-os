'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { MODULES, ACTIONS, MODULE_LABELS, ACTION_LABELS, type Module, type Action } from '@/lib/types/permissions'

interface RolePermission {
  module: string
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
}

interface RoleData {
  id: string
  name: string
  displayName: string
  description: string | null
  isSystem: boolean
  permissions: RolePermission[]
}

export default function RoleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'

  const [displayName, setDisplayName] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSystem, setIsSystem] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({})
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Berechtigungen initialisieren
    const initial: Record<string, Record<string, boolean>> = {}
    for (const mod of MODULES) {
      initial[mod] = { create: false, read: false, update: false, delete: false }
    }
    setPermissions(initial)

    if (!isNew) {
      fetchRole()
    }
  }, [id, isNew])

  async function fetchRole() {
    try {
      const response = await fetch(`/api/v1/roles/${id}`)
      const data = await response.json()
      if (data.success) {
        const role: RoleData = data.data
        setDisplayName(role.displayName)
        setName(role.name)
        setDescription(role.description || '')
        setIsSystem(role.isSystem ?? false)
        setIsOwner(role.name === 'owner')

        // Berechtigungen aus API-Daten setzen
        const permMap: Record<string, Record<string, boolean>> = {}
        for (const mod of MODULES) {
          // Owner-Rolle hat immer vollen Zugriff
          if (role.name === 'owner') {
            permMap[mod] = { create: true, read: true, update: true, delete: true }
          } else {
            permMap[mod] = { create: false, read: false, update: false, delete: false }
          }
        }
        if (role.name !== 'owner') {
          for (const p of role.permissions) {
            if (permMap[p.module]) {
              permMap[p.module] = {
                create: p.canCreate,
                read: p.canRead,
                update: p.canUpdate,
                delete: p.canDelete,
              }
            }
          }
        }
        setPermissions(permMap)
      } else {
        setError('Rolle nicht gefunden')
      }
    } catch {
      setError('Fehler beim Laden der Rolle')
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(module: string, action: string) {
    if (isOwner) return // Owner-Berechtigungen nicht aenderbar
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action],
      },
    }))
  }

  function toggleAllForModule(module: string) {
    if (isOwner) return
    const current = permissions[module]
    const allTrue = current && Object.values(current).every(Boolean)
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        create: !allTrue,
        read: !allTrue,
        update: !allTrue,
        delete: !allTrue,
      },
    }))
  }

  function toggleAllForAction(action: string) {
    if (isOwner) return
    const allTrue = MODULES.every((m) => permissions[m]?.[action])
    setPermissions((prev) => {
      const next = { ...prev }
      for (const mod of MODULES) {
        next[mod] = { ...next[mod], [action]: !allTrue }
      }
      return next
    })
  }

  async function handleSave() {
    setError('')
    setSaving(true)

    const permissionArray = MODULES.map((module) => ({
      module,
      canCreate: permissions[module]?.create ?? false,
      canRead: permissions[module]?.read ?? false,
      canUpdate: permissions[module]?.update ?? false,
      canDelete: permissions[module]?.delete ?? false,
    }))

    try {
      if (isNew) {
        if (!name || !displayName) {
          setError('Name und Anzeigename sind erforderlich')
          setSaving(false)
          return
        }

        const response = await fetch('/api/v1/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            displayName,
            description,
            permissions: permissionArray,
          }),
        })
        const data = await response.json()
        if (data.success) {
          router.push('/intern/settings/roles')
        } else {
          setError(data.error?.message || 'Fehler beim Erstellen')
        }
      } else {
        const response = await fetch(`/api/v1/roles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            description,
            permissions: permissionArray,
          }),
        })
        const data = await response.json()
        if (data.success) {
          router.push('/intern/settings/roles')
        } else {
          setError(data.error?.message || 'Fehler beim Speichern')
        }
      }
    } catch {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Wird geladen...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/intern/settings/roles">
          <Button variant="ghost" size="icon" aria-label="Zurueck">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {isNew ? 'Neue Rolle erstellen' : `Rolle bearbeiten: ${displayName}`}
          </h1>
          <p className="text-muted-foreground">
            {isOwner
              ? 'Die Eigentuemer-Rolle hat immer vollen Zugriff'
              : 'Berechtigungen fuer diese Rolle konfigurieren'}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rollendetails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNew && (
            <div className="space-y-2">
              <Label htmlFor="name">Technischer Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. manager"
                pattern="^[a-z0-9_]+$"
              />
              <p className="text-xs text-muted-foreground">
                Nur Kleinbuchstaben, Zahlen und Unterstriche
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Anzeigename</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="z.B. Manager"
              disabled={isOwner}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung der Rolle"
              disabled={isOwner}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Berechtigungsmatrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-medium">Modul</th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="text-center py-3 px-4 font-medium">
                      <button
                        onClick={() => toggleAllForAction(action)}
                        className="hover:text-primary transition-colors"
                        disabled={isOwner}
                      >
                        {ACTION_LABELS[action]}
                      </button>
                    </th>
                  ))}
                  <th className="text-center py-3 px-4 font-medium">Alle</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((module) => (
                  <tr key={module} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {MODULE_LABELS[module]}
                    </td>
                    {ACTIONS.map((action) => (
                      <td key={action} className="text-center py-3 px-4">
                        <Checkbox
                          checked={permissions[module]?.[action] ?? false}
                          onCheckedChange={() => togglePermission(module, action)}
                          disabled={isOwner}
                        />
                      </td>
                    ))}
                    <td className="text-center py-3 px-4">
                      <Checkbox
                        checked={
                          permissions[module] &&
                          Object.values(permissions[module]).every(Boolean)
                        }
                        onCheckedChange={() => toggleAllForModule(module)}
                        disabled={isOwner}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!isOwner && (
        <div className="flex justify-end gap-4">
          <Link href="/intern/settings/roles">
            <Button variant="outline">Abbrechen</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </div>
      )}
    </div>
  )
}
