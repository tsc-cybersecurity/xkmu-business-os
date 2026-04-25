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

type Token =
  | { type: 'atom'; value: string }
  | { type: 'and' }
  | { type: 'or' }
  | { type: 'lparen' }
  | { type: 'rparen' }

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let atomStart = -1

  const flushAtom = (end: number) => {
    if (atomStart >= 0) {
      const value = expr.slice(atomStart, end).trim()
      if (value) tokens.push({ type: 'atom', value })
      atomStart = -1
    }
  }

  while (i < expr.length) {
    const ch = expr[i]
    if (ch === '&' && expr[i + 1] === '&') { flushAtom(i); tokens.push({ type: 'and' }); i += 2; continue }
    if (ch === '|' && expr[i + 1] === '|') { flushAtom(i); tokens.push({ type: 'or' }); i += 2; continue }
    if (ch === '(') { flushAtom(i); tokens.push({ type: 'lparen' }); i += 1; continue }
    if (ch === ')') { flushAtom(i); tokens.push({ type: 'rparen' }); i += 1; continue }
    // Innerhalb '...'-Strings &/| nicht als Operator interpretieren
    if (ch === "'") {
      if (atomStart < 0) atomStart = i
      i += 1
      while (i < expr.length && expr[i] !== "'") i += 1
      if (i < expr.length) i += 1
      continue
    }
    if (atomStart < 0 && !/\s/.test(ch)) atomStart = i
    i += 1
  }
  flushAtom(i)
  return tokens
}

function parseOr(tokens: Token[], scope: Scope, pos: { i: number }): boolean {
  let left = parseAnd(tokens, scope, pos)
  while (pos.i < tokens.length && tokens[pos.i].type === 'or') {
    pos.i += 1
    const right = parseAnd(tokens, scope, pos)
    left = left || right
  }
  return left
}

function parseAnd(tokens: Token[], scope: Scope, pos: { i: number }): boolean {
  let left = parsePrimary(tokens, scope, pos)
  while (pos.i < tokens.length && tokens[pos.i].type === 'and') {
    pos.i += 1
    const right = parsePrimary(tokens, scope, pos)
    left = left && right
  }
  return left
}

function parsePrimary(tokens: Token[], scope: Scope, pos: { i: number }): boolean {
  const tok = tokens[pos.i]
  if (!tok) throw new Error('unexpected end of expression')
  if (tok.type === 'lparen') {
    pos.i += 1
    const val = parseOr(tokens, scope, pos)
    if (tokens[pos.i]?.type !== 'rparen') throw new Error('missing closing paren')
    pos.i += 1
    return val
  }
  if (tok.type === 'atom') {
    pos.i += 1
    return evaluateAtom(tok.value, scope)
  }
  throw new Error(`unexpected token: ${tok.type}`)
}

export function evaluateCondition(condition: string, scope: Scope): boolean {
  if (!condition || !condition.trim()) return true
  try {
    const tokens = tokenize(condition)
    if (tokens.length === 0) return true
    const pos = { i: 0 }
    const result = parseOr(tokens, scope, pos)
    if (pos.i !== tokens.length) {
      logger.warn(`Trailing tokens in condition: ${condition}`, { module: 'WorkflowEngine' })
      return true
    }
    return result
  } catch (err) {
    logger.warn(`Parse error in condition "${condition}": ${err instanceof Error ? err.message : err}`, { module: 'WorkflowEngine' })
    return true
  }
}
