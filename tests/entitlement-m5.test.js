import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '@/App.vue'
import { R } from '@/constants/routes.js'
import { bindCacheToSession } from '@/queryClient.js'
import { httpHandlers } from '@/services/http.js'
import { installHttpPolicy } from '@/services/httpPolicy.js'
import { courseRow, overview } from './data.js'
import { reply } from './fakeApi.js'
import { createTestApp, instructor, student } from './helpers.js'
import { click, openInstructorApp, waitForRoute, waitForText } from './instructorApp.js'

// The real policy handlers are module-level; put them back after each test.
afterEach(() => {
  httpHandlers.onUnauthorized = () => {}
  httpHandlers.onEntitlementInactive = () => {}
})

const INSTRUCTOR_PATHS = [
  '/instructor',
  '/instructor/courses',
  '/instructor/courses/new',
  '/instructor/courses/course-1',
  '/instructor/courses/course-1/settings',
  '/instructor/courses/course-1/learners',
  '/instructor/courses/course-1/progress',
  '/instructor/courses/course-1/sections/s1/lessons/new',
  '/instructor/courses/course-1/lessons/l1/edit',
  '/instructor/students',
  '/instructor/students/new',
  '/instructor/students/s1/edit',
]

const openWithPolicy = async (path, { routes, user = instructor('ACTIVE') } = {}) => {
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

describe('mid-session subscription loss on real M5 requests', () => {
  it('ACCESS_NOT_ACTIVE on a data request keeps the session and moves the instructor to billing', async () => {
    const { auth, router, wrapper } = await openWithPolicy('/instructor/courses', {
      routes: { 'GET /api/courses': reply(403, { message: 'Your workspace is not active.', code: 'ACCESS_NOT_ACTIVE', accessStatus: 'EXPIRED', accessExpiresAt: '2026-05-01T00:00:00.000Z' }) },
    })

    await waitForRoute(router, R.INSTRUCTOR_BILLING)
    await waitForText(wrapper, 'Plan & Billing')

    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('test-token')
    expect(auth.accessStatus).toBe('EXPIRED')
    expect(wrapper.text()).toContain('Expired')
    expect(wrapper.text()).toContain('Renew subscription')
  })

  it('works the same when access is lost after the instructor has been working (active page, then a failing request)', async () => {
    const { auth, router, wrapper, fake } = await openWithPolicy('/instructor', {
      routes: { 'GET /api/overviews': overview(), 'GET /api/courses': [courseRow({ _id: 'c1', name: 'Course A' })] },
    })

    await waitForText(wrapper, 'Video lessons')
    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_DASHBOARD)

    // the subscription lapses; the next data request is refused
    fake.set('GET /api/courses', reply(403, { message: 'x', code: 'ACCESS_NOT_ACTIVE', accessStatus: 'EXPIRED' }))
    await router.push('/instructor/courses')

    await waitForRoute(router, R.INSTRUCTOR_BILLING)
    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('test-token')
  })

  it('a refused MUTATION (publish) also keeps the session and moves to billing', async () => {
    const { auth, router, wrapper } = await openWithPolicy('/instructor/courses', {
      routes: {
        'GET /api/courses': [courseRow({ _id: 'course-1', name: 'Intro to Vue', status: 'draft' })],
        'PUT /api/courses/:id/status': reply(403, { message: 'x', code: 'ACCESS_NOT_ACTIVE', accessStatus: 'PENDING' }),
      },
    })

    await waitForText(wrapper, 'Intro to Vue')
    await click(wrapper, 'Publish')
    await waitForRoute(router, R.INSTRUCTOR_BILLING)

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.accessStatus).toBe('PENDING')
  })

  it('after losing access, the instructor menu shows only billing and profile', async () => {
    const { router, wrapper } = await openWithPolicy('/instructor/courses', {
      routes: { 'GET /api/courses': reply(403, { message: 'x', code: 'ACCESS_NOT_ACTIVE', accessStatus: 'FAILED' }) },
    })

    await waitForRoute(router, R.INSTRUCTOR_BILLING)
    await waitForText(wrapper, 'Plan & Billing')

    expect(wrapper.findAll('nav[aria-label="Main"] a').map((a) => a.text())).toEqual(['Plan & Billing', 'Profile'])
  })
})

describe('401 on M5 requests', () => {
  it('ends the session, goes to sign-in, remembers the page, and drops all cached data', async () => {
    const { auth, router, queryClient, wrapper, fake } = await openWithPolicy('/instructor/courses', {
      routes: { 'GET /api/courses': [courseRow({ name: 'Secret course' })] },
    })

    await waitForText(wrapper, 'Secret course')
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0)

    fake.set('GET /api/overviews', reply(401, { message: 'Invalid or expired token' }))
    await router.push('/instructor')

    await waitForRoute(router, R.INSTRUCTOR_SIGN_IN)

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lms.token')).toBeNull()
    expect(router.currentRoute.value.query.redirect).toBe('/instructor')
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('signing out clears the cache so the next user never sees the previous user’s data', async () => {
    const { auth, queryClient, wrapper } = await openWithPolicy('/instructor/courses', {
      routes: { 'GET /api/courses': [courseRow({ name: 'Private to user one' })] },
    })

    await waitForText(wrapper, 'Private to user one')

    await click(wrapper, 'Sign out')
    await flushPromises()

    expect(auth.isAuthenticated).toBe(false)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})

describe('who can reach the instructor pages', () => {
  it.each(INSTRUCTOR_PATHS)('a student cannot open %s and no instructor API is called', async (path) => {
    const { router, fake } = await openInstructorApp(path, { user: student('ACTIVE') })

    expect(router.currentRoute.value.name).toBe(R.STUDENT_DASHBOARD)
    expect(fake.calls.filter((call) => /\/api\/(courses|students(?!-courses)|overviews|sections|lessons)/.test(call.url))).toHaveLength(0)
  })

  it.each(INSTRUCTOR_PATHS)('an anonymous visitor is sent to the instructor sign-in from %s', async (path) => {
    const app = createTestApp()

    await app.router.push(path)

    expect(app.router.currentRoute.value.name).toBe(R.INSTRUCTOR_SIGN_IN)
    expect(app.router.currentRoute.value.query.redirect).toBe(path)
    expect(app.fake.calls.filter((call) => call.url.startsWith('/api/courses'))).toHaveLength(0)
  })

  it.each(['EXPIRED', 'PENDING', 'FAILED', 'NONE'])('an instructor whose workspace is %s is sent to billing from every M5 page, without any M5 request', async (state) => {
    for (const path of INSTRUCTOR_PATHS) {
      const { router, fake } = await openInstructorApp(path, { user: instructor(state) })

      expect(router.currentRoute.value.name, path).toBe(R.INSTRUCTOR_BILLING)
      expect(fake.calls.filter((call) => /\/api\/(courses|students(?!-courses)|overviews|sections|lessons)/.test(call.url)), path).toHaveLength(0)
    }
  })
})
