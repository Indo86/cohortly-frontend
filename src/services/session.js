// Session persistence: the JWT only, in localStorage.
//
// Security note: localStorage is readable by any script running on this origin, so
// an XSS bug would expose the token. We do not pretend otherwise with client-side
// "encryption" (the key would ship in the bundle). Mitigations: the backend sanitizes
// rich text, tokens expire after one day, and nothing but the token is stored. Identity
// and entitlement are never trusted from storage: they are reloaded from GET /api/me.
const TOKEN_KEY = 'lms.token'

// Storage can be unavailable (private mode, blocked site data): never throw.
export const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const writeToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // the session then simply lasts until the page is closed
  }
}

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // nothing to clear
  }
}
