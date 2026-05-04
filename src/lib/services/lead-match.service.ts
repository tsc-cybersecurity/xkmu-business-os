import { db } from '@/lib/db'
import { persons, leads } from '@/lib/db/schema'
import { eq, or, sql } from 'drizzle-orm'

export interface LeadMatchInput {
  email: string
  name: string
  phone: string
  source: string
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim()
  if (!trimmed) return { firstName: '—', lastName: '—' }
  const idx = trimmed.indexOf(' ')
  if (idx < 0) return { firstName: trimmed, lastName: '—' }
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1).trim() || '—',
  }
}

export const LeadMatchService = {
  async findOrCreate(input: LeadMatchInput): Promise<{ leadId: string; personId: string }> {
    const email = input.email.trim().toLowerCase()
    const { firstName, lastName } = splitName(input.name)

    // 1. Find or create person by email (case-insensitive)
    let personId: string
    const existingPersons = await db
      .select({ id: persons.id })
      .from(persons)
      .where(sql`lower(${persons.email}) = ${email}`)
      .limit(1)

    if (existingPersons[0]) {
      personId = existingPersons[0].id
    } else {
      const [newPerson] = await db
        .insert(persons)
        .values({
          firstName,
          lastName,
          email: input.email.trim(),
          phone: input.phone || null,
          status: 'active',
        })
        .returning({ id: persons.id })
      personId = newPerson.id
    }

    // 2. Find or create lead by personId OR contactEmail (case-insensitive)
    let leadId: string
    const existingLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        or(
          eq(leads.personId, personId),
          sql`lower(${leads.contactEmail}) = ${email}`,
        ),
      )
      .limit(1)

    if (existingLeads[0]) {
      leadId = existingLeads[0].id
    } else {
      const [newLead] = await db
        .insert(leads)
        .values({
          personId,
          title: 'Terminanfrage',
          source: input.source,
          contactFirstName: firstName,
          contactLastName: lastName,
          contactEmail: input.email.trim(),
          contactPhone: input.phone || null,
          status: 'new',
        })
        .returning({ id: leads.id })
      leadId = newLead.id
    }

    return { leadId, personId }
  },
}
