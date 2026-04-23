import { NextRequest } from 'next/server'

export function createTestRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
): NextRequest {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`
  const init: RequestInit = { method }

  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return new NextRequest(fullUrl, init as ConstructorParameters<typeof NextRequest>[1])
}

export function createTestParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}
