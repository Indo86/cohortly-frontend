import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError } from 'axios'
import App from '@/App.vue'
import { R } from '@/constants/routes.js'
import { reply } from './fakeApi.js'
import { createTestApp, instructor, student } from './helpers.js'
import { CERT_NUMBER, finishLessons, makeStudentQuizBackend } from './quizBackend.js'
import { click, openInstructorApp, waitForRoute, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

const BILLING_WORDS = /renew|subscribe|subscription|billing|payment|checkout|pay now/i

const certified = () => {
  const backend = makeStudentQuizBackend({ withQuiz: false })

  finishLessons(backend)
  backend.issueIfDue()

  return backend
}

// the real app with NO session: the public pages
const openAnonymous = async (path, routes = {}) => {
  const app = createTestApp({ routes })

  await app.router.push(path)

  const wrapper = mount(App, { attachTo: document.body, global: { plugins: app.plugins } })

  await flushPromises()

  return { ...app, wrapper }
}

describe('the student certificates list', () => {
  it('lists each certificate with its course, instructor, date and ID, and a way to open and verify it', async () => {
    const { wrapper } = await openStudentApp('/student/certificates', { routes: certified().routes })

    await waitForText(wrapper, 'Intro to Vue')

    const item = wrapper.find('main ul li')

    expect(item.text()).toContain('Instructor Ina Instructor')
    expect(item.text()).toContain(CERT_NUMBER)
    expect(item.find(`a[aria-label="View certificate: Intro to Vue"]`).attributes('href')).toBe(`/student/certificates/${CERT_NUMBER}`)
    expect(item.find(`a[aria-label="Verify certificate: Intro to Vue"]`).attributes('href')).toBe(`/certificates/verify/${CERT_NUMBER}`)
  })

  it('says truthfully when there are none, and when loading fails', async () => {
    const empty = await openStudentApp('/student/certificates')

    await waitForText(empty.wrapper, 'You have no certificates yet')
    expect(empty.wrapper.text()).toContain('You receive a certificate when you complete a course')

    const failing = await openStudentApp('/student/certificates', { routes: { 'GET /api/my-certificates': reply(500, { message: 'Broken' }) } })

    await waitForText(failing.wrapper, 'We could not load your certificates')
  })

  it('is in the student menu', async () => {
    const { wrapper } = await openStudentApp('/student')

    await waitForText(wrapper, 'Welcome')
    expect(wrapper.find('nav[aria-label="Main"] a[href="/student/certificates"]').text()).toBe('Certificates')
  })
})

describe('the certificate page', () => {
  const page = () => openStudentApp(`/student/certificates/${CERT_NUMBER}`, { routes: certified().routes })

  it('shows the certificate: product, title, holder, course, instructor, issue date and ID', async () => {
    const { wrapper } = await page()

    await waitForText(wrapper, 'Certificate of Completion')

    expect(wrapper.find('[data-testid="certificate-student"]').text()).toBe('Test User')
    expect(wrapper.find('[data-testid="certificate-course"]').text()).toBe('Intro to Vue')
    expect(wrapper.find('[data-testid="certificate-instructor"]').text()).toBe('Ina Instructor')
    expect(wrapper.find('[data-testid="certificate-number"]').text()).toBe(CERT_NUMBER)
    expect(wrapper.find('[data-testid="certificate-issued"]').text()).toMatch(/2026/)
    expect(wrapper.find('.certificate-sheet').text()).toContain('This certifies that')
    expect(wrapper.find('.certificate-sheet').text()).toContain('Cohortly')
  })

  it('shows no score, points or other invented achievement', async () => {
    const { wrapper } = await page()

    await waitForText(wrapper, 'Certificate of Completion')
    expect(wrapper.find('.certificate-sheet').text()).not.toMatch(/score|points|rank|%|grade/i)
    expect(wrapper.find('.certificate-sheet img').exists()).toBe(false) // no fake signature image
  })

  it('has the print actions: Print / Save as PDF (the browser print), Verify and Back to course', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const { wrapper } = await page()

    await waitForText(wrapper, 'Certificate of Completion')

    const actions = wrapper.find('[role="group"][aria-label="Certificate actions"]')

    expect(actions.findAll('button, a').map((el) => el.text())).toEqual(['Print / Save as PDF', 'Verify certificate', 'Back to course'])
    expect(actions.find(`a[href="/certificates/verify/${CERT_NUMBER}"]`).exists()).toBe(true)
    expect(actions.find('a[href="/student/courses/course-1"]').exists()).toBe(true)

    await click(wrapper, 'Print / Save as PDF')
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('prints ONLY the certificate: shell, header, links and buttons are print:hidden', async () => {
    const { wrapper } = await page()

    await waitForText(wrapper, 'Certificate of Completion')

    const hidden = (selector) => wrapper.find(selector).classes().some((name) => name === 'print:hidden' || name === 'print:!hidden')

    expect(hidden('aside#primary-navigation')).toBe(true)
    expect(hidden('header')).toBe(true) // the mobile top bar
    expect(hidden('[role="group"][aria-label="Certificate actions"]')).toBe(true)
    expect(hidden('[data-testid="toast-region"]')).toBe(true)
    expect(wrapper.find('main > div').exists()).toBe(true)

    const printables = wrapper.findAll('main *').filter((el) => el.classes().includes('certificate-sheet'))

    expect(printables).toHaveLength(1)
    expect(wrapper.find('main p.print\\:hidden').exists()).toBe(true) // back link and hint
  })

  it('the stylesheet gives the sheet its own A4 landscape print page', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')

    expect(css).toContain('@page certificate')
    expect(css).toContain('size: A4 landscape')
    expect(css).toMatch(/\.certificate-sheet\s*\{[^}]*page: certificate/)
    expect(css).toContain('print-color-adjust: exact')
  })

  it('another account (404) and an unknown number show the same calm "not found"', async () => {
    const { wrapper } = await openStudentApp('/student/certificates/COH-2026-ZZZZZZZZ', { routes: certified().routes })

    await waitForText(wrapper, 'Certificate not found')
    expect(wrapper.text()).toContain('does not exist, or it belongs to another account')
    expect(wrapper.find('.certificate-sheet').exists()).toBe(false)
  })

  it('has loading and error states', async () => {
    const { wrapper } = await openStudentApp(`/student/certificates/${CERT_NUMBER}`, { routes: { [`GET /api/my-certificates/:number`]: reply(500, { message: 'Certificate store down' }) } })

    await waitForText(wrapper, 'Certificate store down')
    expect(wrapper.text()).toContain('We could not load the certificate')
  })
})

describe('certificates stay available when the workspace is NOT active (an issued record, not learning content)', () => {
  it.each(['EXPIRED', 'PENDING', 'FAILED', 'NONE'])('a student with a %s workspace can open the list and a certificate', async (status) => {
    const routes = certified().routes
    const list = await openStudentApp('/student/certificates', { routes, user: student(status) })

    await waitForText(list.wrapper, CERT_NUMBER)
    expect(list.router.currentRoute.value.name).toBe(R.STUDENT_CERTIFICATES)
    expect(list.auth.isAuthenticated).toBe(true)

    const one = await openStudentApp(`/student/certificates/${CERT_NUMBER}`, { routes, user: student(status) })

    await waitForText(one.wrapper, 'Certificate of Completion')
    expect(one.router.currentRoute.value.name).toBe(R.STUDENT_CERTIFICATE)
    expect(one.wrapper.text()).not.toMatch(BILLING_WORDS)
    expect(one.wrapper.find('nav[aria-label="Main"]').text()).not.toMatch(BILLING_WORDS)
  })

  it('while learning pages are blocked: learning routes redirect, the certificate does not', async () => {
    const routes = certified().routes
    const { router, fake } = await openStudentApp('/student/courses/course-1', { routes, user: student('EXPIRED') })

    expect(router.currentRoute.value.name).toBe(R.STUDENT_WORKSPACE_INACTIVE)
    expect(fake.calls.filter((c) => c.url.startsWith('/api/students-courses'))).toHaveLength(0)

    await router.push(`/student/certificates/${CERT_NUMBER}`)
    expect(router.currentRoute.value.name).toBe(R.STUDENT_CERTIFICATE)
  })

  it('the inactive page points to the certificates, with neutral wording', async () => {
    const { wrapper } = await openStudentApp('/student', { user: student('EXPIRED') })

    await waitForText(wrapper, 'Learning is paused')
    expect(wrapper.text()).toContain('Certificates you have already earned stay available')
    expect(wrapper.find('main a[href="/student/certificates"]').exists()).toBe(true)
    expect(wrapper.text()).not.toMatch(BILLING_WORDS)
  })

  it('who may open the private pages: anonymous visitors sign in, instructors go home', async () => {
    const anon = createTestApp()

    await anon.router.push(`/student/certificates/${CERT_NUMBER}`)
    expect(anon.router.currentRoute.value.name).toBe(R.STUDENT_SIGN_IN)

    const { router } = await openInstructorApp('/student/certificates', { user: instructor('ACTIVE') })

    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_DASHBOARD)
  })
})

