import { NextRequest } from 'next/server'

export function createTestRequest(
  method: string,
  url: string,
  body?: Record<string, unknown> | unknown[],
): NextRequest {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`
  const init: RequestInit = { method }

  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return new NextRequest(fullUrl, init as ConstructorParameters<typeof NextRequest>[1])
}

export function createTestParams(id: string): { params: Promise<{ id: string }> }
export function createTestParams<T extends Record<string, unknown>>(params: T): Promise<T>
export function createTestParams(input: string | Record<string, unknown>): unknown {
  if (typeof input === 'string') {
    return { params: Promise.resolve({ id: input }) }
  }
  return Promise.resolve(input)
}
