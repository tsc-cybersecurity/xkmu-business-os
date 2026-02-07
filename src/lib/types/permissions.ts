// ============================================
// Module Definitions
// ============================================
export const MODULES = [
  'companies',
  'persons',
  'leads',
  'products',
  'product_categories',
  'ideas',
  'activities',
  'webhooks',
  'users',
  'settings',
  'ai_providers',
  'ai_prompts',
  'ai_logs',
  'api_keys',
  'roles',
] as const

export type Module = (typeof MODULES)[number]

// ============================================
// CRUD Actions
// ============================================
export const ACTIONS = ['create', 'read', 'update', 'delete'] as const
export type Action = (typeof ACTIONS)[number]

// ============================================
// Permission Type
// ============================================
export type PermissionMap = Record<Module, Record<Action, boolean>>

// ============================================
// German Labels
// ============================================
export const MODULE_LABELS: Record<Module, string> = {
  companies: 'Firmen',
  persons: 'Personen',
  leads: 'Leads',
  products: 'Produkte',
  product_categories: 'Produktkategorien',
  ideas: 'Ideen',
  activities: 'Aktivitaeten',
  webhooks: 'Webhooks',
  users: 'Benutzer',
  settings: 'Einstellungen',
  ai_providers: 'KI-Anbieter',
  ai_prompts: 'KI-Prompts',
  ai_logs: 'KI-Logs',
  api_keys: 'API-Schluessel',
  roles: 'Rollen',
}

export const ACTION_LABELS: Record<Action, string> = {
  create: 'Erstellen',
  read: 'Lesen',
  update: 'Bearbeiten',
  delete: 'Loeschen',
}

// ============================================
// Default Role Permission Sets
// ============================================
const allTrue = { create: true, read: true, update: true, delete: true }
const allFalse = { create: false, read: false, update: false, delete: false }
const readOnly = { create: false, read: true, update: false, delete: false }
const readCreate = { create: true, read: true, update: false, delete: false }
const readCreateUpdate = { create: true, read: true, update: true, delete: false }

function buildFullAccess(): Record<Module, Record<Action, boolean>> {
  return Object.fromEntries(MODULES.map((m) => [m, { ...allTrue }])) as Record<
    Module,
    Record<Action, boolean>
  >
}

function buildAdminAccess(): Record<Module, Record<Action, boolean>> {
  return Object.fromEntries(
    MODULES.map((m) => [m, { ...allTrue }])
  ) as Record<Module, Record<Action, boolean>>
}

function buildMemberAccess(): Record<Module, Record<Action, boolean>> {
  const restrictedModules: Module[] = [
    'users',
    'settings',
    'ai_providers',
    'api_keys',
    'webhooks',
    'roles',
  ]
  return Object.fromEntries(
    MODULES.map((m) => {
      if (restrictedModules.includes(m)) return [m, { ...readOnly }]
      return [m, { ...readCreateUpdate }]
    })
  ) as Record<Module, Record<Action, boolean>>
}

function buildViewerAccess(): Record<Module, Record<Action, boolean>> {
  const hiddenModules: Module[] = ['roles', 'api_keys']
  return Object.fromEntries(
    MODULES.map((m) => {
      if (hiddenModules.includes(m)) return [m, { ...allFalse }]
      return [m, { ...readOnly }]
    })
  ) as Record<Module, Record<Action, boolean>>
}

export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  { displayName: string; description: string; permissions: Record<Module, Record<Action, boolean>> }
> = {
  owner: {
    displayName: 'Eigentuemer',
    description: 'Voller Zugriff auf alle Funktionen',
    permissions: buildFullAccess(),
  },
  admin: {
    displayName: 'Administrator',
    description: 'Verwaltung aller Funktionen',
    permissions: buildAdminAccess(),
  },
  member: {
    displayName: 'Mitarbeiter',
    description: 'Zugriff auf operative Funktionen',
    permissions: buildMemberAccess(),
  },
  viewer: {
    displayName: 'Betrachter',
    description: 'Nur-Lese-Zugriff',
    permissions: buildViewerAccess(),
  },
}
