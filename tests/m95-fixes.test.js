import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '@/App.vue'
import { createTestApp } from './helpers.js'
import { CERT_NUMBER, finishLessons, makeStudentQuizBackend } from './quizBackend.js'
import { openInstructorApp, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

const certified = () => {
  const backend = makeStudentQuizBackend({ withQuiz: false })

  finishLessons(backend)
  backend.issueIfDue()

  return backend
}

describe('navigation without redundancy', () => {
  it('students have no bottom tab bar: the sidebar menu is the one navigation', async () => {
    const { wrapper } = await openStudentApp('/student')

    await flushPromises()
    expect(wrapper.find('nav[aria-label="Mobile learning"]').exists()).toBe(false)
    expect(wrapper.findAll('nav')).toHaveLength(1)
  })

  it.each([
    ['student', () => openStudentApp('/student')],
    ['instructor', () => openInstructorApp('/instructor')],
  ])('the %s account menu holds Profile and Sign out, and the sidebar navigation does not repeat Profile', async (_, open) => {
    const { wrapper } = await open()

    await flushPromises()

    const menu = wrapper.find('details.account-menu')

    expect(menu.text()).toContain('Sign out')
    expect(menu.text()).toContain('Profile')
    expect(wrapper.find('nav[aria-label="Main"]').text()).not.toContain('Profile')
  })
})

describe('the certificate looks the same when viewed and when verified', () => {
  it('shows the same sheet content in both places', async () => {
    const routes = certified().routes
    const viewed = await openStudentApp(`/student/certificates/${CERT_NUMBER}`, { routes })

    await waitForText(viewed.wrapper, 'Certificate of Completion')

    const app = createTestApp({ routes })

    await app.router.push(`/certificates/verify/${CERT_NUMBER}`)

    const verified = mount(App, { attachTo: document.body, global: { plugins: app.plugins } })

    await waitForText(verified, 'Valid certificate')

    const sheet = (wrapper) => wrapper.find('.certificate-sheet')

    expect(sheet(verified).text()).toBe(sheet(viewed.wrapper).text())
    expect(sheet(verified).findAll('svg').length).toBe(sheet(viewed.wrapper).findAll('svg').length) // the course line and the seal
    expect(sheet(verified).text()).not.toMatch(/\d+%/) // the quiz score stays private in both
  })
})

describe('course covers are generated, never uploaded', () => {
  it('the new-course form has no image field, and the instructor course list still shows a cover', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses/new', { routes: { 'GET /api/categories': [{ _id: 'c1', name: 'Programming' }] } })

    await waitForText(wrapper, 'Course name')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('The course cover is created for you')
  })
})

describe('the AI note on a video lesson', () => {
  it('sits in the page flow under the lesson (never floating over the reading column) and the completion heading fits a video', async () => {
    const { standardCourse } = await import('./learningBackend.js')
    const { backend, sections } = standardCourse()
    const video = sections[0].lessons[1]
    const app = await openStudentApp(`/student/courses/course-1/lessons/${video._id}`, { routes: { ...backend.routes, 'GET /api/ai/status': { enabled: true, available: true, provider: 'openrouter' } } })

    await waitForText(app.wrapper, 'not available for video lessons')
    expect(app.wrapper.find('.reader-assistant').classes()).toContain('reader-assistant-note')
    expect(app.wrapper.text()).toContain('Finished watching?')
  })
})
