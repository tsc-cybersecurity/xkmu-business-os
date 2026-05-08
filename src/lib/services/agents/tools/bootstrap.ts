/**
 * Tool-Registry Bootstrap — registriert die 4 Built-in Adapter.
 * Idempotent: mehrfacher Aufruf ueberschreibt nur, registriert keine Duplikate.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import { ToolRegistry } from '../tool-registry'
import { memoryToolAdapter } from './memory-adapter'
import { workflowToolAdapter } from './workflow-adapter'
import { promptToolAdapter } from './prompt-adapter'
import { serviceToolAdapter } from './service-adapter'

let initialized = false

export function initializeToolRegistry(): void {
  if (initialized) return
  ToolRegistry.register(memoryToolAdapter)
  ToolRegistry.register(workflowToolAdapter)
  ToolRegistry.register(promptToolAdapter)
  ToolRegistry.register(serviceToolAdapter)
  initialized = true
}

export function isToolRegistryInitialized(): boolean {
  return initialized
}
