import { R } from '@/constants/routes.js'
import { Roles } from '@/constants/roles.js'

// Where an authenticated user belongs right now. Inactive users land on the one page
// that exists for their situation, which has no access requirement itself, so
// redirects can never loop.
export const roleHome = (auth) => {
  if (auth.isInstructor) return auth.isActive ? R.INSTRUCTOR_DASHBOARD : R.INSTRUCTOR_BILLING
  if (auth.isStudent) return auth.isActive ? R.STUDENT_DASHBOARD : R.STUDENT_WORKSPACE_INACTIVE

  return R.HOME
}

export const signInRouteFor = (role) =>
  role === Roles.STUDENT ? R.STUDENT_SIGN_IN : R.INSTRUCTOR_SIGN_IN

// Route meta understood by the guard:
//   guestOnly            only for anonymous users
//   requiresAuth         needs a session
//   role                 needs this product role
//   requiresActiveAccess needs an ACTIVE workspace (instructor: own, student: their instructor's)
//   onlyWhenInactive     the "your workspace is inactive" page for students
//
// Pure function: returns true to allow, or a route location to redirect to.
export const resolveNavigation = (to, auth) => {
  const meta = to.meta ?? {}
  const authenticated = auth.isAuthenticated

  // a token exists but the backend could not be asked who it belongs to: do not guess
  if (auth.sessionState === 'unavailable') {
    const needsKnowledge = meta.requiresAuth || meta.guestOnly || to.name === R.HOME

    return needsKnowledge && to.name !== R.UNAVAILABLE
      ? { name: R.UNAVAILABLE, query: { redirect: to.fullPath } }
      : true
  }

  // the "service unavailable" page only makes sense while it is unavailable
  if (to.name === R.UNAVAILABLE) return authenticated ? { name: roleHome(auth) } : { name: R.HOME }

  if (to.name === R.HOME && authenticated) return { name: roleHome(auth) }

  if (meta.guestOnly && authenticated) return { name: roleHome(auth) }

  if (meta.requiresAuth && !authenticated) {
    return { name: signInRouteFor(meta.role), query: { redirect: to.fullPath } }
  }

  if (meta.role && auth.role !== meta.role) return { name: roleHome(auth) }

  if (meta.requiresActiveAccess && !auth.isActive) {
    return { name: auth.isInstructor ? R.INSTRUCTOR_BILLING : R.STUDENT_WORKSPACE_INACTIVE }
  }

  if (meta.onlyWhenInactive && auth.isActive) return { name: roleHome(auth) }

  return true
}
