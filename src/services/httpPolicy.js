import { Access } from '@/constants/access.js'
import { roleHome, signInRouteFor } from '@/router/guards.js'
import { httpHandlers } from './http.js'

// The central reaction to the two backend answers that change what the user may see.
// Everything else (400/422, 404, 409, 5xx, network errors, other 403s) is deliberately
// NOT handled here: it never touches the session and is shown by the page that asked.
//
//   401                      the token is not valid -> forget the session, go to sign-in
//   403 ACCESS_NOT_ACTIVE /  signed in, workspace not active -> KEEP the session, record the
//   403 WORKSPACE_ACCESS_    state the backend reported and move to the page for it
//       INACTIVE             (instructor: billing, student: workspace inactive)
export const installHttpPolicy = ({ auth, router, handlers = httpHandlers }) => {
  handlers.onUnauthorized = () => {
    auth.clearSession()

    const current = router.currentRoute.value

    if (current.meta.requiresAuth) {
      router.replace({
        name: signInRouteFor(current.meta.role),
        query: { redirect: current.fullPath },
      })
    }
  }

  handlers.onEntitlementInactive = (error) => {
    auth.applyEntitlement({
      accessStatus: error.accessStatus ?? Access.NONE,
      accessExpiresAt: error.accessExpiresAt,
    })

    const current = router.currentRoute.value

    if (current.meta.requiresActiveAccess) router.replace({ name: roleHome(auth) })
  }
}
