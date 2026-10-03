import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { routes } from './routes.js'
import { installRouteFocus } from './focus.js'
import { resolveNavigation } from './guards.js'

// Pinia must be installed before the first navigation: the guard reads the auth store.
export const createAppRouter = (history = createWebHistory()) => {
  const router = createRouter({
    history,
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })

  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    // restore the session (GET /api/me) before any decision is made, so protected
    // content never flashes and refresh / direct links behave like in-app navigation
    await auth.initialize()

    return resolveNavigation(to, auth)
  })

  // page title + focus management after every navigation (see router/focus.js)
  installRouteFocus(router)

  return router
}
