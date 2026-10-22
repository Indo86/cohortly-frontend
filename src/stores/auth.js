import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { Access, normalizeAccess } from '@/constants/access.js'
import { ROLE_LABELS, Roles, normalizeRole } from '@/constants/roles.js'
import * as authService from '@/services/authService.js'
import { ErrorKind, normalizeError } from '@/services/apiError.js'
import { clearToken, readToken, writeToken } from '@/services/session.js'

// Session and entitlement state. Authentication (who you are) and entitlement (whether
// your workspace is active) are separate fields, and both come from the backend:
//   - the token is the only thing persisted;
//   - identity, role and entitlement are reloaded from GET /api/me on every page load.
//
// initState: idle -> loading -> ready | unavailable
//   unavailable = a token exists but /api/me could not be answered (network or server
//   error). The session is NOT discarded; the user can retry.
//
// sessionState (derived):
//   uninitialized | unavailable | anonymous | authenticated-inactive | authenticated-active
export const useAuthStore = defineStore('auth', () => {
  const token = ref(readToken())
  const user = ref(null) // { name, email, photoUrl }
  const rawRole = ref(null) // backend value ("manager" | "student"); use `role` in the UI
  const role = ref(null) // normalized product role
  const accessStatus = ref(Access.NONE)
  const accessStartsAt = ref(null)
  const accessExpiresAt = ref(null)
  const initState = ref('idle')

  let initPromise = null

  const isAuthenticated = computed(() => Boolean(token.value && user.value && role.value))
  const isInstructor = computed(() => isAuthenticated.value && role.value === Roles.INSTRUCTOR)
  const isStudent = computed(() => isAuthenticated.value && role.value === Roles.STUDENT)
  const isActive = computed(() => isAuthenticated.value && accessStatus.value === Access.ACTIVE)
  // an instructor who must pay (or renew) before using the product
  const needsPayment = computed(() => isInstructor.value && !isActive.value)
  // a student whose instructor's workspace is not active
  const hasInactiveWorkspace = computed(() => isStudent.value && !isActive.value)
  const roleLabel = computed(() => (role.value ? ROLE_LABELS[role.value] : ''))

  const sessionState = computed(() => {
    if (initState.value === 'idle' || initState.value === 'loading') return 'uninitialized'
    if (initState.value === 'unavailable') return 'unavailable'
    if (!isAuthenticated.value) return 'anonymous'

    return isActive.value ? 'authenticated-active' : 'authenticated-inactive'
  })

  const applyEntitlement = (data = {}) => {
    if ('accessStatus' in data) accessStatus.value = normalizeAccess(data.accessStatus)
    if ('accessStartsAt' in data) accessStartsAt.value = data.accessStartsAt ?? null
    if ('accessExpiresAt' in data) accessExpiresAt.value = data.accessExpiresAt ?? null
  }

  const applyIdentity = (data) => {
    const normalized = normalizeRole(data.role)

    if (!normalized) throw new Error('This account type is not supported.')

    user.value = { name: data.name, email: data.email, photoUrl: data.photo_url ?? null }
    rawRole.value = data.role
    role.value = normalized
    applyEntitlement({
      accessStatus: data.accessStatus,
      accessStartsAt: data.accessStartsAt,
      accessExpiresAt: data.accessExpiresAt,
    })
  }

  // After the user changed their own avatar: the identity is otherwise only reloaded from /api/me.
  const setPhotoUrl = (photoUrl) => {
    if (user.value) user.value = { ...user.value, photoUrl: photoUrl ?? null }
  }

  // Forgets the session locally (there is no server-side logout: tokens are stateless).
  const clearSession = () => {
    clearToken()
    token.value = null
    user.value = null
    rawRole.value = null
    role.value = null
    accessStatus.value = Access.NONE
    accessStartsAt.value = null
    accessExpiresAt.value = null
  }

  // Reloads identity and entitlement. A 401 ends the session; any other failure keeps it.
  const fetchMe = async () => {
    let data

    try {
      data = await authService.fetchMe()
    } catch (error) {
      const apiError = normalizeError(error)

      if (apiError.kind === ErrorKind.AUTH) clearSession()

      throw apiError
    }

    try {
      applyIdentity(data)
    } catch (error) {
      // a role this app does not know: do not keep a session we cannot use
      clearSession()
      throw error
    }
  }

  // Called once at startup (and again for "retry"): resolves when the state is known.
  // 'unavailable' is also a settled answer: it is only asked again by retryInitialize(),
  // so the redirect to the "unavailable" page cannot trigger another request by itself.
  const initialize = () => {
    if (initState.value === 'ready' || initState.value === 'unavailable') return Promise.resolve()
    if (initPromise) return initPromise

    initPromise = (async () => {
      initState.value = 'loading'

      if (!token.value) {
        clearSession()
        initState.value = 'ready'

        return
      }

      try {
        await fetchMe()
        initState.value = 'ready'
      } catch (error) {
        // 401: fetchMe already cleared the session -> anonymous.
        // Anything else: we cannot tell, so keep the token and report "unavailable".
        initState.value = normalizeError(error).kind === ErrorKind.AUTH || !token.value ? 'ready' : 'unavailable'
      }
    })().finally(() => {
      initPromise = null
    })

    return initPromise
  }

  // "Try again" after the backend could not be reached at startup.
  const retryInitialize = () => {
    if (initState.value === 'unavailable') initState.value = 'idle'

    return initialize()
  }

  // Valid credentials always succeed, whatever the entitlement is.
  const signIn = async (credentials) => {
    const data = await authService.signIn(credentials)

    applyIdentity(data)
    token.value = data.token
    writeToken(data.token)
    initState.value = 'ready'

    return { role: role.value, accessStatus: accessStatus.value }
  }

  const logout = () => {
    clearSession()
    initState.value = 'ready'
  }

  return {
    token,
    user,
    rawRole,
    role,
    accessStatus,
    accessStartsAt,
    accessExpiresAt,
    initState,
    isAuthenticated,
    isInstructor,
    isStudent,
    isActive,
    needsPayment,
    hasInactiveWorkspace,
    roleLabel,
    sessionState,
    initialize,
    retryInitialize,
    fetchMe,
    signIn,
    logout,
    clearSession,
    applyEntitlement,
    setPhotoUrl,
  }
})
