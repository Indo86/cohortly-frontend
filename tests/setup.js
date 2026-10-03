import { afterEach, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { httpHandlers } from '@/services/http.js'
import { clearToasts } from '@/composables/useToast.js'
import { restoreApi } from './fakeApi.js'

// mounted apps are removed after each test, so dialogs and focus never leak between tests
enableAutoUnmount(afterEach)

// jsdom does not implement scrolling; the router's scrollBehavior calls it
window.scrollTo = vi.fn()

// every test starts with no stored session, no fake backend and no leftover mocks
afterEach(() => {
  localStorage.clear()
  restoreApi()
  // toasts live in module state: none may leak into the next test
  clearToasts()
  // an app that installed the real HTTP policy must not leak its handlers into the next test
  httpHandlers.onUnauthorized = () => {}
  httpHandlers.onEntitlementInactive = () => {}
  vi.restoreAllMocks()
  window.scrollTo = vi.fn()
})
