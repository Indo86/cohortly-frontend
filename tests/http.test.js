import { describe, expect, it, vi } from 'vitest'
import { createHttpClient } from '@/services/http.js'
import { ApiError, ErrorKind, fieldErrors } from '@/services/apiError.js'
import { networkFailure, replyWith } from './helpers.js'

const handlers = () => ({ onUnauthorized: vi.fn(), onEntitlementInactive: vi.fn() })

const clientFor = (adapter, h = handlers(), getToken = () => null) =>
  createHttpClient({ baseURL: 'http://api.test/', adapter, handlers: h, getToken })

const failure = async (promise) => {
  try {
    await promise
  } catch (error) {
    return error
  }

  throw new Error('expected the request to fail')
}

describe('requests', () => {
  it('sends Authorization: JWT <token> when a session exists, and nothing otherwise', async () => {
    const calls = []

    await clientFor(replyWith(200, {}, calls), handlers(), () => 'abc').get('/api/me')
    await clientFor(replyWith(200, {}, calls), handlers(), () => null).get('/api/me')

    expect(calls[0].headers.Authorization).toBe('JWT abc')
    expect(calls[1].headers.Authorization).toBeUndefined()
  })

  it('uses the configured base URL without a double slash and a sensible timeout', async () => {
    const calls = []

    await clientFor(replyWith(200, {}, calls)).get('/api/me')

    expect(calls[0].baseURL).toBe('http://api.test')
    expect(calls[0].timeout).toBeGreaterThan(0)
  })

  it('sends FormData as multipart (no forced JSON content type)', async () => {
    const calls = []
    const form = new FormData()

    form.append('name', 'x')
    await clientFor(replyWith(200, {}, calls)).post('/api/courses', form)

    expect(calls[0].data).toBeInstanceOf(FormData)
    expect(String(calls[0].headers['Content-Type'] ?? '')).not.toContain('application/json')
  })

  it('sends plain objects as JSON', async () => {
    const calls = []

    await clientFor(replyWith(200, {}, calls)).post('/api/sign-in', { a: 1 })

    expect(String(calls[0].headers['Content-Type'])).toContain('application/json')
    expect(JSON.parse(calls[0].data)).toEqual({ a: 1 })
  })
})

describe('error normalization (backend details are kept, never replaced by "Err")', () => {
  it('keeps message, code, errors, accessStatus and accessExpiresAt', async () => {
    const body = {
      message: 'Your workspace is not active.',
      code: 'ACCESS_NOT_ACTIVE',
      errors: [{ path: 'email', message: 'Invalid email' }],
      accessStatus: 'EXPIRED',
      accessExpiresAt: '2026-01-01T00:00:00.000Z',
    }

    const error = await failure(clientFor(replyWith(403, body)).get('/api/courses'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(403)
    expect(error.message).toBe(body.message)
    expect(error.code).toBe('ACCESS_NOT_ACTIVE')
    expect(error.errors).toEqual(body.errors)
    expect(error.accessStatus).toBe('EXPIRED')
    expect(error.accessExpiresAt).toBe(body.accessExpiresAt)
    expect(fieldErrors(error)).toEqual({ email: 'Invalid email' })
  })

  it.each([
    [400, ErrorKind.VALIDATION],
    [401, ErrorKind.AUTH],
    [403, ErrorKind.FORBIDDEN],
    [404, ErrorKind.NOT_FOUND],
    [409, ErrorKind.CONFLICT],
    [422, ErrorKind.VALIDATION],
    [500, ErrorKind.SERVER],
    [502, ErrorKind.SERVER],
    [503, ErrorKind.SERVER],
  ])('classifies HTTP %i as %s', async (status, kind) => {
    const error = await failure(clientFor(replyWith(status, { message: 'm' })).get('/x'))

    expect(error.kind).toBe(kind)
    expect(error.status).toBe(status)
  })

  it('classifies both entitlement codes as ENTITLEMENT and other 403s as FORBIDDEN', async () => {
    const instructor = await failure(clientFor(replyWith(403, { code: 'ACCESS_NOT_ACTIVE' })).get('/x'))
    const learner = await failure(clientFor(replyWith(403, { code: 'WORKSPACE_ACCESS_INACTIVE' })).get('/x'))
    const other = await failure(clientFor(replyWith(403, { message: 'nope' })).get('/x'))

    expect(instructor.kind).toBe(ErrorKind.ENTITLEMENT)
    expect(learner.kind).toBe(ErrorKind.ENTITLEMENT)
    expect(other.kind).toBe(ErrorKind.FORBIDDEN)
  })

  it('classifies a missing response as a network error with a readable message', async () => {
    const error = await failure(clientFor(networkFailure()).get('/x'))

    expect(error.kind).toBe(ErrorKind.NETWORK)
    expect(error.status).toBeNull()
    expect(error.message).toMatch(/reach the server/i)
  })

  it('survives a non-JSON error body', async () => {
    const error = await failure(clientFor(replyWith(502, '<html>Bad gateway</html>')).get('/x'))

    expect(error.kind).toBe(ErrorKind.SERVER)
    expect(error.message).toBeTruthy()
  })
})

describe('HTTP policy: what is handled centrally', () => {
  it('401 notifies the unauthorized handler (the session is cleared there)', async () => {
    const h = handlers()

    await failure(clientFor(replyWith(401, { message: 'Invalid or expired token' }), h).get('/api/me'))

    expect(h.onUnauthorized).toHaveBeenCalledTimes(1)
    expect(h.onEntitlementInactive).not.toHaveBeenCalled()
  })

  it('a 401 that is an expected answer (wrong credentials) is left to the caller', async () => {
    const h = handlers()

    await failure(clientFor(replyWith(401, { message: 'Email / password incorrect' }), h).post('/api/sign-in', {}, { skipAuthHandling: true }))

    expect(h.onUnauthorized).not.toHaveBeenCalled()
  })

  it.each(['ACCESS_NOT_ACTIVE', 'WORKSPACE_ACCESS_INACTIVE'])(
    '403 %s is an entitlement event: it does NOT log out',
    async (code) => {
      const h = handlers()

      const error = await failure(clientFor(replyWith(403, { code, accessStatus: 'EXPIRED' }), h).get('/api/courses'))

      expect(h.onEntitlementInactive).toHaveBeenCalledTimes(1)
      expect(h.onEntitlementInactive.mock.calls[0][0].accessStatus).toBe('EXPIRED')
      expect(h.onUnauthorized).not.toHaveBeenCalled()
      expect(error.kind).toBe(ErrorKind.ENTITLEMENT)
    }
  )

  it.each([
    ['generic 403', 403, { message: 'Forbidden' }],
    ['400 validation', 400, { message: 'Validation error', errors: [] }],
    ['422', 422, { message: 'not publishable' }],
    ['404', 404, { message: 'Not found' }],
    ['409', 409, { code: 'EMAIL_EXISTS' }],
    ['500', 500, {}],
    ['502', 502, {}],
    ['503', 503, {}],
  ])('%s never touches the session', async (_label, status, body) => {
    const h = handlers()

    await failure(clientFor(replyWith(status, body), h).get('/x'))

    expect(h.onUnauthorized).not.toHaveBeenCalled()
    expect(h.onEntitlementInactive).not.toHaveBeenCalled()
  })

  it('a network failure never touches the session', async () => {
    const h = handlers()

    await failure(clientFor(networkFailure(), h).get('/x'))

    expect(h.onUnauthorized).not.toHaveBeenCalled()
    expect(h.onEntitlementInactive).not.toHaveBeenCalled()
  })
})
