export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type AuthType = 'session' | 'api-key' | 'public'

export interface ApiParam {
  name: string
  in: 'query' | 'path' | 'body' | 'header'
  required: boolean
  type: string
  description: string
  example?: string
}

export interface ApiEndpoint {
  method: HttpMethod
  path: string
  summary: string
  description?: string
  params?: ApiParam[]
  requestBody?: Record<string, unknown>
  response?: Record<string, unknown>
  curl: string
}

export interface ApiService {
  name: string
  slug: string
  description: string
  basePath: string
  auth: AuthType
  endpoints: ApiEndpoint[]
}

export interface DiscoveredAuth {
  type: AuthType
  /** Falls per withPermission(req, 'module', 'action', ...) erkannt — sonst null */
  module: string | null
  action: string | null
}

/** Endpoint, der durch Filesystem-Scan von src/app/api/**\/route.ts entdeckt wurde */
export interface DiscoveredEndpoint {
  method: HttpMethod
  path: string
  auth: DiscoveredAuth | null
  /** Quelldatei relativ zum Projekt-Root */
  file: string
}
