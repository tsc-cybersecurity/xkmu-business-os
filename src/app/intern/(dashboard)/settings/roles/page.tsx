'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Can } from '@/hooks/use-permissions'

interface RoleItem {
  id: string
  name: string
  displayName: string
  description: string | null
  isSystem: boolean
  userCount: number
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRoles()
  }, [])

  async function fetchRoles() {
    try {
      const response = await fetch('/api/v1/roles')
      const data = await response.json()
      if (data.success) {
        setRoles(data.data)
      } else {
        setError(data.error?.message || 'Fehler beim Laden')
      }
    } catch {
      setError('Fehler beim Laden der Rollen')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Rolle wirklich loeschen?')) return

    try {
      const response = await fetch(`/api/v1/roles/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        setRoles((prev) => prev.filter((r) => r.id !== id))
      } else {
        setError(data.error?.message || 'Fehler beim Loeschen')
      }
    } catch {
      setError('Fehler beim Loeschen der Rolle')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rollenverwaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Rollen und deren Berechtigungen
          </p>
        </div>
        <Can module="roles" action="create">
          <Link href="/intern/settings/roles/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neue Rolle
            </Button>
          </Link>
        </Can>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Rollen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Wird geladen...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anzeigename</TableHead>
                  <TableHead>Technischer Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Benutzer</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      {role.displayName}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{role.name}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="secondary">System</Badge>
                      ) : (
                        <Badge variant="outline">Benutzerdefiniert</Badge>
                      )}
                    </TableCell>
                    <TableCell>{role.userCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Can module="roles" action="update">
                          <Link href={`/intern/settings/roles/${role.id}`}>
                            <Button variant="ghost" size="icon" aria-label="Bearbeiten">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        </Can>
                        {!role.isSystem && (
                          <Can module="roles" action="delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Loeschen"
                              onClick={() => handleDelete(role.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </Can>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Keine Rollen vorhanden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
