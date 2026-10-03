import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authService from '@/services/authService.js'
import { R } from '@/constants/routes.js'
import { createHttpClient } from '@/services/http.js'
import { installHttpPolicy } from '@/services/httpPolicy.js'
import { createTestApp, instructor, networkFailure, replyWith, student } from './helpers.js'

vi.mock('@/services/authService.js', () => ({ fetchMe: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))

beforeEach(() => {
  vi.mocked(authService.signIn).mockReset()
})

// The real wiring used by the app: client -> handlers -> store + router.
const wiredApp = async (who, path) => {
  const { auth, router } = createTestApp()

  vi.mocked(authService.signIn).mockResolvedValue(who)
  await auth.signIn({ email: 'a@b.co', password: 'secret' })

  const handlers = { onUnauthorized: () => {}, onEntitlementInactive: () => {} }

  installHttpPolicy({ auth, router, handlers })
  await router.push(path)

  const call = (adapter) => createHttpClient({ baseURL: 'http://api.test', adapter, handlers }).get('/x').catch((error) => error)

  return { auth, router, call }
}

describe('401: the session is not valid', () => {
  it('clears the session and sends the user to the sign-in page of their area', async () => {
    const { auth, router, call } = await wiredApp(instructor('ACTIVE'), '/instructor/courses')

    await call(replyWith(401, { message: 'Invalid or expired token' }))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_SIGN_IN))

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lms.token')).toBeNull()
    expect(router.currentRoute.value.query.redirect).toBe('/instructor/courses')
  })

  it('a student goes to the student sign-in', async () => {
    const { router, call } = await wiredApp(student('ACTIVE'), '/student/courses')

    await call(replyWith(401))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.STUDENT_SIGN_IN))
  })
})

describe('403 entitlement: the session is kept', () => {
  it('ACCESS_NOT_ACTIVE keeps the instructor signed in, records the state and moves to billing', async () => {
    const { auth, router, call } = await wiredApp(instructor('ACTIVE'), '/instructor/courses')

    await call(replyWith(403, { code: 'ACCESS_NOT_ACTIVE', accessStatus: 'EXPIRED', accessExpiresAt: '2026-01-01T00:00:00.000Z' }))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_BILLING))

    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('test-token')
    expect(auth.accessStatus).toBe('EXPIRED')
    expect(auth.accessExpiresAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('WORKSPACE_ACCESS_INACTIVE keeps the student signed in and moves to the workspace-inactive page', async () => {
    const { auth, router, call } = await wiredApp(student('ACTIVE'), '/student/courses')

    await call(replyWith(403, { code: 'WORKSPACE_ACCESS_INACTIVE', accessStatus: 'PENDING' }))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.STUDENT_WORKSPACE_INACTIVE))

    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('test-token')
    expect(auth.accessStatus).toBe('PENDING')
  })

  it('an entitlement answer without an explicit state still counts as not active', async () => {
    const { auth, router, call } = await wiredApp(instructor('ACTIVE'), '/instructor')

    await call(replyWith(403, { code: 'ACCESS_NOT_ACTIVE' }))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_BILLING))

    expect(auth.isActive).toBe(false)
  })

  it('an entitlement answer received on the billing page does not move the user away from it', async () => {
    const { router, call } = await wiredApp(instructor('EXPIRED'), '/instructor/billing')

    await call(replyWith(403, { code: 'ACCESS_NOT_ACTIVE', accessStatus: 'EXPIRED' }))

    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_BILLING)
  })
})

describe('everything else leaves session and page untouched', () => {
  it.each([
    ['generic 403', 403, { message: 'Forbidden' }],
    ['400 validation', 400, { message: 'Validation error', errors: [{ path: 'title', message: 'too short' }] }],
    ['404', 404, { message: 'Not found' }],
    ['409', 409, { code: 'EMAIL_EXISTS' }],
    ['502', 502, { message: 'Payment provider is unavailable' }],
  ])('%s', async (_label, status, body) => {
    const { auth, router, call } = await wiredApp(instructor('ACTIVE'), '/instructor/courses')

    const error = await call(replyWith(status, body))

    expect(error.status).toBe(status)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isActive).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('test-token')
    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_COURSES)
  })

  it('a network error keeps the session and the page', async () => {
    const { auth, router, call } = await wiredApp(student('ACTIVE'), '/student/courses')

    const error = await call(networkFailure())

    expect(error.kind).toBe('network')
    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('test-token')
    expect(router.currentRoute.value.name).toBe(R.STUDENT_COURSES)
  })
})
