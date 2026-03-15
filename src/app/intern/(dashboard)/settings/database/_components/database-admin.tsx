'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Search,
  Database,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'

interface TableInfo {
  name: string
  estimatedRows: number
}

interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  default: string | null
}

interface TableData {
  columns: ColumnInfo[]
  rows: Record<string, unknown>[]
  hasTenantId: boolean
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function DatabaseAdmin() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [filteredTables, setFilteredTables] = useState<TableInfo[]>([])
  const [tableSearch, setTableSearch] = useState('')
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; tableName: string } | null>(null)

  // Fetch tables list
  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch('/api/v1/admin/database/tables')
        const data = await res.json()
        if (data.success) {
          setTables(data.data)
          setFilteredTables(data.data)
        }
      } catch (error) {
        logger.error('Failed to fetch tables', error, { module: 'SettingsDatabasePage' })
        toast.error('Fehler beim Laden der Tabellenliste')
      } finally {
        setLoading(false)
      }
    }
    fetchTables()
  }, [])

  // Filter tables by search
  useEffect(() => {
    if (!tableSearch) {
      setFilteredTables(tables)
    } else {
      setFilteredTables(
        tables.filter((t) =>
          t.name.toLowerCase().includes(tableSearch.toLowerCase())
        )
      )
    }
  }, [tableSearch, tables])

  // Fetch table data
  const fetchTableData = useCallback(async (tableName: string, page: number) => {
    setDataLoading(true)
    try {
      const res = await fetch(
        `/api/v1/admin/database/tables/${tableName}?page=${page}&limit=20`
      )
      const data = await res.json()
      if (data.success) {
        setTableData(data.data)
        setMeta(data.meta)
      } else {
        toast.error(data.error?.message || 'Fehler beim Laden')
      }
    } catch (error) {
      logger.error('Failed to fetch table data', error, { module: 'SettingsDatabasePage' })
      toast.error('Fehler beim Laden der Tabellendaten')
    } finally {
      setDataLoading(false)
    }
  }, [])

  // Load data when table or page changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, currentPage)
    }
  }, [selectedTable, currentPage, fetchTableData])

  const handleSelectTable = (name: string) => {
    setSelectedTable(name)
    setCurrentPage(1)
    setEditingCell(null)
    setTableData(null)
  }

  // Inline edit handlers
  const startEdit = (rowIndex: number, column: string, currentValue: unknown) => {
    if (column === 'id' || column === 'tenant_id') return // Don't allow editing id or tenant_id
    setEditingCell({ rowIndex, column })
    setEditValue(currentValue === null ? '' : String(currentValue))
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editingCell || !selectedTable || !tableData) return

    const row = tableData.rows[editingCell.rowIndex]
    const id = row.id as string

    try {
      const res = await fetch(`/api/v1/admin/database/tables/${selectedTable}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          [editingCell.column]: editValue || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Datensatz aktualisiert')
        // Reload data
        fetchTableData(selectedTable, currentPage)
      } else {
        toast.error(data.error?.message || 'Fehler beim Speichern')
      }
    } catch (error) {
      logger.error('Failed to save edit', error, { module: 'SettingsDatabasePage' })
      toast.error('Fehler beim Speichern')
    }
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const res = await fetch(
        `/api/v1/admin/database/tables/${deleteTarget.tableName}?id=${deleteTarget.id}`,
        { method: 'DELETE' }
      )

      const data = await res.json()
      if (data.success) {
        toast.success('Datensatz geloescht')
        if (selectedTable) {
          fetchTableData(selectedTable, currentPage)
        }
        // Refresh table list for row counts
        const tablesRes = await fetch('/api/v1/admin/database/tables')
        const tablesData = await tablesRes.json()
        if (tablesData.success) {
          setTables(tablesData.data)
        }
      } else {
        toast.error(data.error?.message || 'Fehler beim Loeschen')
      }
    } catch (error) {
      logger.error('Failed to delete row', error, { module: 'SettingsDatabasePage' })
      toast.error('Fehler beim Loeschen')
    }
    setDeleteTarget(null)
  }

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '–'
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    const str = String(value)
    if (str.length > 100) return str.slice(0, 100) + '...'
    return str
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      {/* Left column: Table list */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Tabellen ({tables.length})
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tabelle suchen..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-300px)] overflow-y-auto p-0">
          <div className="space-y-0.5 px-2 pb-2">
            {filteredTables.map((table) => (
              <button
                key={table.name}
                onClick={() => handleSelectTable(table.name)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedTable === table.name
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <span className="truncate font-mono text-xs">
                  {table.name}
                </span>
                <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                  {table.estimatedRows}
                </Badge>
              </button>
            ))}
            {filteredTables.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Keine Tabellen gefunden
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right column: Table data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {selectedTable ? (
              <span className="font-mono">{selectedTable}</span>
            ) : (
              'Tabelle auswaehlen'
            )}
          </CardTitle>
          {meta && (
            <p className="text-sm text-muted-foreground">
              {meta.total} Datensaetze gesamt
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!selectedTable ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                Keine Tabelle ausgewaehlt
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Waehlen Sie eine Tabelle aus der Liste links aus
              </p>
            </div>
          ) : dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tableData && tableData.rows.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tableData.columns.map((col) => (
                        <TableHead
                          key={col.name}
                          className="whitespace-nowrap font-mono text-xs"
                        >
                          {col.name}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ({col.type})
                          </span>
                        </TableHead>
                      ))}
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {tableData.columns.map((col) => {
                          const isEditing =
                            editingCell?.rowIndex === rowIndex &&
                            editingCell?.column === col.name

                          return (
                            <TableCell
                              key={col.name}
                              className="max-w-[300px] truncate font-mono text-xs"
                              onDoubleClick={() =>
                                startEdit(rowIndex, col.name, row[col.name])
                              }
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editValue}
                                    onChange={(e) =>
                                      setEditValue(e.target.value)
                                    }
                                    onKeyDown={handleKeyDown}
                                    className="h-7 text-xs"
                                    autoFocus
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Speichern"
                                    className="h-7 w-7"
                                    onClick={saveEdit}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Abbrechen"
                                    className="h-7 w-7"
                                    onClick={cancelEdit}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className={
                                    row[col.name] === null
                                      ? 'text-muted-foreground'
                                      : ''
                                  }
                                  title={
                                    typeof row[col.name] === 'object'
                                      ? JSON.stringify(row[col.name], null, 2)
                                      : String(row[col.name] ?? '')
                                  }
                                >
                                  {formatCellValue(row[col.name])}
                                </span>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="w-10">
                          {'id' in row && row.id != null ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Loeschen"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  id: String(row.id),
                                  tableName: selectedTable,
                                })
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Seite {meta.page} von {meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Zurueck
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= meta.totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Weiter
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Keine Daten</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Diese Tabelle enthaelt keine Datensaetze
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datensatz loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Moechten Sie diesen Datensatz wirklich loeschen? Diese Aktion kann
              nicht rueckgaengig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Loeschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
