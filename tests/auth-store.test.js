import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as authService from '@/services/authService.js'
import { useAuthStore } from '@/stores/auth.js'
import { identity, instructor, networkError, student, unauthorizedError, apiError } from './helpers.js'
import { ErrorKind } from '@/services/apiError.js'

vi.mock('@/services/authService.js', () => ({ fetchMe: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))

// The store reads the saved token when it is created, so tests set storage first.
const freshStore = (savedToken) => {
  if (savedToken) localStorage.setItem('lms.token', savedToken)

  setActivePinia(createPinia())

  return useAuthStore()
}

beforeEach(() => {
  vi.mocked(authService.fetchMe).mockReset()
  vi.mocked(authService.signIn).mockReset()
})

describe('startup / session hydration', () => {
  it('without a token the user is anonymous and the backend is not asked', async () => {
    const auth = freshStore()

    expect(auth.sessionState).toBe('uninitialized')

    await auth.initialize()

    expect(auth.sessionState).toBe('anonymous')
    expect(auth.isAuthenticated).toBe(false)
    expect(authService.fetchMe).not.toHaveBeenCalled()
  })

  it('a saved token is verified with /api/me and hydrates role and entitlement (ACTIVE instructor)', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(instructor('ACTIVE'))
    const auth = freshStore('saved')

    await auth.initialize()

    expect(auth.sessionState).toBe('authenticated-active')
    expect(auth.role).toBe('INSTRUCTOR')
    expect(auth.rawRole).toBe('manager')
    expect(auth.isInstructor).toBe(true)
    expect(auth.isActive).toBe(true)
    expect(auth.user).toEqual({ name: 'Test User', email: 'user@test.dev' })
    expect(auth.accessStartsAt).toBe('2026-05-01T00:00:00.000Z')
    expect(auth.accessExpiresAt).toBe('2026-06-01T00:00:00.000Z')
    expect(auth.needsPayment).toBe(false)
  })

  it('an inactive instructor is authenticated but not active and needs payment', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(instructor('EXPIRED'))
    const auth = freshStore('saved')

    await auth.initialize()

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.sessionState).toBe('authenticated-inactive')
    expect(auth.isActive).toBe(false)
    expect(auth.needsPayment).toBe(true)
    expect(auth.hasInactiveWorkspace).toBe(false)
  })

  it('a student with an inactive workspace is flagged, and never "needs payment"', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(student('PENDING'))
    const auth = freshStore('saved')

    await auth.initialize()

    expect(auth.role).toBe('STUDENT')
    expect(auth.isStudent).toBe(true)
    expect(auth.hasInactiveWorkspace).toBe(true)
    expect(auth.needsPayment).toBe(false)
  })

  it('an active student is simply active', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(student('ACTIVE'))
    const auth = freshStore('saved')

    await auth.initialize()

    expect(auth.sessionState).toBe('authenticated-active')
    expect(auth.hasInactiveWorkspace).toBe(false)
  })

  it('a 401 from /api/me clears the stored token and ends the session', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValue(unauthorizedError())
    const auth = freshStore('expired-token')

    await auth.initialize()

    expect(auth.sessionState).toBe('anonymous')
    expect(auth.token).toBeNull()
    expect(localStorage.getItem('lms.token')).toBeNull()
  })

  it('a network error does NOT destroy the session: the token stays and the state is "unavailable"', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValue(networkError())
    const auth = freshStore('good-token')

    await auth.initialize()

    expect(auth.sessionState).toBe('unavailable')
    expect(auth.initState).toBe('unavailable')
    expect(localStorage.getItem('lms.token')).toBe('good-token')
    expect(auth.token).toBe('good-token')
  })

  it('a server error does NOT destroy the session either', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValue(apiError(ErrorKind.SERVER, { status: 503 }))
    const auth = freshStore('good-token')

    await auth.initialize()

    expect(auth.sessionState).toBe('unavailable')
    expect(localStorage.getItem('lms.token')).toBe('good-token')
  })

  it('retrying after an outage restores the session', async () => {
    vi.mocked(authService.fetchMe).mockRejectedValueOnce(networkError()).mockResolvedValueOnce(student('ACTIVE'))
    const auth = freshStore('good-token')

    await auth.initialize()
    expect(auth.sessionState).toBe('unavailable')

    await auth.retryInitialize()

    expect(auth.sessionState).toBe('authenticated-active')
    expect(auth.role).toBe('STUDENT')
  })

  it('initialization runs once even when requested concurrently', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(instructor())
    const auth = freshStore('saved')

    await Promise.all([auth.initialize(), auth.initialize(), auth.initialize()])
    await auth.initialize()

    expect(authService.fetchMe).toHaveBeenCalledTimes(1)
  })

  it('an account type the app does not know is not kept as a session', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(identity({ role: 'admin' }))
    const auth = freshStore('saved')

    await auth.initialize()

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lms.token')).toBeNull()
  })
})

