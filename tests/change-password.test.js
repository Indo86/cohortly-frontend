import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { R } from '@/constants/routes.js'
import { bindCacheToSession } from '@/queryClient.js'
import { installHttpPolicy } from '@/services/httpPolicy.js'
import { readToken } from '@/services/session.js'
import { reply } from './fakeApi.js'
import { openInstructorApp, waitForRoute, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

// M3: the signed-in user's own password, from the profile page. The backend decides; a successful change
// signs the user out of this app (token, store and cached data) and asks them to sign in again.
const NEW = 'a-brand-new-password'

const openProfile = async ({ routes = {}, as = 'instructor' } = {}) => {
  const app = as === 'student' ? await openStudentApp('/student/profile', { routes }) : await openInstructorApp('/instructor/profile', { routes })

  if (as !== 'student') {
    installHttpPolicy({ auth: app.auth, router: app.router })
    bindCacheToSession(app.auth, app.queryClient)
  }

  await waitForText(app.wrapper, 'Change password')

  return app
}

const fill = async (wrapper, { current = 'secret-pass-1', next = NEW, confirm = next } = {}) => {
  const [currentInput, newInput, confirmInput] = wrapper.findAll('input[type="password"]')

  await currentInput.setValue(current)
  await newInput.setValue(next)
  await confirmInput.setValue(confirm)
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
}

const changeCalls = (fake) => fake.callsTo('PUT /api/me/password')

describe('change password: local checks (the backend stays the authority)', () => {
  it('asks for every field and sends nothing', async () => {
    const { wrapper, fake } = await openProfile()

    await fill(wrapper, { current: '', next: '', confirm: '' })

    expect(wrapper.text()).toContain('Enter your current password.')
    expect(wrapper.text()).toContain('Use a password of 8 to 72 characters.')
    expect(changeCalls(fake)).toHaveLength(0)
  })

  it('refuses a confirmation that does not match', async () => {
    const { wrapper, fake } = await openProfile()

    await fill(wrapper, { confirm: 'something-else' })

    expect(wrapper.text()).toContain('The passwords do not match.')
    expect(changeCalls(fake)).toHaveLength(0)
  })

  it('refuses a short new password and one equal to the current password', async () => {
    const { wrapper, fake } = await openProfile()

    await fill(wrapper, { next: 'short12' })
    expect(wrapper.text()).toContain('Use a password of 8 to 72 characters.')

    await fill(wrapper, { current: 'same-password', next: 'same-password' })
    expect(wrapper.text()).toContain('Choose a new password that is different from the current one.')
    expect(changeCalls(fake)).toHaveLength(0)
  })
})

describe('a successful change', () => {
  it('sends only the two passwords, then forgets the session and asks to sign in again', async () => {
    const { wrapper, fake, auth, router, queryClient } = await openProfile({
      routes: { 'PUT /api/me/password': reply(200, { message: 'Password changed. Please sign in again.' }) },
    })

    // something private is cached before the change
    queryClient.setQueryData(['instructor', 'overview'], { totalCourses: 3 })
    expect(readToken()).toBe('test-token')

    await fill(wrapper)

    const [call] = changeCalls(fake)

    expect(call.body).toEqual({ currentPassword: 'secret-pass-1', newPassword: NEW })

    await waitForRoute(router, R.INSTRUCTOR_SIGN_IN)
    expect(router.currentRoute.value.query.passwordChanged).toBe('1')
    expect(readToken()).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.role).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    await waitForText(wrapper, 'Your password has been changed. Please sign in again.')
  })

  it('a student is sent to the student sign-in page', async () => {
    const { wrapper, router, auth } = await openProfile({
      as: 'student',
      routes: { 'PUT /api/me/password': reply(200, { message: 'Password changed. Please sign in again.' }) },
    })

    await fill(wrapper)

    await waitForRoute(router, R.STUDENT_SIGN_IN)
    expect(auth.isAuthenticated).toBe(false)
    expect(readToken()).toBeNull()
  })
})

describe('refusals', () => {
  it('a wrong current password is shown on its field and the user stays signed in', async () => {
    const { wrapper, auth, router } = await openProfile({
      routes: {
        'PUT /api/me/password': reply(400, {
          message: 'Current password is incorrect.',
          code: 'CURRENT_PASSWORD_INCORRECT',
          errors: [{ path: 'currentPassword', message: 'Current password is incorrect.' }],
        }),
      },
    })

    await fill(wrapper, { current: 'not-my-password' })

    await waitForText(wrapper, 'Current password is incorrect.')
    expect(auth.isAuthenticated).toBe(true)
    expect(readToken()).toBe('test-token')
    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_PROFILE)
  })

  it('a rate limit or any other failure shows the backend message and changes nothing', async () => {
    const { wrapper, auth } = await openProfile({
      routes: {
        'PUT /api/me/password': reply(429, { message: 'Too many failed password changes. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }),
      },
    })

    await fill(wrapper)

    await waitForText(wrapper, 'Too many failed password changes. Please wait a few minutes and try again.')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('an expired session (401) signs out through the usual policy', async () => {
    const { wrapper, auth, router } = await openProfile({
      routes: { 'PUT /api/me/password': reply(401, { message: 'Invalid or expired token' }) },
    })

    await fill(wrapper)

    await waitForRoute(router, R.INSTRUCTOR_SIGN_IN)
    expect(auth.isAuthenticated).toBe(false)
    expect(readToken()).toBeNull()
  })
})
