import { db } from '@/lib/db'
import { voiceCalls, voiceCallMessages } from '@/lib/db/schema'
import { and, asc, desc, eq, gte, lte, ilike, sql } from 'drizzle-orm'
import type { VoiceCall, VoiceCallMessage } from '@/lib/db/schema'

export interface WebhookCallInput {
  roomName: string
  agentKey: string
  direction?: 'outbound' | 'inbound'
  phone?: string | null
  callerName?: string | null
  contextText?: string | null
  startedAt: string | Date
  endedAt?: string | Date | null
  durationSeconds?: number | null
  status?: string
  summary?: string | null
  recordingUrl?: string | null
  twilioCallSid?: string | null
  transcript?: Array<{
    ts: string | Date
    role: 'agent' | 'user' | 'system' | string
    text: string
  }>
  rawPayload?: Record<string, unknown>
}

export interface VoiceCallListFilters {
  agentKey?: string
  direction?: string
  phone?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export const VoiceCallService = {
  // ────────────────────────────────────────────────────────────
  // Webhook-Idempotenz: upsert auf room_name. Messages werden bei
  // Re-Post vollstaendig ersetzt (Voice-Server liefert immer den
  // kompletten Transkript-Stand).
  // ────────────────────────────────────────────────────────────
  async upsertFromWebhook(data: WebhookCallInput): Promise<VoiceCall> {
    const startedAt = data.startedAt instanceof Date ? data.startedAt : new Date(data.startedAt)
    const endedAt = data.endedAt
      ? data.endedAt instanceof Date ? data.endedAt : new Date(data.endedAt)
      : null

    const baseValues = {
      roomName: data.roomName,
      agentKey: data.agentKey,
      direction: data.direction ?? 'outbound',
      phone: data.phone ?? null,
      callerName: data.callerName ?? null,
      contextText: data.contextText ?? null,
      startedAt,
      endedAt,
      durationSeconds: data.durationSeconds ?? null,
      status: data.status ?? 'completed',
      summary: data.summary ?? null,
      recordingUrl: data.recordingUrl ?? null,
      twilioCallSid: data.twilioCallSid ?? null,
      rawPayload: data.rawPayload ?? null,
    }

    const [row] = await db
      .insert(voiceCalls)
      .values(baseValues)
      .onConflictDoUpdate({
        target: voiceCalls.roomName,
        set: { ...baseValues, updatedAt: new Date() },
      })
      .returning()

    // Messages atomar ersetzen (idempotent bei Re-Post).
    if (data.transcript) {
      await db.delete(voiceCallMessages).where(eq(voiceCallMessages.callId, row.id))
      if (data.transcript.length > 0) {
        await db.insert(voiceCallMessages).values(
          data.transcript.map((m, idx) => ({
            callId: row.id,
            ts: m.ts instanceof Date ? m.ts : new Date(m.ts),
            role: m.role,
            text: m.text,
            sortOrder: idx,
          }))
        )
      }
    }
    return row
  },

  async list(filter: VoiceCallListFilters = {}): Promise<{ rows: VoiceCall[]; total: number }> {
    const conditions = []
    if (filter.agentKey)  conditions.push(eq(voiceCalls.agentKey, filter.agentKey))
    if (filter.direction) conditions.push(eq(voiceCalls.direction, filter.direction))
    if (filter.phone)     conditions.push(eq(voiceCalls.phone, filter.phone))
    if (filter.search)    conditions.push(ilike(voiceCalls.callerName, `%${filter.search}%`))
    if (filter.dateFrom)  conditions.push(gte(voiceCalls.startedAt, new Date(filter.dateFrom)))
    if (filter.dateTo)    conditions.push(lte(voiceCalls.startedAt, new Date(filter.dateTo)))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const limit = filter.limit ?? 50
    const offset = filter.offset ?? 0

    const rows = await db
      .select()
      .from(voiceCalls)
      .where(whereClause)
      .orderBy(desc(voiceCalls.startedAt))
      .limit(limit)
      .offset(offset)

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(voiceCalls)
      .where(whereClause)

    return { rows, total: countRow?.count ?? 0 }
  },

  async getById(id: string): Promise<{ call: VoiceCall; messages: VoiceCallMessage[] } | null> {
    const [call] = await db.select().from(voiceCalls).where(eq(voiceCalls.id, id)).limit(1)
    if (!call) return null
    const messages = await db
      .select()
      .from(voiceCallMessages)
      .where(eq(voiceCallMessages.callId, id))
      .orderBy(asc(voiceCallMessages.ts), asc(voiceCallMessages.sortOrder))
    return { call, messages }
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(voiceCalls).where(eq(voiceCalls.id, id)).returning({ id: voiceCalls.id })
    return result.length > 0
  },
}