describe('public verification', () => {
  const routes = () => certified().routes

  it('works without any sign-in and shows only the printed details', async () => {
    const { wrapper, auth, fake } = await openAnonymous(`/certificates/verify/${CERT_NUMBER}`, routes())

    await waitForText(wrapper, 'Valid certificate')

    const card = wrapper.find('[data-testid="verification-valid"]')

    expect(auth.isAuthenticated).toBe(false)
    expect(card.text()).toContain('Test User')
    expect(card.text()).toContain('Intro to Vue')
    expect(card.text()).toContain('Ina Instructor')
    expect(card.text()).toContain(CERT_NUMBER)
    expect(card.text()).toContain('Only the details printed on the certificate are shown here.')
    expect(fake.calls.map((c) => c.url)).toEqual([`/api/certificates/verify/${CERT_NUMBER}`])
    expect(fake.calls[0].config.headers.Authorization).toBeUndefined()
  })

  it('shows no private data: no email, ids, scores, attempts or subscription', async () => {
    const { wrapper } = await openAnonymous(`/certificates/verify/${CERT_NUMBER}`, routes())

    await waitForText(wrapper, 'Valid certificate')
    expect(wrapper.text()).not.toMatch(/@|score|attempt|subscription|billing|student id|%/i)
    expect(wrapper.html()).not.toMatch(/user@test|course-1/)
  })

  it('an unknown number is a calm "Certificate not found" and no error screen', async () => {
    const { wrapper } = await openAnonymous('/certificates/verify/COH-2026-ZZZZZZZZ', routes())

    await waitForText(wrapper, 'Certificate not found')
    expect(wrapper.find('h1').text()).toBe('Certificate not found')
    expect(wrapper.text()).toContain('Check the number and try again.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Valid certificate')
  })

  it('a network failure is an error with retry, not "not found"', async () => {
    let calls = 0
    const { wrapper } = await openAnonymous(`/certificates/verify/${CERT_NUMBER}`, {
      [`GET /api/certificates/verify/:number`]: (call) => {
        calls += 1

        if (calls === 1) throw new AxiosError('Network Error', 'ERR_NETWORK')

        return routes()['GET /api/certificates/verify/:number'](call)
      },
    })

    await waitForText(wrapper, 'Cannot reach the server')
    expect(wrapper.text()).not.toContain('Certificate not found')
    await click(wrapper, 'Try again')
    await waitForText(wrapper, 'Valid certificate')
  })

  it('is also reachable while signed in, and a stale or rejected session does not break it', async () => {
    const { wrapper } = await openStudentApp(`/certificates/verify/${CERT_NUMBER}`, { routes: routes(), user: student('EXPIRED') })

    await waitForText(wrapper, 'Valid certificate')
  })

  it('has a lookup page: the ID is normalised and checked, an empty ID is refused', async () => {
    const { wrapper, router } = await openAnonymous('/certificates/verify', routes())

    await waitForText(wrapper, 'Verify a certificate')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Enter the certificate ID printed on the certificate.')

    await wrapper.find('input').setValue(`  ${CERT_NUMBER.toLowerCase()} `)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForRoute(router, R.CERTIFICATE_VERIFY)
    expect(router.currentRoute.value.params.certificateNumber).toBe(CERT_NUMBER)
    await waitForText(wrapper, 'Valid certificate')
  })

  it('the home page links to it', async () => {
    const { wrapper } = await openAnonymous('/')

    await waitForText(wrapper, 'Build a class.')
    expect(wrapper.find('footer a[href="/certificates/verify"]').text()).toBe('Verify a certificate')
  })

  it('verification pages have the document title', async () => {
    await openAnonymous(`/certificates/verify/${CERT_NUMBER}`, routes())
    await vi.waitFor(() => expect(document.title).toBe('Certificate verification · Cohortly'))
  })
})
