import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import * as authService from '@/services/authService.js'
import { R } from '@/constants/routes.js'
import { ErrorKind } from '@/services/apiError.js'
import { instructorNav, studentNav } from '@/constants/navigation.js'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import App from '@/App.vue'
import { apiError, createTestApp, instructor, networkError, student } from './helpers.js'

vi.mock('@/services/authService.js', () => ({ fetchMe: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))

beforeEach(() => {
  vi.mocked(authService.signIn).mockReset()
})

// Mounts the whole app (router + layouts + pages) for a signed-in user at `path`.
const appFor = async (who, path) => {
  const app = createTestApp()

  vi.mocked(authService.signIn).mockResolvedValue(who)
  await app.auth.signIn({ email: 'a@b.co', password: 'secret' })
  await app.router.push(path)

  const wrapper = mount(App, { attachTo: document.body, global: { plugins: app.plugins } })

  await flushPromises()
  await app.router.isReady()
  await flushPromises()

  return { ...app, wrapper }
}

const navLabels = (wrapper) => wrapper.findAll('nav[aria-label="Main"] a').map((a) => a.text())

describe('navigation contents (no dead links)', () => {
  it('shows the full instructor menu when the workspace is active', async () => {
    const { wrapper } = await appFor(instructor('ACTIVE'), '/instructor')

    expect(navLabels(wrapper)).toEqual(['Dashboard', 'Courses', 'Students', 'Plan & Billing', 'Profile'])
  })

  it.each(['NONE', 'PENDING', 'FAILED', 'EXPIRED'])('hides pages that need an active workspace when it is %s', async (state) => {
    const { wrapper } = await appFor(instructor(state), '/instructor/billing')

    expect(navLabels(wrapper)).toEqual(['Plan & Billing', 'Profile'])
  })

  it('shows the student menu without any billing entry', async () => {
    const { wrapper } = await appFor(student('ACTIVE'), '/student')

    // Certificates: issued certificates are history, so the entry exists for every student
    expect(navLabels(wrapper)).toEqual(['Dashboard', 'My Courses', 'Certificates', 'Profile'])
  })

  it('a student with an inactive workspace only sees Certificates and Profile besides the blocked page', async () => {
    const { wrapper } = await appFor(student('EXPIRED'), '/student')

    expect(navLabels(wrapper)).toEqual(['Certificates', 'Profile'])
    expect(wrapper.text()).toMatch(/Learning is paused/)
  })

  it('students see a neutral workspace label, never payment wording', async () => {
    for (const state of ['PENDING', 'FAILED', 'EXPIRED', 'NONE']) {
      const { wrapper } = await appFor(student(state), '/student')

      expect(wrapper.text()).toContain('Workspace inactive')
      expect(wrapper.text()).not.toMatch(/Payment|Expired|Billing|Renew/)
    }
  })

  it('the public payment-result page shows a student no billing links', async () => {
    const { wrapper } = await appFor(student('EXPIRED'), '/success-checkout')

    expect(wrapper.text()).toContain('Back to your learning area')
    expect(wrapper.text()).not.toMatch(/Plan & Billing|Check status/)
  })

  it('every link is a real destination: no "#" hrefs and every menu target is a defined route', async () => {
    const { wrapper, router } = await appFor(instructor('ACTIVE'), '/instructor')

    for (const a of wrapper.findAll('a')) {
      expect(a.attributes('href')).toBeTruthy()
      expect(a.attributes('href')).not.toBe('#')
    }

    for (const item of [...instructorNav, ...studentNav]) {
      expect(router.hasRoute(item.to.name)).toBe(true)
    }
  })

  it('marks the current page with aria-current', async () => {
    const { wrapper } = await appFor(instructor('ACTIVE'), '/instructor/courses')

    const current = wrapper.findAll('nav a[aria-current="page"]')

    expect(current).toHaveLength(1)
    expect(current[0].text()).toBe('Courses')
  })

  it('shows who is signed in with the role and workspace state, and a sign-out button', async () => {
    const { wrapper } = await appFor(instructor('EXPIRED', { name: 'Ada Lovelace' }), '/instructor/billing')

    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('Instructor')
    expect(wrapper.text()).toContain('Expired')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Sign out')).toBe(true)
  })

  it('warns an inactive instructor on every page and links to billing', async () => {
    const { wrapper } = await appFor(instructor('EXPIRED'), '/instructor/profile')

    expect(wrapper.text()).toMatch(/workspace is not active/i)
    expect(wrapper.find('main a[href="/instructor/billing"]').exists()).toBe(true)
  })
})

describe('sign out', () => {
  it('forgets the session and goes to the sign-in page of the role', async () => {
    const { wrapper, router, auth } = await appFor(student('ACTIVE'), '/student')

    await wrapper.findAll('button').find((b) => b.text() === 'Sign out').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(R.STUDENT_SIGN_IN))

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('lms.token')).toBeNull()
  })
})

