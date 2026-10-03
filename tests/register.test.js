import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import * as authService from '@/services/authService.js'
import * as navigation from '@/utils/navigation.js'
import { ErrorKind } from '@/services/apiError.js'
import RegisterPage from '@/pages/auth/RegisterPage.vue'
import { apiError, createTestApp, networkError } from './helpers.js'

vi.mock('@/services/authService.js', () => ({ fetchMe: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))
vi.mock('@/utils/navigation.js', async (importOriginal) => ({
  ...(await importOriginal()),
  redirectExternal: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(authService.signUp).mockReset()
  vi.mocked(navigation.redirectExternal).mockReset()
})

const open = async () => {
  const app = createTestApp()

  await app.router.push('/register')
  await app.router.isReady()

  return mount(RegisterPage, { global: { plugins: [app.pinia, app.router] } })
}

const fill = async (wrapper, { name = 'Jane Instructor', email = 'jane@company.dev', password = 'secret-pass' } = {}) => {
  const inputs = wrapper.findAll('input')

  await inputs[0].setValue(name)
  await inputs[1].setValue(email)
  await inputs[2].setValue(password)
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
}

describe('instructor registration', () => {
  it('sends the details to the backend and then follows the hosted Midtrans payment URL', async () => {
    vi.mocked(authService.signUp).mockResolvedValue({ midtrans_payment_url: 'https://app.sandbox.midtrans.com/snap/v4/redirection/abc' })
    const wrapper = await open()

    await fill(wrapper)

    expect(authService.signUp).toHaveBeenCalledWith({ name: 'Jane Instructor', email: 'jane@company.dev', password: 'secret-pass' })
    expect(navigation.redirectExternal).toHaveBeenCalledWith('https://app.sandbox.midtrans.com/snap/v4/redirection/abc')
    expect(wrapper.text()).toMatch(/payment page/i)
    expect(wrapper.find('a[href="https://app.sandbox.midtrans.com/snap/v4/redirection/abc"]').exists()).toBe(true)
  })

  it('never follows a payment URL that is not http(s)', async () => {
    vi.mocked(authService.signUp).mockResolvedValue({ midtrans_payment_url: 'javascript:alert(1)' })
    const wrapper = await open()

    await fill(wrapper)

    expect(navigation.redirectExternal).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('explains a duplicate email and points to sign-in (409 EMAIL_EXISTS)', async () => {
    vi.mocked(authService.signUp).mockRejectedValue(apiError(ErrorKind.CONFLICT, { status: 409, code: 'EMAIL_EXISTS', message: 'Email is already registered' }))
    const wrapper = await open()

    await fill(wrapper)

    expect(wrapper.text()).toMatch(/already registered/i)
    expect(wrapper.find('[role="status"] a').attributes('href')).toBe('/instructor/sign-in')
    expect(navigation.redirectExternal).not.toHaveBeenCalled()
  })

  it.each([502, 503])('tells the user the payment provider is unavailable (%i) and allows trying again', async (status) => {
    vi.mocked(authService.signUp).mockRejectedValueOnce(apiError(ErrorKind.SERVER, { status, message: 'Payment provider is unavailable' }))
    vi.mocked(authService.signUp).mockResolvedValueOnce({ midtrans_payment_url: 'https://pay.test/x' })
    const wrapper = await open()

    await fill(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toMatch(/payment provider is not available/i)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(navigation.redirectExternal).toHaveBeenCalledWith('https://pay.test/x')
  })

  it('shows backend validation errors next to the fields', async () => {
    vi.mocked(authService.signUp).mockRejectedValue(
      apiError(ErrorKind.VALIDATION, { status: 400, message: 'Validation error', errors: [{ path: 'email', message: 'Invalid email' }] })
    )
    const wrapper = await open()

    await fill(wrapper)

    const email = wrapper.findAll('input')[1]

    expect(email.attributes('aria-invalid')).toBe('true')
    expect(wrapper.find(`#${CSS.escape(email.attributes('aria-describedby'))}`).text()).toBe('Invalid email')
  })

  it('validates locally before calling the backend', async () => {
    const wrapper = await open()

    await fill(wrapper, { name: 'Jo', email: 'nope', password: '1' })

    expect(authService.signUp).not.toHaveBeenCalled()
    expect(wrapper.findAll('input').every((input) => input.attributes('aria-invalid') === 'true')).toBe(true)
  })

  it('a network failure is shown and registration can be retried', async () => {
    vi.mocked(authService.signUp).mockRejectedValue(networkError())
    const wrapper = await open()

    await fill(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toMatch(/reach the server/i)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})
