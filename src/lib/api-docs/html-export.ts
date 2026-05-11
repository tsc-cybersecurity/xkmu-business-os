import type { ApiService, ApiEndpoint } from './types'
import { buildCurlExample, buildFetchExample, buildPythonExample } from './code-examples'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function anchorSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function methodColor(m: string): string {
  switch (m) {
    case 'GET': return '#16a34a'
    case 'POST': return '#2563eb'
    case 'PUT': return '#f97316'
    case 'PATCH': return '#9333ea'
    case 'DELETE': return '#dc2626'
    default: return '#6b7280'
  }
}

function renderEndpoint(e: ApiEndpoint, baseUrl: string): string {
  const id = anchorSlug(`${e.method}-${e.path}`)
  const params = e.params && e.params.length > 0
    ? `<table class="params">
        <thead><tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
          ${e.params.map(p => `<tr>
            <td><code>${esc(p.name)}</code></td>
            <td>${esc(p.in)}</td>
            <td>${esc(p.type)}</td>
            <td>${p.required ? '<span class="req">required</span>' : 'optional'}</td>
            <td>${esc(p.description)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    : ''
  const body = e.requestBody ? `<h4>Request Body</h4><pre><code>${esc(JSON.stringify(e.requestBody, null, 2))}</code></pre>` : ''
  const resp = e.response ? `<h4>Response Example</h4><pre><code>${esc(JSON.stringify(e.response, null, 2))}</code></pre>` : ''
  return `
  <article id="${id}" class="endpoint">
    <header>
      <span class="method" style="background:${methodColor(e.method)}">${e.method}</span>
      <code class="path">${esc(e.path)}</code>
    </header>
    <h3>${esc(e.summary)}</h3>
    ${e.description ? `<p class="desc">${esc(e.description)}</p>` : ''}
    ${params}
    ${body}
    ${resp}
    <h4>cURL</h4>
    <pre><code>${esc(buildCurlExample(e, baseUrl))}</code></pre>
    <h4>JavaScript (fetch)</h4>
    <pre><code>${esc(buildFetchExample(e, baseUrl))}</code></pre>
    <h4>Python (requests)</h4>
    <pre><code>${esc(buildPythonExample(e, baseUrl))}</code></pre>
  </article>`
}

function renderService(s: ApiService, baseUrl: string): string {
  return `
  <section id="svc-${esc(s.slug)}" class="service">
    <h2>${esc(s.name)}</h2>
    <div class="meta">
      <span>Base: <code>${esc(s.basePath)}</code></span>
      <span class="auth-badge auth-${esc(s.auth)}">${esc(s.auth)}</span>
      <span>${s.endpoints.length} Endpoints</span>
    </div>
    <p class="desc">${esc(s.description)}</p>
    ${s.endpoints.map(e => renderEndpoint(e, baseUrl)).join('')}
  </section>`
}

const CSS = `
  * { box-sizing: border-box }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #0f172a; margin: 0; background: #f8fafc }
  .layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh }
  nav { position: sticky; top: 0; height: 100vh; overflow-y: auto; background: white; border-right: 1px solid #e2e8f0; padding: 16px }
  nav h1 { font-size: 16px; margin: 0 0 4px }
  nav .sub { font-size: 11px; color: #64748b; margin-bottom: 16px }
  nav ul { list-style: none; padding: 0; margin: 0 }
  nav li a { display: block; padding: 6px 8px; color: #475569; text-decoration: none; font-size: 13px; border-radius: 4px }
  nav li a:hover { background: #f1f5f9; color: #0f172a }
  main { padding: 32px 48px; max-width: 1100px }
  h1.title { font-size: 28px; margin: 0 0 4px }
  .top-meta { font-size: 12px; color: #64748b; margin-bottom: 32px }
  section.service { margin-bottom: 64px; padding-top: 16px; border-top: 2px solid #e2e8f0 }
  section.service h2 { font-size: 22px; margin: 0 0 8px }
  .meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #64748b; margin-bottom: 12px }
  .auth-badge { padding: 2px 8px; border-radius: 4px; font-weight: 600 }
  .auth-public { background: #dcfce7; color: #15803d }
  .auth-session { background: #dbeafe; color: #1e40af }
  .auth-api-key { background: #fef3c7; color: #92400e }
  .desc { font-size: 14px; color: #475569; margin: 0 0 16px }
  article.endpoint { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 16px }
  article.endpoint header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap }
  .method { color: white; font-family: ui-monospace, monospace; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600 }
  .path { font-family: ui-monospace, monospace; font-size: 13px; font-weight: 600 }
  article.endpoint h3 { font-size: 15px; margin: 0 0 4px; font-weight: 600 }
  article.endpoint h4 { font-size: 12px; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b }
  article.endpoint pre { background: #0f172a; color: #e2e8f0; padding: 12px 16px; border-radius: 6px; overflow-x: auto; font-size: 12px; margin: 0 }
  article.endpoint pre code { font-family: ui-monospace, monospace }
  table.params { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px }
  table.params th { text-align: left; background: #f1f5f9; padding: 6px 8px; font-weight: 600 }
  table.params td { padding: 6px 8px; border-top: 1px solid #e2e8f0 }
  table.params td code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px }
  .req { color: #dc2626; font-weight: 600 }
  @media print { nav { display: none } main { padding: 16px } article.endpoint { break-inside: avoid } section.service { break-before: page } }
`

export function buildStandaloneHtml(services: ApiService[], baseUrl: string, generatedAt: Date = new Date()): string {
  const totalEndpoints = services.reduce((sum, s) => sum + s.endpoints.length, 0)
  const toc = services.map(s => `<li><a href="#svc-${esc(s.slug)}">${esc(s.name)} <span style="color:#94a3b8">(${s.endpoints.length})</span></a></li>`).join('')
  const body = services.map(s => renderService(s, baseUrl)).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>xKMU API-Dokumentation</title>
<style>${CSS}</style>
</head>
<body>
<div class="layout">
  <nav>
    <h1>API-Doku</h1>
    <div class="sub">${services.length} Services · ${totalEndpoints} Endpoints</div>
    <ul>${toc}</ul>
  </nav>
  <main>
    <h1 class="title">xKMU API-Dokumentation</h1>
    <div class="top-meta">
      Base URL: <code>${esc(baseUrl)}</code>
      &middot; ${services.length} Services
      &middot; ${totalEndpoints} Endpoints
      &middot; Generiert: ${generatedAt.toISOString().slice(0, 19).replace('T', ' ')}
    </div>
    ${body}
  </main>
</div>
</body>
</html>`
}
