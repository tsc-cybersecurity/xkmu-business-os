import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SlotTypeService } from '@/lib/services/slot-type.service'
import { SlotTypesView } from './_components/SlotTypesView'

export default async function SlotTypesPage() {
  const session = await getSession()
  if (!session) redirect('/intern/login')

  const slotTypes = await SlotTypeService.list(session.user.id)

  return <SlotTypesView initialSlotTypes={slotTypes.map(st => ({
    ...st,
    location: st.location as 'phone' | 'video' | 'onsite' | 'custom',
    createdAt: st.createdAt.toISOString(),
    updatedAt: st.updatedAt.toISOString(),
  }))} />
}
