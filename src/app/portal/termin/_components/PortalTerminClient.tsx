'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BookingWizard } from './BookingWizard'
import { MyAppointmentsList } from './MyAppointmentsList'

export function PortalTerminClient() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [tab, setTab] = useState<'my' | 'book'>('my')
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'my' | 'book')}>
      <TabsList>
        <TabsTrigger value="my">Meine Termine</TabsTrigger>
        <TabsTrigger value="book">Termin buchen</TabsTrigger>
      </TabsList>
      <TabsContent value="my" className="pt-4">
        <MyAppointmentsList key={`my-${refreshKey}`} onChanged={triggerRefresh} />
      </TabsContent>
      <TabsContent value="book" className="pt-4">
        <BookingWizard onBooked={() => { triggerRefresh(); setTab('my') }} />
      </TabsContent>
    </Tabs>
  )
}
