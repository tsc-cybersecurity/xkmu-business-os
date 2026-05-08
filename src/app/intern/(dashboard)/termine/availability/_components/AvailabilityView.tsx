'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AvailabilityRule } from '@/lib/db/schema'
import { RulesEditor } from './RulesEditor'
import { OverridesEditor, type OverrideRow } from './OverridesEditor'
import { BlockCalendarEditor, type AppointmentRow, type ExternalBusyRow } from './BlockCalendarEditor'

export function AvailabilityView(props: {
  initialRules: AvailabilityRule[]
  initialOverrides: OverrideRow[]
  appointments: AppointmentRow[]
  externalBusy: ExternalBusyRow[]
}) {
  const [rules, setRules] = useState(props.initialRules)
  const [overrides, setOverrides] = useState(props.initialOverrides)

  return (
    <Tabs defaultValue="calendar">
      <TabsList>
        <TabsTrigger value="calendar">Kalender</TabsTrigger>
        <TabsTrigger value="rules">Wochenraster</TabsTrigger>
        <TabsTrigger value="overrides">Ausnahmen-Liste</TabsTrigger>
      </TabsList>
      <TabsContent value="calendar" className="mt-4">
        <BlockCalendarEditor
          overrides={overrides}
          onChange={setOverrides}
          appointments={props.appointments}
          externalBusy={props.externalBusy}
        />
      </TabsContent>
      <TabsContent value="rules" className="mt-4">
        <RulesEditor rules={rules} onChange={setRules} />
      </TabsContent>
      <TabsContent value="overrides" className="mt-4">
        <OverridesEditor overrides={overrides} onChange={setOverrides} />
      </TabsContent>
    </Tabs>
  )
}
