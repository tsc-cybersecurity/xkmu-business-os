import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    // Endpoint-specific extras (e.g. aggregated stats for the task queue).
    // Kept as a loose record so individual routes can attach what they need.
    [key: string]: unknown
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Array<{
      field: string
      message: string
    }>
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function apiSuccess<T>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta'],
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  }
  if (meta) {
    response.meta = meta
  }
  return NextResponse.json(response, { status })
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: ApiErrorResponse['error']['details']
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  }
  if (details) {
    response.error.details = details
  }
  return NextResponse.json(response, { status })
}

export function apiNotFound(message = 'Resource not found'): NextResponse<ApiErrorResponse> {
  return apiError('NOT_FOUND', message, 404)
}

export function apiUnauthorized(message = 'Unauthorized'): NextResponse<ApiErrorResponse> {
  return apiError('UNAUTHORIZED', message, 401)
}

export function apiForbidden(message = 'Forbidden'): NextResponse<ApiErrorResponse> {
  return apiError('FORBIDDEN', message, 403)
}

export function apiValidationError(
  details: ApiErrorResponse['error']['details']
): NextResponse<ApiErrorResponse> {
  return apiError('VALIDATION_ERROR', 'Validation failed', 400, details)
}

export function apiServerError(message = 'Internal server error'): NextResponse<ApiErrorResponse> {
  return apiError('INTERNAL_ERROR', message, 500)
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  items: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Parse JSON body with size limit validation.
 * Returns parsed body or an error response if body exceeds maxBytes.
 */
export async function parseBodyWithLimit(
  request: Request,
  maxBytes = 1_048_576 // 1MB default
): Promise<{ data: Record<string, unknown> } | { error: NextResponse<ApiErrorResponse> }> {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return { error: apiError('PAYLOAD_TOO_LARGE', `Request body exceeds ${Math.round(maxBytes / 1024)}KB limit`, 413) }
  }
  try {
    const data = await request.json()
    return { data }
  } catch {
    return { error: apiError('INVALID_BODY', 'Invalid JSON body', 400) }
  }
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  return {
    page: Math.max(1, page),
    limit: Math.max(1, limit),
  }
}

export function calculatePagination(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}
