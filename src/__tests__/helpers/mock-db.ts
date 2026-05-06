import { vi } from 'vitest'

function createChainMockManager() {
  let defaultResolveValue: unknown = []
  const resolveQueue: unknown[] = []

  function createFreshChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {}

    const chainMethods = [
      'from', 'where', 'values', 'returning', 'limit',
      'offset', 'orderBy', 'set', 'leftJoin', 'innerJoin', 'groupBy',
      '$dynamic', 'onConflictDoUpdate', 'onConflictDoNothing',
    ]

    for (const method of chainMethods) {
      chain[method] = vi.fn().mockImplementation(() => chain)
    }

    const myResolveValue = resolveQueue.length > 0
      ? resolveQueue.shift()
      : defaultResolveValue

    chain.then = function (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(myResolveValue).then(onFulfilled, onRejected)
    }

    return chain
  }

  const manager = {
    createFreshChain,
    mockResolvedValue(value: unknown) {
      defaultResolveValue = value
      return manager
    },
    mockResolvedValueOnce(value: unknown) {
      resolveQueue.push(value)
      return manager
    },
  }
  return manager
}

export function setupDbMock() {
  const insertMock = createChainMockManager()
  const selectMock = createChainMockManager()
  const updateMock = createChainMockManager()
  const deleteMock = createChainMockManager()

  const executeMock = vi.fn().mockResolvedValue(undefined)

  const db = {
    insert: vi.fn().mockImplementation(() => insertMock.createFreshChain()),
    select: vi.fn().mockImplementation(() => selectMock.createFreshChain()),
    update: vi.fn().mockImplementation(() => updateMock.createFreshChain()),
    delete: vi.fn().mockImplementation(() => deleteMock.createFreshChain()),
    execute: executeMock,
  }

  const mockTransaction = vi.fn().mockImplementation(async (cb: (tx: unknown) => unknown) => cb(db))
  ;(db as Record<string, unknown>).transaction = mockTransaction

  vi.doMock('@/lib/db', () => ({ db }))

  return {
    db,
    // Primary names (used by newer tests)
    insertMock,
    selectMock,
    updateMock,
    deleteMock,
    executeMock,
    // Legacy aliases (used by older tests)
    mockInsert: insertMock,
    mockSelect: selectMock,
    mockUpdate: updateMock,
    mockDelete: deleteMock,
    mockTransaction,
  }
}