describe('signIn / logout', () => {
  it('stores only the token and hydrates identity from the sign-in response', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('ACTIVE', { token: 'new-token' }))
    const auth = freshStore()

    const result = await auth.signIn({ email: 'a@b.co', password: 'secret' })

    expect(result).toEqual({ role: 'INSTRUCTOR', accessStatus: 'ACTIVE' })
    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('new-token')
    expect(Object.keys(localStorage)).toEqual(['lms.token'])
  })

  it('valid credentials sign in even when the workspace is inactive', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('FAILED'))
    const auth = freshStore()

    await auth.signIn({ email: 'a@b.co', password: 'secret' })

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.accessStatus).toBe('FAILED')
    expect(auth.isActive).toBe(false)
  })

  it('failed sign-in leaves the store anonymous and stores nothing', async () => {
    vi.mocked(authService.signIn).mockRejectedValue(unauthorizedError())
    const auth = freshStore()

    await expect(auth.signIn({ email: 'a@b.co', password: 'wrong' })).rejects.toBeTruthy()

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lms.token')).toBeNull()
  })

  it('logout forgets the token, identity and entitlement', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(student('ACTIVE'))
    const auth = freshStore()
    await auth.signIn({ email: 'a@b.co', password: 'secret' })

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.sessionState).toBe('anonymous')
    expect(auth.role).toBeNull()
    expect(auth.accessStatus).toBe('NONE')
    expect(localStorage.getItem('lms.token')).toBeNull()
  })

  it('fetchMe refreshes entitlement after a payment without touching the token', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('PENDING'))
    vi.mocked(authService.fetchMe).mockResolvedValue(instructor('ACTIVE'))
    const auth = freshStore()
    await auth.signIn({ email: 'a@b.co', password: 'secret' })

    await auth.fetchMe()

    expect(auth.isActive).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('test-token')
  })

  it('a 401 from a later fetchMe ends the session', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('ACTIVE'))
    vi.mocked(authService.fetchMe).mockRejectedValue(unauthorizedError())
    const auth = freshStore()
    await auth.signIn({ email: 'a@b.co', password: 'secret' })

    await expect(auth.fetchMe()).rejects.toBeTruthy()

    expect(auth.isAuthenticated).toBe(false)
  })

  it('a network error from a later fetchMe keeps the session', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('ACTIVE'))
    vi.mocked(authService.fetchMe).mockRejectedValue(networkError())
    const auth = freshStore()
    await auth.signIn({ email: 'a@b.co', password: 'secret' })

    await expect(auth.fetchMe()).rejects.toBeTruthy()

    expect(auth.isAuthenticated).toBe(true)
    expect(localStorage.getItem('lms.token')).toBe('test-token')
  })

  it('applyEntitlement updates only the fields it is given', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('ACTIVE'))
    const auth = freshStore()
    await auth.signIn({ email: 'a@b.co', password: 'secret' })

    auth.applyEntitlement({ accessStatus: 'EXPIRED' })

    expect(auth.accessStatus).toBe('EXPIRED')
    expect(auth.accessExpiresAt).toBe('2026-06-01T00:00:00.000Z')
    expect(auth.isAuthenticated).toBe(true)
  })
})
