import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Copy, Eye, EyeOff } from 'lucide-react'

interface CockpitCredential {
  id: string
  systemId: string
  type: string
  label: string
  username: string | null
  password: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

const credentialTypeLabels: Record<string, string> = {
  login: 'Login',
  api_key: 'API-Schluessel',
  ssh_key: 'SSH-Key',
  certificate: 'Zertifikat',
  token: 'Token',
  database: 'Datenbank',
  ftp: 'FTP',
  other: 'Sonstige',
}

const credentialTypeBadgeColors: Record<string, string> = {
  login: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  api_key: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  ssh_key: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  certificate: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  token: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  database: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  ftp: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
}

interface CockpitCredentialListProps {
  credentials: CockpitCredential[]
  visiblePasswords: Set<string>
  onTogglePasswordVisibility: (id: string) => void
  onCopyToClipboard: (text: string, label: string) => void
  onEdit: (cred: CockpitCredential) => void
  onDelete: (id: string) => void
}

export function CockpitCredentialList({
  credentials,
  visiblePasswords,
  onTogglePasswordVisibility,
  onCopyToClipboard,
  onEdit,
  onDelete,
}: CockpitCredentialListProps) {
  if (credentials.length === 0) return null

  return (
    <div className="space-y-2 mb-3">
      {credentials.map((cred) => (
        <div key={cred.id} className="flex items-center gap-3 rounded-lg border p-3">
          <Badge className={credentialTypeBadgeColors[cred.type] || credentialTypeBadgeColors.other}>
            {credentialTypeLabels[cred.type] || cred.type}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{cred.label}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {cred.username && <span className="text-xs text-muted-foreground">{cred.username}</span>}
              {cred.password && (
                <span className="text-xs text-muted-foreground">
                  {visiblePasswords.has(cred.id) ? cred.password : '••••••'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {cred.password && (
              <>
                <button
                  onClick={() => onTogglePasswordVisibility(cred.id)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title={visiblePasswords.has(cred.id) ? 'Verbergen' : 'Anzeigen'}
                >
                  {visiblePasswords.has(cred.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => onCopyToClipboard(cred.password!, 'Passwort')}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="Passwort kopieren"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {cred.username && (
              <button
                onClick={() => onCopyToClipboard(cred.username!, 'Benutzer')}
                className="p-1 text-muted-foreground hover:text-foreground"
                title="Benutzer kopieren"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cred)} title="Bearbeiten">
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(cred.id)}
              title="Löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
