import axios from 'axios'
import { ErrorKind, normalizeError } from './apiError.js'
import { readToken } from './session.js'

// The HTTP policy is installed at startup (services/httpPolicy.js) so this module
// stays free of store and router imports.
export const httpHandlers = {
  onUnauthorized: () => {},
  onEntitlementInactive: () => {},
}

// The one place that talks HTTP. Behaviour:
//  - Authorization: JWT <token> on every request when a session exists
//  - JSON by default; FormData is sent as multipart by Axios (no manual Content-Type)
//  - every failure is rejected as a normalized ApiError with the backend details kept
//  - 401 and entitlement 403 are reported to the policy handlers; nothing else is
//    handled globally (400, 404, 409, 5xx and network errors stay with the caller and
//    NEVER touch the session)
// A request can set `skipAuthHandling: true` when a 401 is an expected answer
// (wrong credentials on sign-in).
export const createHttpClient = ({
  baseURL,
  timeout = 15000,
  getToken = readToken,
  handlers = httpHandlers,
  adapter,
} = {}) => {
  const client = axios.create({
    baseURL: baseURL?.replace(/\/+$/, ''),
    timeout,
    adapter,
    headers: { Accept: 'application/json' },
  })

  client.interceptors.request.use((config) => {
    const token = getToken()

    if (token) config.headers.Authorization = `JWT ${token}`

    return config
  })

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError = normalizeError(error)

      if (apiError.kind === ErrorKind.AUTH && !error?.config?.skipAuthHandling) {
        handlers.onUnauthorized(apiError)
      } else if (apiError.kind === ErrorKind.ENTITLEMENT) {
        handlers.onEntitlementInactive(apiError)
      }

      return Promise.reject(apiError)
    }
  )

  return client
}

export const api = createHttpClient({ baseURL: import.meta.env.VITE_API_URL })
