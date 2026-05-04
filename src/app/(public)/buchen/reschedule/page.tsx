import { db } from '@/lib/db'
import { appointments, slotTypes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyAppointmentToken, hashOf } from '@/lib/utils/appointment-token.util'
import { RescheduleWizard } from './_components/RescheduleWizard'

interface Props { searchParams: Promise<{ token?: string }> }

export default async function ReschedulePage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) return <ErrorBox kind="missing" />

  const v = verifyAppointmentToken(token)
  if (!v.ok) return <ErrorBox kind={v.reason === 'expired' ? 'expired' : 'invalid'} />
  if (v.payload.p !== 'reschedule') return <ErrorBox kind="invalid" />

  const [row] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      customerName: appointments.customerName,
      rescheduleTokenHash: appointments.rescheduleTokenHash,
      slotTypeId: slotTypes.id,
      slotTypeName: slotTypes.name,
      slotTypeDuration: slotTypes.durationMinutes,
      slotTypeMinNotice: slotTypes.minNoticeHours,
      slotTypeMaxAdvance: slotTypes.maxAdvanceDays,
      userId: users.id,
      userTimezone: users.timezone,
    })
    .from(appointments)
    .innerJoin(slotTypes, eq(appointments.slotTypeId, slotTypes.id))
    .innerJoin(users, eq(appointments.userId, users.id))
    .where(eq(appointments.id, v.payload.a))
    .limit(1)

  if (!row) return <ErrorBox kind="invalid" />
  if (row.rescheduleTokenHash !== hashOf(token)) return <ErrorBox kind="invalid" />
  if (row.status === 'cancelled') return <ErrorBox kind="cancelled" />

  return (
    <main className="container max-w-2xl py-12">
      <h1 className="text-2xl font-semibold mb-2">Termin umbuchen</h1>
      <p className="text-muted-foreground mb-6">
        Aktueller Termin: <strong>{row.slotTypeName}</strong> am {row.startAt.toLocaleString('de-DE', { dateStyle: 'long', timeStyle: 'short' })}
      </p>
      <RescheduleWizard
        token={token}
        timezone={row.userTimezone}
        slotType={{
          id: row.slotTypeId,
          name: row.slotTypeName,
          durationMinutes: row.slotTypeDuration,
          minNoticeHours: row.slotTypeMinNotice,
          maxAdvanceDays: row.slotTypeMaxAdvance,
        }}
      />
    </main>
  )
}

function ErrorBox({ kind }: { kind: 'missing' | 'expired' | 'invalid' | 'cancelled' }) {
  const messages: Record<string, string> = {
    missing: 'Kein Token übergeben.',
    expired: 'Dieser Umbuchungs-Link ist abgelaufen (der Termin liegt in der Vergangenheit).',
    invalid: 'Dieser Umbuchungs-Link ist ungültig oder wurde bereits verwendet.',
    cancelled: 'Dieser Termin wurde bereits storniert. Eine Umbuchung ist nicht mehr möglich.',
  }
  return (
    <main className="container max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-4">Umbuchung nicht möglich</h1>
      <p className="text-muted-foreground">{messages[kind]}</p>
    </main>
  )
}