describe('mobile menu', () => {
  const menuButton = (wrapper) => wrapper.find('button[aria-controls="primary-navigation"]')
  const panel = (wrapper) => wrapper.find('#primary-navigation')

  it('is a real button that starts collapsed and toggles aria-expanded and visibility', async () => {
    const { wrapper } = await appFor(instructor('ACTIVE'), '/instructor')

    expect(menuButton(wrapper).element.tagName).toBe('BUTTON')
    expect(menuButton(wrapper).attributes('aria-expanded')).toBe('false')
    expect(panel(wrapper).classes()).toContain('hidden')

    await menuButton(wrapper).trigger('click')

    expect(menuButton(wrapper).attributes('aria-expanded')).toBe('true')
    expect(panel(wrapper).classes()).not.toContain('hidden')

    await menuButton(wrapper).trigger('click')

    expect(menuButton(wrapper).attributes('aria-expanded')).toBe('false')
  })

  it('closes with Escape and returns focus to the menu button', async () => {
    const { wrapper } = await appFor(instructor('ACTIVE'), '/instructor')

    await menuButton(wrapper).trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    expect(menuButton(wrapper).attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menuButton(wrapper).element)
  })

  it('closes after navigating', async () => {
    const { wrapper, router } = await appFor(instructor('ACTIVE'), '/instructor')

    await menuButton(wrapper).trigger('click')
    await router.push('/instructor/courses')
    await flushPromises()

    expect(menuButton(wrapper).attributes('aria-expanded')).toBe('false')
  })

  it('offers a skip link to the main content and labels the navigation', async () => {
    const { wrapper } = await appFor(student('ACTIVE'), '/student')

    expect(wrapper.find('a[href="#main"]').exists()).toBe(true)
    expect(wrapper.find('main#main').exists()).toBe(true)
    expect(wrapper.find('nav[aria-label="Main"]').exists()).toBe(true)
  })

  it('uses no fixed pixel offset or width for the content area (fluid grid layout)', async () => {
    const { wrapper } = await appFor(instructor('ACTIVE'), '/instructor')
    const html = wrapper.html()

    expect(html).not.toMatch(/ml-\[\d+px\]|w-\[\d+px\]|min-w-\[\d+px\]/)
    expect(wrapper.find('main').classes()).toContain('min-w-0')
  })
})

describe('feedback components', () => {
  it('LoadingState announces itself as a status', () => {
    const wrapper = mount(LoadingState, { props: { label: 'Loading courses…' } })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('Loading courses…')
  })

  it('EmptyState renders title, description and actions', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'No courses yet', description: 'Create your first course.' },
      slots: { default: '<button>Create</button>' },
    })

    expect(wrapper.find('h2').text()).toBe('No courses yet')
    expect(wrapper.text()).toContain('Create your first course.')
    expect(wrapper.find('button').text()).toBe('Create')
  })

  it('ErrorState explains a network error and offers a retry that emits', async () => {
    const wrapper = mount(ErrorState, { props: { error: networkError() } })

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('Cannot reach the server')

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('ErrorState offers no retry for errors a retry cannot fix (forbidden, not found)', () => {
    for (const kind of [ErrorKind.FORBIDDEN, ErrorKind.NOT_FOUND, ErrorKind.ENTITLEMENT]) {
      const wrapper = mount(ErrorState, { props: { error: apiError(kind, { status: 403 }) } })

      expect(wrapper.find('button').exists()).toBe(false)
    }
  })

  it('AppButton shows busy state and cannot be clicked while loading', async () => {
    const wrapper = mount(AppButton, { props: { loading: true }, slots: { default: 'Save' } })

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })

  it('AppInput ties its label, hint and error to the field for assistive technology', () => {
    const wrapper = mount(AppInput, { props: { label: 'Email', hint: 'Work address', error: 'Required' } })
    const input = wrapper.find('input')
    const described = input.attributes('aria-describedby').split(' ')

    expect(wrapper.find(`label[for="${input.attributes('id')}"]`).text()).toContain('Email')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(described).toHaveLength(2)
    expect(wrapper.text()).toContain('Work address')
    expect(described.map((id) => wrapper.find(`#${CSS.escape(id)}`).exists())).toEqual([true, true])
  })
})
