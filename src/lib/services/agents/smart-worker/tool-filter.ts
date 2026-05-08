/**
 * Wildcard-Matching fuer agent_definitions.allowedTools.
 * Patterns: 'memory:search' (exakt), 'memory:*' (alle Namespace-Tools),
 * 'prompt:lead_*' (Praefix), '*' (alle).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1 (Tool-Whitelisting)
 */

import type { ToolDescriptor } from '../tool-registry'

function patternToRegex(pattern: string): RegExp {
  // '.' und andere Regex-Sonderzeichen escapen, '*' zu '.*'
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const withGlob = escaped.replace(/\*/g, '.*')
  return new RegExp(`^${withGlob}$`)
}

export function matchesWhitelist(toolRaw: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false
  return patterns.some((p) => patternToRegex(p).test(toolRaw))
}

export function filterToolsByWhitelist(tools: ToolDescriptor[], patterns: string[]): ToolDescriptor[] {
  return tools.filter((t) => matchesWhitelist(t.ref.raw, patterns))
}
