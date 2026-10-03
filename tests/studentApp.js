import { flushPromises, mount } from '@vue/test-utils'
import App from '@/App.vue'
import { bindCacheToSession } from '@/queryClient.js'
import { installHttpPolicy } from '@/services/httpPolicy.js'
import { createTestApp, student } from './helpers.js'

// Opens the REAL app (router, layouts, pages, query client, HTTP policy) at `path`, signed in
// as a student, talking to the fake backend defined by `routes`. The policy is installed like
// in main.js, so a 403 WORKSPACE_ACCESS_INACTIVE moves the student exactly as in production.
// (tests/setup.js puts the policy handlers back after every test.)
export const openStudentApp = async (path, { routes = {}, user = student('ACTIVE') } = {}) => {
  const app = createTestApp({ routes })

  app.fake.set('POST /api/sign-in', user)
  await app.auth.signIn({ email: 'a@b.co', password: 'secret' })
  installHttpPolicy({ auth: app.auth, router: app.router })
  bindCacheToSession(app.auth, app.queryClient)
  await app.router.push(path)

  const wrapper = mount(App, { attachTo: document.body, global: { plugins: app.plugins } })

  await flushPromises()

  return { ...app, wrapper }
}
