import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import * as authService from '@/services/authService.js'
import { R } from '@/constants/routes.js'
import { ErrorKind } from '@/services/apiError.js'
import SignInPage from '@/pages/auth/SignInPage.vue'
import { apiError, createTestApp, deferred, instructor, networkError, student } from './helpers.js'

vi.mock('@/services/authService.js', () => ({ fetchMe: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))

beforeEach(() => {
  vi.mocked(authService.signIn).mockReset()
})

const open = async (role, path = '/instructor/sign-in') => {
  const app = createTestApp()

  await app.router.push(path)
  await app.router.isReady()

  const wrapper = mount(SignInPage, { props: { role }, global: { plugins: [app.pinia, app.router] } })

  return { ...app, wrapper }
}

const submit = async (wrapper, email = 'user@test.dev', password = 'secret-pass') => {
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('input[type="password"]').setValue(password)
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
}

describe('sign-in: where each kind of user lands', () => {
  it('ACTIVE instructor -> instructor dashboard', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('ACTIVE'))
    const { wrapper, router } = await open('INSTRUCTOR')

    await submit(wrapper)

    expect(authService.signIn).toHaveBeenCalledWith({ email: 'user@test.dev', password: 'secret-pass' })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_DASHBOARD))
  })

  it.each(['NONE', 'PENDING', 'FAILED', 'EXPIRED'])('instructor with %s access -> billing (signs in, is not rejected)', async (state) => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor(state))
    const { wrapper, router, auth } = await open('INSTRUCTOR')

    await submit(wrapper)

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_BILLING))
    expect(auth.isAuthenticated).toBe(true)
    expect(wrapper.text()).not.toMatch(/incorrect/i)
  })

  it('ACTIVE student -> student dashboard', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(student('ACTIVE'))
    const { wrapper, router } = await open('STUDENT', '/student/sign-in')

    await submit(wrapper)

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.STUDENT_DASHBOARD))
  })

  it.each(['NONE', 'PENDING', 'FAILED', 'EXPIRED'])('student whose workspace is %s -> workspace-inactive page, still signed in', async (state) => {
    vi.mocked(authService.signIn).mockResolvedValue(student(state))
    const { wrapper, router, auth } = await open('STUDENT', '/student/sign-in')

    await submit(wrapper)

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.STUDENT_WORKSPACE_INACTIVE))
    expect(auth.isAuthenticated).toBe(true)
  })

  it('honours a safe ?redirect= target', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('ACTIVE'))
    const { wrapper, router } = await open('INSTRUCTOR', '/instructor/sign-in?redirect=/instructor/billing')

    await submit(wrapper)

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_BILLING))
  })

  it('ignores an external ?redirect= target', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('ACTIVE'))
    const { wrapper, router } = await open('INSTRUCTOR', '/instructor/sign-in?redirect=//evil.example/x')

    await submit(wrapper)

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_DASHBOARD))
  })
})

describe('sign-in: wrong portal', () => {
  it('a student account on the instructor page is signed out again and told where to go', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(student('ACTIVE'))
    const { wrapper, router, auth } = await open('INSTRUCTOR')

    await submit(wrapper)

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lms.token')).toBeNull()
    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_SIGN_IN)
    expect(wrapper.text()).toMatch(/student account/i)
    expect(wrapper.find('[role="status"] a').attributes('href')).toBe('/student/sign-in')
  })

  it('an instructor account on the student page likewise', async () => {
    vi.mocked(authService.signIn).mockResolvedValue(instructor('ACTIVE'))
    const { wrapper, auth, router } = await open('STUDENT', '/student/sign-in')

    await submit(wrapper)

    expect(auth.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe(R.STUDENT_SIGN_IN)
    expect(wrapper.text()).toMatch(/instructor account/i)
  })
})

describe('sign-in: failures and form behavior', () => {
  it('wrong credentials show a clear message, keep the user on the page and store nothing', async () => {
    vi.mocked(authService.signIn).mockRejectedValue(apiError(ErrorKind.AUTH, { status: 401, message: 'Email / password incorrect' }))
    const { wrapper, router, auth } = await open('INSTRUCTOR')

    await submit(wrapper, 'user@test.dev', 'wrong-password')

    expect(wrapper.find('[role="alert"]').text()).toBe('Email or password is incorrect.')
    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_SIGN_IN)
    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lms.token')).toBeNull()
  })

  it('an unreachable server shows a network message and does not navigate', async () => {
    vi.mocked(authService.signIn).mockRejectedValue(networkError())
    const { wrapper, router } = await open('INSTRUCTOR')

    await submit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toMatch(/reach the server/i)
    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_SIGN_IN)
  })

  it('validates before calling the backend and ties the errors to their fields', async () => {
    const { wrapper } = await open('INSTRUCTOR')

    await submit(wrapper, 'not-an-email', '')

    expect(authService.signIn).not.toHaveBeenCalled()

    const email = wrapper.find('input[type="email"]')
    const password = wrapper.find('input[type="password"]')

    expect(email.attributes('aria-invalid')).toBe('true')
    expect(password.attributes('aria-invalid')).toBe('true')
    expect(wrapper.find(`#${CSS.escape(email.attributes('aria-describedby'))}`).text()).toMatch(/valid email/i)
  })

  it('disables the submit button while signing in, so it cannot be double-submitted', async () => {
    const pending = deferred()

    vi.mocked(authService.signIn).mockReturnValue(pending.promise)
    const { wrapper } = await open('INSTRUCTOR')

    await submit(wrapper)

    const button = wrapper.find('button[type="submit"]')

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')

    await wrapper.find('form').trigger('submit.prevent')
    expect(authService.signIn).toHaveBeenCalledTimes(1)

    pending.resolve(instructor('ACTIVE'))
    await flushPromises()
  })

  it('has labelled fields', async () => {
    const { wrapper } = await open('INSTRUCTOR')

    for (const input of wrapper.findAll('input')) {
      expect(wrapper.find(`label[for="${input.attributes('id')}"]`).exists()).toBe(true)
    }
  })
})
