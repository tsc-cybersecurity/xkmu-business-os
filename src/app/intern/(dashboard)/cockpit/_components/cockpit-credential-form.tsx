import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/shared'
import { Loader2, Eye, EyeOff } from 'lucide-react'

interface CredentialFormData {
  type: string
  label: string
  username: string
  password: string
  notes: string
}

const credentialTypes = [
  { value: 'login', label: 'Login' },
  { value: 'api_key', label: 'API-Schluessel' },
  { value: 'ssh_key', label: 'SSH-Key' },
  { value: 'certificate', label: 'Zertifikat' },
  { value: 'token', label: 'Token' },
  { value: 'database', label: 'Datenbank' },
  { value: 'ftp', label: 'FTP' },
  { value: 'other', label: 'Sonstige' },
]

interface CockpitCredentialFormProps {
  editingCredentialId: string | null
  credentialForm: CredentialFormData
  setCredentialForm: React.Dispatch<React.SetStateAction<CredentialFormData>>
  credFormPasswordVisible: boolean
  setCredFormPasswordVisible: (v: boolean) => void
  savingCredential: boolean
  onSave: () => void
  onCancel: () => void
}

export function CockpitCredentialForm({
  editingCredentialId,
  credentialForm,
  setCredentialForm,
  credFormPasswordVisible,
  setCredFormPasswordVisible,
  savingCredential,
  onSave,
  onCancel,
}: CockpitCredentialFormProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h4 className="text-sm font-medium">
        {editingCredentialId ? 'Zugang bearbeiten' : 'Neuer Zugang'}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Typ" htmlFor="cred-type">
          <Select value={credentialForm.type} onValueChange={(v) => setCredentialForm((p) => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {credentialTypes.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Bezeichnung" htmlFor="cred-label" required>
          <Input
            id="cred-label"
            value={credentialForm.label}
            onChange={(e) => setCredentialForm((p) => ({ ...p, label: e.target.value }))}
            placeholder="z.B. Admin-Login"
          />
        </FormField>
        <FormField label="Benutzer" htmlFor="cred-username">
          <Input
            id="cred-username"
            value={credentialForm.username}
            onChange={(e) => setCredentialForm((p) => ({ ...p, username: e.target.value }))}
            placeholder="z.B. admin"
          />
        </FormField>
        <FormField label="Passwort" htmlFor="cred-password">
          <div className="relative">
            <Input
              id="cred-password"
              type={credFormPasswordVisible ? 'text' : 'password'}
              value={credentialForm.password}
              onChange={(e) => setCredentialForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Passwort"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setCredFormPasswordVisible(!credFormPasswordVisible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {credFormPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>
      </div>
      <FormField label="Notizen" htmlFor="cred-notes">
        <Textarea
          id="cred-notes"
          value={credentialForm.notes}
          onChange={(e) => setCredentialForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Zusaetzliche Notizen..."
          rows={2}
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Abbrechen</Button>
        <Button size="sm" onClick={onSave} disabled={savingCredential}>
          {savingCredential && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {editingCredentialId ? 'Speichern' : 'Erstellen'}
        </Button>
      </div>
    </div>
  )
}
