import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import * as authService from '@/services/authService.js'
import * as paymentService from '@/services/paymentService.js'
import * as navigation from '@/utils/navigation.js'
import { R } from '@/constants/routes.js'
import { ErrorKind } from '@/services/apiError.js'
import App from '@/App.vue'
import BillingPage from '@/pages/access/BillingPage.vue'
import WorkspaceInactivePage from '@/pages/access/WorkspaceInactivePage.vue'
import { apiError, createTestApp, instructor, networkError, student } from './helpers.js'

vi.mock('@/services/authService.js', () => ({ fetchMe: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))
vi.mock('@/services/paymentService.js', () => ({ createCheckout: vi.fn() }))
vi.mock('@/utils/navigation.js', async (importOriginal) => ({
  ...(await importOriginal()),
  redirectExternal: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(authService.signIn).mockReset()
  vi.mocked(authService.fetchMe).mockReset()
  vi.mocked(paymentService.createCheckout).mockReset()
  vi.mocked(navigation.redirectExternal).mockReset()
})

const signedIn = async (who, path = '/instructor/billing') => {
  const app = createTestApp()

  vi.mocked(authService.signIn).mockResolvedValue(who)
  await app.auth.signIn({ email: 'a@b.co', password: 'secret' })
  await app.router.push(path)

  return app
}

const mountBilling = async (accessStatus, extra) => {
  const app = await signedIn(instructor(accessStatus, extra))

  return { ...app, wrapper: mount(BillingPage, { global: { plugins: app.plugins } }) }
}

const checkout = (overrides = {}) => ({
  midtrans_payment_url: 'https://pay.test/checkout',
  purpose: 'activation',
  reused: false,
  accessStatus: 'NONE',
  accessExpiresAt: null,
  ...overrides,
})

describe('billing page: what each state shows', () => {
  it.each([
    ['NONE', 'Not activated', 'Pay to activate'],
    ['PENDING', 'Payment pending', 'Continue payment'],
    ['FAILED', 'Payment failed', 'Try payment again'],
    ['EXPIRED', 'Expired', 'Renew subscription'],
    ['ACTIVE', 'Active', 'Renew early'],
  ])('%s shows "%s" and offers "%s"', async (state, badge, action) => {
    const { wrapper } = await mountBilling(state)

    expect(wrapper.text()).toContain(badge)
    expect(wrapper.text()).toContain(action)
  })

  it('shows the backend start and expiry dates; the wording depends on the state', async () => {
    const active = await mountBilling('ACTIVE')
    const expired = await mountBilling('EXPIRED')

    expect(active.wrapper.text()).toContain('Active until')
    expect(active.wrapper.text()).toContain('Current period started')
    expect(expired.wrapper.text()).toContain('Ended on')
  })

  it('shows no dates before anything was ever paid', async () => {
    const { wrapper } = await mountBilling('NONE', { accessStartsAt: null, accessExpiresAt: null })

    expect(wrapper.text()).not.toContain('Active until')
    expect(wrapper.text()).not.toContain('Ended on')
  })
})

describe('billing page: checkout', () => {
  it('requests a checkout and follows the hosted payment URL, using what the backend returned', async () => {
    vi.mocked(paymentService.createCheckout).mockResolvedValue(checkout({ purpose: 'renewal', accessStatus: 'EXPIRED', accessExpiresAt: '2026-01-01T00:00:00.000Z' }))
    const { wrapper, auth } = await mountBilling('EXPIRED')

    await wrapper.findAll('button').find((b) => b.text() === 'Renew subscription').trigger('click')
    await flushPromises()

    expect(paymentService.createCheckout).toHaveBeenCalledTimes(1)
    expect(navigation.redirectExternal).toHaveBeenCalledWith('https://pay.test/checkout')
    expect(wrapper.text()).toMatch(/payment page for your renewal/i)
    // the displayed entitlement follows the backend answer, not a local guess
    expect(auth.accessStatus).toBe('EXPIRED')
    expect(auth.accessExpiresAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('never marks the workspace active by itself after starting a payment', async () => {
    vi.mocked(paymentService.createCheckout).mockResolvedValue(checkout({ accessStatus: 'NONE' }))
    const { wrapper, auth } = await mountBilling('NONE')

    await wrapper.findAll('button').find((b) => b.text() === 'Pay to activate').trigger('click')
    await flushPromises()

    expect(auth.isActive).toBe(false)
  })

  it('an ACTIVE instructor can renew early', async () => {
    vi.mocked(paymentService.createCheckout).mockResolvedValue(checkout({ purpose: 'renewal', accessStatus: 'ACTIVE', accessExpiresAt: '2026-06-01T00:00:00.000Z' }))
    const { wrapper, auth } = await mountBilling('ACTIVE')

    await wrapper.findAll('button').find((b) => b.text() === 'Renew early').trigger('click')
    await flushPromises()

    expect(navigation.redirectExternal).toHaveBeenCalledWith('https://pay.test/checkout')
    expect(auth.isActive).toBe(true)
  })

  it.each([502, 503])('shows a provider failure (%i) clearly, does not redirect, and lets the user retry', async (status) => {
    vi.mocked(paymentService.createCheckout).mockRejectedValue(apiError(ErrorKind.SERVER, { status, message: 'Payment provider is unavailable' }))
    const { wrapper } = await mountBilling('EXPIRED')

    await wrapper.findAll('button').find((b) => b.text() === 'Renew subscription').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toMatch(/payment provider is not available/i)
    expect(navigation.redirectExternal).not.toHaveBeenCalled()
    expect(wrapper.findAll('button').find((b) => b.text() === 'Renew subscription').attributes('disabled')).toBeUndefined()
  })

  it('shows a network failure and keeps the session', async () => {
    vi.mocked(paymentService.createCheckout).mockRejectedValue(networkError())
    const { wrapper, auth } = await mountBilling('PENDING')

    await wrapper.findAll('button').find((b) => b.text() === 'Continue payment').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toMatch(/reach the server/i)
    expect(auth.isAuthenticated).toBe(true)
  })

  it('refuses a payment URL that is not http(s)', async () => {
    vi.mocked(paymentService.createCheckout).mockResolvedValue(checkout({ midtrans_payment_url: 'javascript:alert(1)' }))
    const { wrapper } = await mountBilling('NONE')

    await wrapper.findAll('button').find((b) => b.text() === 'Pay to activate').trigger('click')
    await flushPromises()

    expect(navigation.redirectExternal).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('"Check status" reloads the real state from the backend', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(instructor('ACTIVE'))
    const { wrapper, auth } = await mountBilling('PENDING')

    await wrapper.findAll('button').find((b) => b.text() === 'Check status').trigger('click')
    await flushPromises()

    expect(authService.fetchMe).toHaveBeenCalledTimes(1)
    expect(auth.isActive).toBe(true)
    expect(wrapper.text()).toMatch(/Status checked: Active/)
  })
})

describe('students never see payment', () => {
  it.each(['NONE', 'PENDING', 'FAILED', 'EXPIRED', 'ACTIVE'])('a student (%s) cannot open the billing page', async (state) => {
    const app = await signedIn(student(state), '/student')
    const wrapper = mount(App, { global: { plugins: app.plugins } })

    await app.router.push('/instructor/billing')
    await flushPromises()

    expect(app.router.currentRoute.value.name).not.toBe(R.INSTRUCTOR_BILLING)
    expect(wrapper.text()).not.toMatch(/Plan & Billing|Pay to activate|Renew/)
    expect(paymentService.createCheckout).not.toHaveBeenCalled()
  })

  it('the workspace-inactive page tells the student to contact the instructor and has no payment controls', async () => {
    const app = await signedIn(student('EXPIRED'), '/student/workspace-inactive')
    const wrapper = mount(WorkspaceInactivePage, { global: { plugins: app.plugins } })

    expect(wrapper.text()).toMatch(/contact them/i)
    expect(wrapper.text()).toMatch(/Inactive/)
    expect(wrapper.text()).not.toMatch(/Expired|Payment pending|Payment failed/)
    expect(wrapper.text()).not.toMatch(/pay|renew|billing|subscription/i)
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(['Check again'])
  })

  it('"Check again" leaves the page once the workspace is active again', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(student('ACTIVE'))
    const app = await signedIn(student('PENDING'), '/student/workspace-inactive')
    const wrapper = mount(WorkspaceInactivePage, { global: { plugins: app.plugins } })

    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(app.router.currentRoute.value.name).toBe(R.STUDENT_DASHBOARD))
  })

  it('"Check again" says so when the workspace is still inactive', async () => {
    vi.mocked(authService.fetchMe).mockResolvedValue(student('PENDING'))
    const app = await signedIn(student('PENDING'), '/student/workspace-inactive')
    const wrapper = mount(WorkspaceInactivePage, { global: { plugins: app.plugins } })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toMatch(/still not active/i)
    expect(app.router.currentRoute.value.name).toBe(R.STUDENT_WORKSPACE_INACTIVE)
  })
})
