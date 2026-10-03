import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authService from '@/services/authService.js'
import { R } from '@/constants/routes.js'
import { resolveNavigation, roleHome } from '@/router/guards.js'
import { createTestApp, instructor, networkError, student } from './helpers.js'

vi.mock('@/services/authService.js', () => ({ fetchMe: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))

beforeEach(() => {
  vi.mocked(authService.fetchMe).mockReset()
  vi.mocked(authService.signIn).mockReset()
})

// Signs a user in (or leaves the app anonymous) and returns the app pieces.
const appFor = async (who) => {
  const app = createTestApp()

  if (who) {
    vi.mocked(authService.signIn).mockResolvedValue(who)
    await app.auth.signIn({ email: 'a@b.co', password: 'secret' })
  } else {
    await app.auth.initialize()
  }

  return app
}

const visit = async (router, path) => {
  await router.push(path)

  return router.currentRoute.value
}

const STATES = ['NONE', 'PENDING', 'FAILED', 'EXPIRED']

describe('resolveNavigation (pure rules)', () => {
  const to = (meta = {}, name = 'x') => ({ name, meta, fullPath: '/x' })
  const auth = (overrides = {}) => ({
    sessionState: 'anonymous',
    isAuthenticated: false,
    isInstructor: false,
    isStudent: false,
    isActive: false,
    role: null,
    ...overrides,
  })

  it('lets public routes through', () => {
    expect(resolveNavigation(to({}), auth())).toBe(true)
  })

  it('sends anonymous users to the sign-in page of the route role, keeping the target', () => {
    expect(resolveNavigation(to({ requiresAuth: true, role: 'INSTRUCTOR' }), auth())).toEqual({
      name: R.INSTRUCTOR_SIGN_IN,
      query: { redirect: '/x' },
    })
    expect(resolveNavigation(to({ requiresAuth: true, role: 'STUDENT' }), auth())).toEqual({
      name: R.STUDENT_SIGN_IN,
      query: { redirect: '/x' },
    })
  })

  it('roleHome never points an inactive user at a page that needs active access', () => {
    expect(roleHome(auth({ isInstructor: true, isAuthenticated: true, isActive: false }))).toBe(R.INSTRUCTOR_BILLING)
    expect(roleHome(auth({ isStudent: true, isAuthenticated: true, isActive: false }))).toBe(R.STUDENT_WORKSPACE_INACTIVE)
  })

  it('while the backend cannot be reached, nothing is decided about protected or guest pages', () => {
    const unavailable = auth({ sessionState: 'unavailable' })

    expect(resolveNavigation(to({ requiresAuth: true }), unavailable).name).toBe(R.UNAVAILABLE)
    expect(resolveNavigation(to({ guestOnly: true }), unavailable).name).toBe(R.UNAVAILABLE)
    expect(resolveNavigation(to({}), unavailable)).toBe(true)
    expect(resolveNavigation(to({}, R.UNAVAILABLE), unavailable)).toBe(true)
  })
})

describe('router guards with a real router and store', () => {
  it('anonymous visitors are sent to the right sign-in page and keep their target', async () => {
    const { router } = await appFor(null)

    const toInstructor = await visit(router, '/instructor/courses')
    expect(toInstructor.name).toBe(R.INSTRUCTOR_SIGN_IN)
    expect(toInstructor.query.redirect).toBe('/instructor/courses')

    expect((await visit(router, '/student')).name).toBe(R.STUDENT_SIGN_IN)
    expect((await visit(router, '/instructor/billing')).name).toBe(R.INSTRUCTOR_SIGN_IN)
    expect((await visit(router, '/student/workspace-inactive')).name).toBe(R.STUDENT_SIGN_IN)
  })

  it('public pages stay reachable for anonymous visitors', async () => {
    const { router } = await appFor(null)

    for (const [path, name] of [
      ['/', R.HOME],
      ['/instructor/sign-in', R.INSTRUCTOR_SIGN_IN],
      ['/student/sign-in', R.STUDENT_SIGN_IN],
      ['/register', R.REGISTER],
      ['/success-checkout', R.PAYMENT_RESULT],
      ['/forbidden', R.FORBIDDEN],
      ['/does-not-exist', R.NOT_FOUND],
    ]) {
      expect((await visit(router, path)).name).toBe(name)
    }
  })

  it('an ACTIVE instructor reaches the instructor area, including billing', async () => {
    const { router } = await appFor(instructor('ACTIVE'))

    for (const [path, name] of [
      ['/instructor', R.INSTRUCTOR_DASHBOARD],
      ['/instructor/courses', R.INSTRUCTOR_COURSES],
      ['/instructor/students', R.INSTRUCTOR_STUDENTS],
      ['/instructor/billing', R.INSTRUCTOR_BILLING],
      ['/instructor/profile', R.INSTRUCTOR_PROFILE],
    ]) {
      expect((await visit(router, path)).name).toBe(name)
    }
  })

  it('an ACTIVE instructor is kept out of the student area and off the guest pages', async () => {
    const { router } = await appFor(instructor('ACTIVE'))

    expect((await visit(router, '/student')).name).toBe(R.INSTRUCTOR_DASHBOARD)
    expect((await visit(router, '/student/courses')).name).toBe(R.INSTRUCTOR_DASHBOARD)
    expect((await visit(router, '/instructor/sign-in')).name).toBe(R.INSTRUCTOR_DASHBOARD)
    expect((await visit(router, '/register')).name).toBe(R.INSTRUCTOR_DASHBOARD)
    expect((await visit(router, '/')).name).toBe(R.INSTRUCTOR_DASHBOARD)
  })

  it.each(STATES)('an instructor with %s access is routed to billing instead of management pages', async (state) => {
    const { router } = await appFor(instructor(state))

    for (const path of ['/instructor', '/instructor/courses', '/instructor/students', '/student', '/student/workspace-inactive']) {
      expect((await visit(router, path)).name).toBe(R.INSTRUCTOR_BILLING)
    }

    // payment recovery and the profile stay reachable
    expect((await visit(router, '/instructor/billing')).name).toBe(R.INSTRUCTOR_BILLING)
    expect((await visit(router, '/instructor/profile')).name).toBe(R.INSTRUCTOR_PROFILE)
  })

  it('an ACTIVE student reaches the student area', async () => {
    const { router } = await appFor(student('ACTIVE'))

    for (const [path, name] of [
      ['/student', R.STUDENT_DASHBOARD],
      ['/student/courses', R.STUDENT_COURSES],
      ['/student/profile', R.STUDENT_PROFILE],
    ]) {
      expect((await visit(router, path)).name).toBe(name)
    }
  })

  it('an ACTIVE student cannot enter the instructor area or the billing page', async () => {
    const { router } = await appFor(student('ACTIVE'))

    expect((await visit(router, '/instructor')).name).toBe(R.STUDENT_DASHBOARD)
    expect((await visit(router, '/instructor/courses')).name).toBe(R.STUDENT_DASHBOARD)
    expect((await visit(router, '/instructor/billing')).name).toBe(R.STUDENT_DASHBOARD)
    expect((await visit(router, '/student/workspace-inactive')).name).toBe(R.STUDENT_DASHBOARD)
  })

  it.each(STATES)('a student whose workspace is %s is routed to the workspace-inactive page', async (state) => {
    const { router } = await appFor(student(state))

    for (const path of ['/student', '/student/courses', '/instructor', '/instructor/courses']) {
      expect((await visit(router, path)).name).toBe(R.STUDENT_WORKSPACE_INACTIVE)
    }

    // students never see payment: billing redirects them too
    expect((await visit(router, '/instructor/billing')).name).toBe(R.STUDENT_WORKSPACE_INACTIVE)
    expect((await visit(router, '/student/profile')).name).toBe(R.STUDENT_PROFILE)
    expect((await visit(router, '/student/workspace-inactive')).name).toBe(R.STUDENT_WORKSPACE_INACTIVE)
  })

  it('there are no redirect loops: every route settles for every kind of user', async () => {
    const paths = [
      '/', '/instructor/sign-in', '/student/sign-in', '/register', '/success-checkout', '/forbidden', '/unavailable',
      '/instructor', '/instructor/courses', '/instructor/students', '/instructor/billing', '/instructor/profile',
      '/student', '/student/courses', '/student/workspace-inactive', '/student/profile', '/nope',
    ]
    const users = [null, ...STATES.map((s) => instructor(s)), instructor('ACTIVE'), ...STATES.map((s) => student(s)), student('ACTIVE')]

    for (const who of users) {
      const { router } = await appFor(who)

      for (const path of paths) {
        // vue-router throws on an infinite redirect, so a loop fails this test
        const settled = await visit(router, path)
        const again = await visit(router, settled.fullPath)

        expect(again.name, `${who?.role}/${who?.accessStatus} -> ${path}`).toBe(settled.name)
      }
    }
  })
})

describe('guards while the backend is unreachable at startup', () => {
  it('keeps the session, shows the unavailable page for protected and guest pages, and lets public pages through', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValue(networkError())
    localStorage.setItem('lms.token', 'good-token')
    const { router } = createTestApp()

    expect((await visit(router, '/instructor')).name).toBe(R.UNAVAILABLE)
    expect((await visit(router, '/student/courses')).name).toBe(R.UNAVAILABLE)
    expect((await visit(router, '/')).name).toBe(R.UNAVAILABLE)
    expect((await visit(router, '/instructor/sign-in')).name).toBe(R.UNAVAILABLE)
    expect((await visit(router, '/success-checkout')).name).toBe(R.PAYMENT_RESULT)
    expect((await visit(router, '/forbidden')).name).toBe(R.FORBIDDEN)
    expect(localStorage.getItem('lms.token')).toBe('good-token')
  })

  it('after the backend is back, retrying restores the session and the original target', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValueOnce(networkError()).mockResolvedValue(instructor('ACTIVE'))
    localStorage.setItem('lms.token', 'good-token')
    const { router, auth } = createTestApp()

    await visit(router, '/instructor/courses')
    expect(router.currentRoute.value.name).toBe(R.UNAVAILABLE)

    await auth.retryInitialize()
    const landed = await visit(router, router.currentRoute.value.query.redirect)

    expect(landed.name).toBe(R.INSTRUCTOR_COURSES)
    expect(auth.sessionState).toBe('authenticated-active')
  })

  it('the unavailable page is not reachable when everything is fine', async () => {
    const { router } = await appFor(instructor('ACTIVE'))

    expect((await visit(router, '/unavailable')).name).toBe(R.INSTRUCTOR_DASHBOARD)
  })
})

describe('refresh / direct navigation', () => {
  it('a saved token is restored through /api/me before the first guard decision', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(student('ACTIVE'))
    localStorage.setItem('lms.token', 'saved')
    const { router } = createTestApp()

    // a direct link to a protected student page works straight away
    expect((await visit(router, '/student/courses')).name).toBe(R.STUDENT_COURSES)
    expect(authService.fetchMe).toHaveBeenCalledTimes(1)
  })

  it('an invalid saved token (401) becomes anonymous and lands on sign-in', async () => {
    const { unauthorizedError } = await import('./helpers.js')

    vi.mocked(authService.fetchMe).mockRejectedValue(unauthorizedError())
    localStorage.setItem('lms.token', 'expired')
    const { router } = createTestApp()

    const landed = await visit(router, '/instructor/courses')

    expect(landed.name).toBe(R.INSTRUCTOR_SIGN_IN)
    expect(localStorage.getItem('lms.token')).toBeNull()
  })
})
