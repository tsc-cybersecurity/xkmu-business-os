import { logger } from '@/lib/utils/logger'

export type Scope = {
  triggerData: Record<string, unknown>
  actionResults: Record<string, unknown>
}

export function resolvePath(path: string, scope: Scope): unknown {
  const parts = path.split('.')
  let cur: unknown
  if (parts[0] === 'data') cur = scope.triggerData
  else if (parts[0] === 'steps') cur = scope.actionResults
  else return undefined
  for (let i = 1; i < parts.length; i++) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[parts[i]]
  }
  return cur
}

const PATH = String.raw`(?:data|steps)(?:\.\w+)+`

/**
 * Evaluiert einen atomaren Vergleich (kein && / || / Klammern).
 * Patterns: 8 Stück (siehe Phase-2-Spec).
 */
function evaluateAtom(atom: string, scope: Scope): boolean {
  const expr = atom.trim()
  if (!expr) return true

  // == null / != null
  let m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=)\\s*null$`))
  if (m) {
    const val = resolvePath(m[1], scope)
    const isNullish = val === null || val === undefined || val === ''
    return m[2] === '==' ? isNullish : !isNullish
  }

  // == 'value' / != 'value'
  m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=)\\s*'([^']*)'$`))
  if (m) {
    const val = resolvePath(m[1], scope)
    return m[2] === '==' ? String(val) === m[3] : String(val) !== m[3]
  }

  // numerische Operatoren
  m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=|>=|<=|>|<)\\s*(-?\\d+(?:\\.\\d+)?)$`))
  if (m) {
    const raw = resolvePath(m[1], scope)
    const val = Number(raw)
    const num = Number(m[3])
    if (Number.isNaN(val)) return false
    switch (m[2]) {
      case '==': return val === num
      case '!=': return val !== num
      case '>':  return val > num
      case '>=': return val >= num
      case '<':  return val < num
      case '<=': return val <= num
    }
  }

  // truthy
  m = expr.match(new RegExp(`^(${PATH})$`))
  if (m) {
    const val = resolvePath(m[1], scope)
    if (val == null || val === '' || val === false || val === 0) return false
    if (Array.isArray(val) && val.length === 0) return false
    return true
  }

  logger.warn(`Unknown condition atom: ${expr}`, { module: 'WorkflowEngine' })
  return true
}

/**
 * Boolean-Composer kommt in Task 3. Diese Initial-Version delegiert
 * nur an evaluateAtom — Phase-2-Cases müssen weiter funktionieren.
 */
export function evaluateCondition(condition: string, scope: Scope): boolean {
  if (!condition || !condition.trim()) return true
  try {
    return evaluateAtom(condition, scope)
  } catch {
    return true
  }
}
