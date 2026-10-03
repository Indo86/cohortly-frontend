import { EntitlementCodes } from '@/constants/access.js'

// Every failed request reaches the application as an ApiError, whatever went wrong.
// Backend details (message, code, errors, accessStatus, accessExpiresAt) are kept.
export const ErrorKind = Object.freeze({
  NETWORK: 'network', // no response: server down, offline, CORS, timeout
  AUTH: 'auth', // 401: the credentials/token are not valid
  ENTITLEMENT: 'entitlement', // 403 + entitlement code: signed in, workspace not active
  FORBIDDEN: 'forbidden', // any other 403: not allowed to do this
  VALIDATION: 'validation', // 400 / 422: the input or business rule was rejected
  NOT_FOUND: 'not-found', // 404
  CONFLICT: 'conflict', // 409
  SERVER: 'server', // 5xx, including payment provider errors (502/503)
  UNKNOWN: 'unknown',
})

const FALLBACK_MESSAGES = {
  [ErrorKind.NETWORK]: 'Cannot reach the server. Check your connection and try again.',
  [ErrorKind.AUTH]: 'Your session is not valid. Please sign in again.',
  [ErrorKind.ENTITLEMENT]: 'This workspace does not currently have access.',
  [ErrorKind.FORBIDDEN]: 'You are not allowed to do this.',
  [ErrorKind.VALIDATION]: 'Some of the information is not valid.',
  [ErrorKind.NOT_FOUND]: 'We could not find what you were looking for.',
  [ErrorKind.CONFLICT]: 'This conflicts with existing data.',
  [ErrorKind.SERVER]: 'The server had a problem. Please try again in a moment.',
  [ErrorKind.UNKNOWN]: 'Something went wrong. Please try again.',
}

export class ApiError extends Error {
  constructor({ kind, status = null, message, code = null, errors = [], accessStatus = null, accessExpiresAt = null }) {
    super(message ?? FALLBACK_MESSAGES[kind])
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
    this.errors = errors
    this.accessStatus = accessStatus
    this.accessExpiresAt = accessExpiresAt
  }
}

const kindFor = (status, code) => {
  if (status === 401) return ErrorKind.AUTH
  if (status === 403) {
    return Object.values(EntitlementCodes).includes(code) ? ErrorKind.ENTITLEMENT : ErrorKind.FORBIDDEN
  }
  if (status === 400 || status === 413 || status === 422) return ErrorKind.VALIDATION
  if (status === 404) return ErrorKind.NOT_FOUND
  if (status === 409) return ErrorKind.CONFLICT
  if (status >= 500) return ErrorKind.SERVER
  return ErrorKind.UNKNOWN
}

// Turns an Axios error (or anything thrown) into an ApiError. Idempotent.
export const normalizeError = (error) => {
  if (error instanceof ApiError) return error

  const response = error?.response

  if (!response) {
    return new ApiError({ kind: error?.code === 'ERR_CANCELED' ? ErrorKind.UNKNOWN : ErrorKind.NETWORK })
  }

  const body = response.data && typeof response.data === 'object' ? response.data : {}
  const kind = kindFor(response.status, body.code)

  return new ApiError({
    kind,
    status: response.status,
    message: typeof body.message === 'string' ? body.message : undefined,
    code: body.code ?? null,
    errors: Array.isArray(body.errors) ? body.errors : [],
    accessStatus: body.accessStatus ?? null,
    accessExpiresAt: body.accessExpiresAt ?? null,
  })
}

// Backend validation errors ([{ path, message }]) as { path: message } for forms.
export const fieldErrors = (error) => {
  const result = {}

  for (const item of error?.errors ?? []) {
    if (item?.path && !(item.path in result)) result[item.path] = item.message
  }

  return result
}
