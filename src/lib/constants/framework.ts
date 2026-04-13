// ============================================
// xKMU Framework v2 — Shared Enums & Konstanten
// Quelle: xKMU_AI_Business_Framework_v2.json (shared-Sektion)
// Diese Datei ist die einzige Quelle der Wahrheit fuer alle Enum-Werte.
// ============================================

// ─── Kategorien ───────────────────────────────────────────────────────────────

export const FRAMEWORK_CATEGORIES = [
  { code: 'V',  label: 'Vertrieb' },
  { code: 'M',  label: 'Marketing' },
  { code: 'IT', label: 'IT & Cybersicherheit' },
  { code: 'P',  label: 'Projektmanagement' },
  { code: 'C',  label: 'Compliance & DSGVO' },
  { code: 'F',  label: 'Finanzen' },
  { code: 'HR', label: 'Human Resources' },
  { code: 'Q',  label: 'Qualitaetssicherung' },
] as const

export type FrameworkCategoryCode = typeof FRAMEWORK_CATEGORIES[number]['code']
// => 'V' | 'M' | 'IT' | 'P' | 'C' | 'F' | 'HR' | 'Q'

export type FrameworkCategory = typeof FRAMEWORK_CATEGORIES[number]

// ─── Status Enum ──────────────────────────────────────────────────────────────

export const STATUS_ENUM = ['draft', 'review', 'approved', 'archived'] as const

export type StatusEnum = typeof STATUS_ENUM[number]
// => 'draft' | 'review' | 'approved' | 'archived'

// ─── Automation Level Enum ────────────────────────────────────────────────────

export const AUTOMATION_LEVEL_ENUM = ['manual', 'semi', 'full'] as const

export type AutomationLevelEnum = typeof AUTOMATION_LEVEL_ENUM[number]
// => 'manual' | 'semi' | 'full'

// ─── Executor Enum ────────────────────────────────────────────────────────────

export const EXECUTOR_ENUM = ['agent', 'human', 'flex'] as const

export type ExecutorEnum = typeof EXECUTOR_ENUM[number]
// => 'agent' | 'human' | 'flex'

// ─── Severity Enum ────────────────────────────────────────────────────────────

export const SEVERITY_ENUM = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export type SeverityEnum = typeof SEVERITY_ENUM[number]
// => 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// ─── Execution Log — Entity Types ─────────────────────────────────────────────

export const ENTITY_TYPE_ENUM = ['sop', 'deliverable'] as const

export type EntityTypeEnum = typeof ENTITY_TYPE_ENUM[number]
// => 'sop' | 'deliverable'

// ─── Execution Log — Executed By ──────────────────────────────────────────────

export const EXECUTED_BY_ENUM = ['agent', 'human'] as const

export type ExecutedByEnum = typeof EXECUTED_BY_ENUM[number]

// ─── Execution Log — Status ───────────────────────────────────────────────────

export const EXECUTION_STATUS_ENUM = ['completed', 'aborted', 'escalated'] as const

export type ExecutionStatusEnum = typeof EXECUTION_STATUS_ENUM[number]

// ─── Hilfsfunktion: Kategorie-Label nachschlagen ──────────────────────────────

export function getCategoryLabel(code: FrameworkCategoryCode): string {
  return FRAMEWORK_CATEGORIES.find((c) => c.code === code)?.label ?? code
}
