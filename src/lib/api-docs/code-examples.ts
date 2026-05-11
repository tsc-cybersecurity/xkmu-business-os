import type { ApiEndpoint } from './types'

function bodyForExample(endpoint: ApiEndpoint): string | null {
  if (!endpoint.requestBody) return null
  return JSON.stringify(endpoint.requestBody, null, 2)
}

function isMutation(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH'
}

export function buildCurlExample(endpoint: ApiEndpoint, baseUrl: string): string {
  if (endpoint.curl?.trim()) {
    return endpoint.curl.replace(/https:\/\/example\.com/g, baseUrl.replace(/\/$/, ''))
  }
  const body = bodyForExample(endpoint)
  const lines: string[] = [`curl -X ${endpoint.method} ${baseUrl.replace(/\/$/, '')}${endpoint.path} \\`]
  lines.push('  -H "Content-Type: application/json" \\')
  lines.push('  -b cookies.txt' + (body ? ' \\' : ''))
  if (body) {
    const escaped = body.replace(/'/g, `'\\''`)
    lines.push(`  -d '${escaped}'`)
  }
  return lines.join('\n')
}

export function buildFetchExample(endpoint: ApiEndpoint, baseUrl: string): string {
  const body = bodyForExample(endpoint)
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint.path}`
  const opts: string[] = [`  method: '${endpoint.method}'`]
  opts.push(`  credentials: 'include'`)
  if (isMutation(endpoint.method) || body) {
    opts.push(`  headers: { 'Content-Type': 'application/json' }`)
  }
  if (body) {
    const indented = body.split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n')
    opts.push(`  body: JSON.stringify(${indented})`)
  }
  return [
    `const res = await fetch('${url}', {`,
    opts.join(',\n'),
    `})`,
    `const data = await res.json()`,
  ].join('\n')
}

export function buildPythonExample(endpoint: ApiEndpoint, baseUrl: string): string {
  const body = bodyForExample(endpoint)
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint.path}`
  const lines: string[] = [`import requests`, ``]
  if (body) {
    lines.push(`payload = ${body.replace(/: true/g, ': True').replace(/: false/g, ': False').replace(/: null/g, ': None')}`)
    lines.push(``)
  }
  const method = endpoint.method.toLowerCase()
  const args: string[] = [`"${url}"`]
  args.push(`cookies={"session": "<your-session-cookie>"}`)
  if (body) args.push(`json=payload`)
  lines.push(`res = requests.${method}(`)
  lines.push(`    ${args.join(',\n    ')},`)
  lines.push(`)`)
  lines.push(`data = res.json()`)
  return lines.join('\n')
}

export type CodeLang = 'curl' | 'fetch' | 'python'

export function buildExample(endpoint: ApiEndpoint, lang: CodeLang, baseUrl: string): string {
  switch (lang) {
    case 'curl': return buildCurlExample(endpoint, baseUrl)
    case 'fetch': return buildFetchExample(endpoint, baseUrl)
    case 'python': return buildPythonExample(endpoint, baseUrl)
  }
}
