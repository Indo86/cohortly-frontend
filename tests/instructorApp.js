import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import App from '@/App.vue'
import { createTestApp, instructor } from './helpers.js'

// Opens the REAL app (router, layouts, pages, query client) at `path`, signed in as an
// instructor, talking to the fake backend defined by `routes`.
export const openInstructorApp = async (path, { routes = {}, user = instructor('ACTIVE') } = {}) => {
  const app = createTestApp({ routes })

  app.fake.set('POST /api/sign-in', user)
  await app.auth.signIn({ email: 'a@b.co', password: 'secret' })
  await app.router.push(path)

  const wrapper = mount(App, { attachTo: document.body, global: { plugins: app.plugins } })

  await flushPromises()

  return { ...app, wrapper }
}

export const waitForText = (wrapper, text) =>
  vi.waitFor(() => {
    if (!wrapper.text().includes(text)) throw new Error(`"${text}" not shown yet. Page text: ${wrapper.text().slice(0, 300)}`)
  })

export const waitForGone = (wrapper, text) =>
  vi.waitFor(() => {
    if (wrapper.text().includes(text)) throw new Error(`"${text}" is still shown`)
  })

export const waitForRoute = (router, name) =>
  vi.waitFor(() => {
    if (router.currentRoute.value.name !== name) throw new Error(`route is ${router.currentRoute.value.name}, expected ${name}`)
  })

// the button whose visible text is exactly `label` (or whose accessible name matches)
export const button = (wrapper, label) =>
  wrapper.findAll('button').find((b) => b.text() === label || b.attributes('aria-label') === label)

export const link = (wrapper, label) =>
  wrapper.findAll('a').find((a) => a.text() === label || a.attributes('aria-label') === label)

export const click = async (wrapper, label) => {
  const target = button(wrapper, label) ?? link(wrapper, label)

  if (!target) throw new Error(`No button or link "${label}". Buttons: ${wrapper.findAll('button').map((b) => b.text() || b.attributes('aria-label')).join(' | ')}`)

  await target.trigger('click')
  await flushPromises()
}

export const dialog = (wrapper) => wrapper.find('[role="dialog"]')
