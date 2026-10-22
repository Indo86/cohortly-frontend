import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { R } from '@/constants/routes.js'
import { reply } from './fakeApi.js'
import { createTestApp, instructor, student } from './helpers.js'
import { standardCourse } from './learningBackend.js'
import { click, openInstructorApp, waitForRoute, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

const COURSE = '/student/courses/course-1'
const INACTIVE = { message: 'Workspace is not active', code: 'WORKSPACE_ACCESS_INACTIVE', accessStatus: 'EXPIRED', accessExpiresAt: '2026-05-01T00:00:00.000Z' }
const BILLING_WORDS = /renew|subscribe|subscription|billing|payment|checkout|pay now/i

const LEARNING_PATHS = ['/student', '/student/courses', COURSE, `${COURSE}/lessons/lesson-1`]

// the student stays signed in on the inactive page, which offers no way to pay
const expectPausedStudent = async ({ auth, router, wrapper }) => {
  await waitForRoute(router, R.STUDENT_WORKSPACE_INACTIVE)
  await waitForText(wrapper, 'Learning is paused')

  expect(auth.isAuthenticated).toBe(true)
  expect(localStorage.getItem('lms.token')).toBe('test-token')
  expect(auth.accessStatus).toBe('EXPIRED')
  expect(wrapper.text()).not.toMatch(BILLING_WORDS)
  expect(wrapper.find('nav[aria-label="Main"]').text()).not.toMatch(BILLING_WORDS)
}

describe('WORKSPACE_ACCESS_INACTIVE during learning', () => {
  it('on the course fetch', async () => {
    const app = await openStudentApp(COURSE, { routes: { 'GET /api/students-courses/:courseId': reply(403, INACTIVE) } })

    await expectPausedStudent(app)
  })

  it('on the lesson fetch', async () => {
    const app = await openStudentApp(`${COURSE}/lessons/lesson-1`, {
      routes: { 'GET /api/students-courses/:courseId/lessons/:lessonId': reply(403, INACTIVE), 'GET /api/students-courses/:courseId': reply(403, INACTIVE) },
    })

    await expectPausedStudent(app)
  })

  it('on the dashboard fetch', async () => {
    const app = await openStudentApp('/student', { routes: { 'GET /api/students-courses': reply(403, INACTIVE) } })

    await expectPausedStudent(app)
  })

  it('on the completion mutation while reading a lesson, without applying the completion', async () => {
    const { backend, sections } = standardCourse()
    const app = await openStudentApp(`${COURSE}/lessons/${sections[0].lessons[0]._id}`, {
      routes: { ...backend.routes, 'PUT /api/lessons/:lessonId/completion': reply(403, INACTIVE) },
    })

    await waitForText(app.wrapper, 'What is Vue')
    await click(app.wrapper, 'Complete and continue')
    await expectPausedStudent(app)

    expect(backend.state.completed.size).toBe(0)
  })

  it('on the undo mutation', async () => {
    const { backend, sections } = standardCourse()

    backend.state.completed.set(sections[0].lessons[0]._id, '2026-05-20T10:00:00.000Z')

    const app = await openStudentApp(`${COURSE}/lessons/${sections[0].lessons[0]._id}`, {
      routes: { ...backend.routes, 'DELETE /api/lessons/:lessonId/completion': reply(403, INACTIVE) },
    })

    await waitForText(app.wrapper, 'Mark as incomplete')
    await click(app.wrapper, 'Mark as incomplete')
    await expectPausedStudent(app)
  })

  it('recovers: Check again returns the student to the learning area with progress intact', async () => {
    const { backend, sections } = standardCourse()

    backend.state.completed.set(sections[0].lessons[0]._id, '2026-05-20T10:00:00.000Z')

    const app = await openStudentApp(COURSE, { routes: { ...backend.routes, 'GET /api/students-courses/:courseId': reply(403, INACTIVE) } })

    await expectPausedStudent(app)

    // still expired: stays on the page and says so
    app.fake.set('GET /api/me', student('EXPIRED', { token: 'test-token' }))
    await click(app.wrapper, 'Check again')
    await waitForText(app.wrapper, 'The workspace is still not active')

    // the instructor renewed
    app.fake.set('GET /api/me', student('ACTIVE'))
    app.fake.set('GET /api/students-courses/:courseId', backend.routes['GET /api/students-courses/:courseId'])
    await click(app.wrapper, 'Check again')
    await waitForRoute(app.router, R.STUDENT_DASHBOARD)

    await app.router.push(COURSE)
    await waitForText(app.wrapper, 'Course outline')
    expect(app.wrapper.text()).toContain('1 of 3 lessons')
  })
})

describe('who can reach the learning pages', () => {
  it.each(['NONE', 'PENDING', 'FAILED', 'EXPIRED'])('a student with a %s workspace is sent to the inactive page and no learning API is called', async (status) => {
    for (const path of LEARNING_PATHS) {
      const { router, fake, auth } = await openStudentApp(path, { user: student(status) })

      expect(router.currentRoute.value.name, path).toBe(R.STUDENT_WORKSPACE_INACTIVE)
      expect(auth.isAuthenticated).toBe(true)
      expect(fake.calls.filter((call) => call.url.startsWith('/api/students-courses') || call.url.includes('/completion')), path).toHaveLength(0)
    }
  })

  it.each(LEARNING_PATHS)('an anonymous visitor is sent to the student sign-in from %s', async (path) => {
    const app = createTestApp()

    await app.router.push(path)

    expect(app.router.currentRoute.value.name).toBe(R.STUDENT_SIGN_IN)
    expect(app.router.currentRoute.value.query.redirect).toBe(path)
    expect(app.fake.calls.filter((call) => call.url.startsWith('/api/students-courses'))).toHaveLength(0)
  })

  it.each(LEARNING_PATHS)('an instructor cannot open %s and no student API is called', async (path) => {
    const { router, fake } = await openInstructorApp(path, { user: instructor('ACTIVE') })

    expect(router.currentRoute.value.name).toBe(R.INSTRUCTOR_DASHBOARD)
    expect(fake.calls.filter((call) => call.url.startsWith('/api/students-courses'))).toHaveLength(0)
  })

  it('the student menu has Dashboard, My Courses, Certificates only (Profile is in the account menu)', async () => {
    const { wrapper } = await openStudentApp('/student')

    await waitForText(wrapper, 'Welcome')
    expect(wrapper.findAll('nav[aria-label="Main"] a').map((a) => a.text())).toEqual(['Dashboard', 'My Courses', 'Certificates'])
  })

  it('401 on a learning request ends the session and clears the cached learning data', async () => {
    const { backend } = standardCourse()
    const { auth, router, queryClient, wrapper, fake } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course outline')
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0)

    fake.set('GET /api/students-courses', reply(401, { message: 'Invalid or expired token' }))
    await router.push('/student/courses')

    await waitForRoute(router, R.STUDENT_SIGN_IN)
    expect(auth.isAuthenticated).toBe(false)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})

describe('course availability changes (404)', () => {
  it('shows an unavailable course truthfully, keeps the session and reveals nothing else', async () => {
    const app = await openStudentApp(COURSE, { routes: { 'GET /api/students-courses/:courseId': reply(404, { message: 'Course not found' }) } })

    await waitForText(app.wrapper, 'This course is no longer available')

    expect(app.auth.isAuthenticated).toBe(true)
    expect(app.router.currentRoute.value.name).toBe(R.STUDENT_COURSE)
    expect(app.wrapper.text().toLowerCase()).not.toMatch(/draft|owner|instructor|unenrolled/)
    expect(app.wrapper.text()).toContain('Back to My Courses')
  })

  it('an unpublish while the student is on the course shows the unavailable state on the next request; republishing brings progress back', async () => {
    const { backend, sections } = standardCourse()

    backend.state.completed.set(sections[0].lessons[0]._id, '2026-05-20T10:00:00.000Z')

    const { wrapper, router, auth } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, '1 of 3 lessons')

    // the instructor unpublishes (or unenrolls the student): 404 from now on
    backend.state.available = false
    await router.push('/student/courses')
    await waitForText(wrapper, 'You are not enrolled in any course yet')
    await router.push(COURSE)
    await waitForText(wrapper, 'This course is no longer available')
    expect(auth.isAuthenticated).toBe(true)

    // republished: the student's progress was never touched
    backend.state.available = true
    await router.push('/student/courses')
    await waitForText(wrapper, '1 of 3 lessons')
    await router.push(COURSE)
    await waitForText(wrapper, 'Course outline')
    expect(wrapper.text()).not.toContain('no longer available')
  })

  it('a completion refused with 404 (course unpublished while reading) shows an error and keeps the session', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper, auth, router } = await openStudentApp(`${COURSE}/lessons/${sections[0].lessons[0]._id}`, { routes: backend.routes })

    await waitForText(wrapper, 'What is Vue')
    backend.state.available = false
    await click(wrapper, 'Mark as complete')
    await waitForText(wrapper, 'Course not found')

    expect(auth.isAuthenticated).toBe(true)
    expect(router.currentRoute.value.name).toBe(R.STUDENT_LESSON)
    expect(wrapper.text()).toContain('Not completed')
  })

  it('a lesson that no longer exists is unavailable, not a sign-out', async () => {
    const { backend } = standardCourse()
    const { wrapper, auth } = await openStudentApp(`${COURSE}/lessons/gone`, { routes: backend.routes })

    await waitForText(wrapper, 'This lesson is no longer available')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('network failure is an error with retry, not an unavailable course', async () => {
    const { wrapper } = await openStudentApp(COURSE, { routes: { 'GET /api/students-courses/:courseId': reply(503, { message: 'Try later' }) } })

    await waitForText(wrapper, 'Try later')
    await flushPromises()
    expect(wrapper.text()).not.toContain('no longer available')
    expect(wrapper.text()).toContain('Try again')
  })
})
