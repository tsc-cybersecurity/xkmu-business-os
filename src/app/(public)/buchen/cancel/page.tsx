import { db } from '@/lib/db'
import { appointments, slotTypes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyAppointmentToken, hashOf } from '@/lib/utils/appointment-token.util'
import { CancelConfirm } from './_components/CancelConfirm'

interface Props { searchParams: Promise<{ token?: string }> }

export default async function CancelPage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) return <ErrorBox kind="missing" />

  const v = verifyAppointmentToken(token)
  if (!v.ok) return <ErrorBox kind={v.reason === 'expired' ? 'expired' : 'invalid'} />
  if (v.payload.p !== 'cancel') return <ErrorBox kind="invalid" />

  const [row] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      customerName: appointments.customerName,
      cancelTokenHash: appointments.cancelTokenHash,
      slotTypeName: slotTypes.name,
    })
    .from(appointments)
    .innerJoin(slotTypes, eq(appointments.slotTypeId, slotTypes.id))
    .where(eq(appointments.id, v.payload.a))
    .limit(1)

  if (!row) return <ErrorBox kind="invalid" />
  if (row.cancelTokenHash !== hashOf(token)) return <ErrorBox kind="invalid" />
  if (row.status === 'cancelled') return <ErrorBox kind="already_cancelled" />

  return (
    <main className="container max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-4">Termin stornieren</h1>
      <p className="text-muted-foreground mb-6">
        Möchtest du wirklich folgenden Termin stornieren?
      </p>
      <div className="rounded-lg border p-4 mb-6 space-y-1 text-sm">
        <div><strong>Termin-Art:</strong> {row.slotTypeName}</div>
        <div><strong>Datum:</strong> {row.startAt.toLocaleString('de-DE')} – {row.endAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
        <div><strong>Kunde:</strong> {row.customerName}</div>
      </div>
      <CancelConfirm token={token} />
    </main>
  )
}

function ErrorBox({ kind }: { kind: 'missing' | 'expired' | 'invalid' | 'already_cancelled' }) {
  const messages: Record<string, string> = {
    missing: 'Kein Token übergeben.',
    expired: 'Dieser Storno-Link ist abgelaufen (der Termin liegt in der Vergangenheit).',
    invalid: 'Dieser Storno-Link ist ungültig oder wurde bereits verwendet.',
    already_cancelled: 'Dieser Termin wurde bereits storniert.',
  }
  return (
    <main className="container max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-4">Storno nicht möglich</h1>
      <p className="text-muted-foreground">{messages[kind]}</p>
    </main>
  )
}
