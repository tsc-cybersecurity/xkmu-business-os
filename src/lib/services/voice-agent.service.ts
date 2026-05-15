import { db } from '@/lib/db'
import { aiProviders } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

// ============================================================
// Voice Agent Service — Proxy zu voice.xkmu.de
// ------------------------------------------------------------
// Liest API-Key + Base-URL aus ai_providers (providerType='voice'),
// proxied alle Requests serverseitig damit der Key nie im Browser
// landet. Voice-API: siehe temp/voiceagent_external-api.md.
// ============================================================

export type VoiceAgentKey =
  | 'simple-latency'
  | 'appointment-booking'
  | 'outbound-telephony'
  | 'inbound-receptionist'

export type VoiceAgentState = 'running' | 'stopped' | 'starting' | 'missing' | 'failed'

export interface VoiceStatusResponse {
  agents: Record<string, VoiceAgentState>
  phoneNumber: string | null
}

export type FieldSpec =
  | { kind: 'enum'; values: string[] }
  | { kind: 'float'; min: number; max: number; nullable?: boolean }
  | { kind: 'bool' }

export interface VoiceAgentSettingsAgent {
  key: string
  label: string
  fields: Record<string, FieldSpec>
  defaults: Record<string, unknown>
  settings: Record<string, unknown>
}

export interface VoiceAgentPromptAgent {
  key: string
  label: string
  placeholders: string[]
  prompt: { system_prompt: string; greeting: string }
}

export interface VoiceProviderConfig {
  apiKey: string
  baseUrl: string
}

export class VoiceAgentNotConfiguredError extends Error {
  constructor() {
    super(
      'Kein aktiver Voice-Provider konfiguriert. Lege in Einstellungen → KI-Provider einen Provider mit Typ "voice" an.'
    )
    this.name = 'VoiceAgentNotConfiguredError'
  }
}

async function getProviderConfig(): Promise<VoiceProviderConfig> {
  const rows = await db
    .select()
    .from(aiProviders)
    .where(and(eq(aiProviders.providerType, 'voice'), eq(aiProviders.isActive, true)))
    .orderBy(asc(aiProviders.priority))
    .limit(1)

  const provider = rows[0]
  if (!provider || !provider.apiKey || !provider.baseUrl) {
    throw new VoiceAgentNotConfiguredError()
  }
  // Trailing-Slash entfernen, dann reproduzierbar /api/... anhaengen.
  return { apiKey: provider.apiKey, baseUrl: provider.baseUrl.replace(/\/+$/, '') }
}

interface VoiceFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

async function voiceFetch<T>(path: string, opts: VoiceFetchOptions = {}): Promise<T> {
  const { apiKey, baseUrl } = await getProviderConfig()
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Server-to-Server — kein Origin-Header (laut Voice-API-Doc faellt
      // damit der Origin-Whitelist-Check weg, Bearer reicht).
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  }
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body)
  }

  const res = await fetch(url, init)
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const errMessage =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) ?? `Voice-API ${res.status}`
    const error = new Error(errMessage) as Error & { status?: number; body?: unknown }
    error.status = res.status
    error.body = data
    throw error
  }
  return data as T
}

export const VoiceAgentService = {
  async isConfigured(): Promise<boolean> {
    try {
      await getProviderConfig()
      return true
    } catch {
      return false
    }
  },

  async getStatus(): Promise<VoiceStatusResponse> {
    return voiceFetch<VoiceStatusResponse>('/api/agent/status')
  },

  async startAgent(name: VoiceAgentKey): Promise<{ status: string }> {
    return voiceFetch<{ status: string }>('/api/agent/start', {
      method: 'POST',
      body: { name },
    })
  },

  async stopAgent(name: VoiceAgentKey): Promise<{ status: string }> {
    return voiceFetch<{ status: string }>('/api/agent/stop', {
      method: 'POST',
      body: { name },
    })
  },

  async getPrompts(): Promise<{ agents: VoiceAgentPromptAgent[] }> {
    return voiceFetch<{ agents: VoiceAgentPromptAgent[] }>('/api/admin/prompts')
  },

  async updatePrompt(
    key: VoiceAgentKey,
    systemPrompt: string,
    greeting: string
  ): Promise<{ ok: boolean }> {
    return voiceFetch<{ ok: boolean }>('/api/admin/prompts', {
      method: 'PUT',
      body: { key, system_prompt: systemPrompt, greeting },
    })
  },

  async getSettings(): Promise<{ agents: VoiceAgentSettingsAgent[] }> {
    return voiceFetch<{ agents: VoiceAgentSettingsAgent[] }>('/api/admin/settings')
  },

  async updateSettings(
    key: VoiceAgentKey,
    settings: Record<string, unknown>
  ): Promise<{ ok: boolean; settings: Record<string, unknown> }> {
    return voiceFetch<{ ok: boolean; settings: Record<string, unknown> }>(
      '/api/admin/settings',
      { method: 'PUT', body: { key, settings } }
    )
  },

  async dispatchCall(payload: {
    name: string
    phone: string
    context?: string
    // Optionale Per-Call-Overrides (rueckwaertskompatibel — wenn nicht
    // gesetzt, nimmt der Agent den Default-Prompt aus /admin/prompts).
    system_prompt_override?: string
    greeting_override?: string
  }): Promise<{ roomName: string; status: string }> {
    return voiceFetch<{ roomName: string; status: string }>('/api/dispatch-call', {
      method: 'POST',
      body: payload,
    })
  },
}
