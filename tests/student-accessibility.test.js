import { describe, expect, it } from 'vitest'
import axe from 'axe-core'
import { reply } from './fakeApi.js'
import { student } from './helpers.js'
import { makeLearningBackend, sectionOf, standardCourse, textLesson, videoLesson } from './learningBackend.js'
import { waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

// Structural accessibility checks (axe-core, WCAG 2.0/2.1 A and AA) on representative student
// pages. jsdom has no layout, so colour contrast and visual overflow are checked by hand
// (see the README) and are disabled here.
// axe cannot enter an iframe in jsdom, so the YouTube frame is left out of the audit; its
// title is asserted directly in the video test.
const audit = async (wrapper) => {
  const result = await axe.run({ include: [wrapper.element.parentElement ?? document.body], exclude: [['iframe']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })

  return result.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.html.slice(0, 90)).join(' | ')}`)
}

const COURSE = '/student/courses/course-1'

describe('student accessibility (axe, structural rules)', () => {
  it('dashboard with a Continue learning card', async () => {
    const { backend } = standardCourse()
    const { wrapper } = await openStudentApp('/student', { routes: backend.routes })

    await waitForText(wrapper, 'Continue learning')
    expect(await audit(wrapper)).toEqual([])
  })

  it('dashboard with no courses and with a failing request', async () => {
    const empty = await openStudentApp('/student')

    await waitForText(empty.wrapper, 'not enrolled')
    expect(await audit(empty.wrapper)).toEqual([])

    const failing = await openStudentApp('/student', { routes: { 'GET /api/students-courses': reply(500, { message: 'Broken' }) } })

    await waitForText(failing.wrapper, 'Broken')
    expect(await audit(failing.wrapper)).toEqual([])
  })

  it('my courses (not started, in progress and completed)', async () => {
    const { backend } = standardCourse()
    const base = backend.summary()
    const rows = [
      { ...base, _id: 'a', name: 'Alpha' },
      { ...base, _id: 'b', name: 'Bravo', progress: { completedLessons: 1, totalLessons: 3, percent: 33, completed: false } },
      { ...base, _id: 'c', name: 'Charlie', progress: { completedLessons: 3, totalLessons: 3, percent: 100, completed: true }, nextLesson: null },
    ]
    const { wrapper } = await openStudentApp('/student/courses', { routes: { 'GET /api/students-courses': rows } })

    await waitForText(wrapper, 'Charlie')
    expect(await audit(wrapper)).toEqual([])
  })

  it('course page with its outline', async () => {
    const { backend, sections } = standardCourse()

    backend.state.completed.set(sections[0].lessons[0]._id, '2026-05-20T10:00:00.000Z')

    const { wrapper } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course outline')
    expect(await audit(wrapper)).toEqual([])
  })

  it('completed course page', async () => {
    const { backend, sections } = standardCourse()

    sections.flatMap((s) => s.lessons).forEach((l) => backend.state.completed.set(l._id, '2026-05-20T10:00:00.000Z'))

    const { wrapper } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course completed')
    expect(await audit(wrapper)).toEqual([])
  })

  it('text lesson, with rich sanitized content', async () => {
    const html = '<h2>Topic</h2><p>Some <strong>text</strong> and a <a href="https://example.com" rel="noopener noreferrer">link</a>.</p><ul><li>a</li></ul><figure class="table"><table><tbody><tr><th>H</th></tr><tr><td>v</td></tr></tbody></table></figure>'
    const sections = [sectionOf('Basics', [textLesson('Rich', html), textLesson('Other')])]
    const backend = makeLearningBackend({ sections })
    const { wrapper } = await openStudentApp(`${COURSE}/lessons/${sections[0].lessons[0]._id}`, { routes: backend.routes })

    await waitForText(wrapper, 'Rich')
    expect(await audit(wrapper)).toEqual([])
  })

  it('video lesson (the iframe has a title) and a completed lesson', async () => {
    const sections = [sectionOf('Basics', [videoLesson('Watch'), textLesson('After')])]
    const backend = makeLearningBackend({ sections, completed: [sections[0].lessons[0]._id] })
    const { wrapper } = await openStudentApp(`${COURSE}/lessons/${sections[0].lessons[0]._id}`, { routes: backend.routes })

    await waitForText(wrapper, 'Mark as incomplete')
    expect(wrapper.find('iframe').attributes('title')).toBe('Video: Watch')
    expect(await audit(wrapper)).toEqual([])
  })

  it('lesson page while a completion failed', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper } = await openStudentApp(`${COURSE}/lessons/${sections[0].lessons[0]._id}`, {
      routes: { ...backend.routes, 'PUT /api/lessons/:lessonId/completion': reply(500, { message: 'Could not save' }) },
    })

    await waitForText(wrapper, 'What is Vue')
    await wrapper.findAll('button').find((b) => b.text() === 'Mark as complete').trigger('click')
    await waitForText(wrapper, 'Could not save')
    expect(await audit(wrapper)).toEqual([])
  })

  it('unavailable course and inactive workspace pages', async () => {
    const gone = await openStudentApp(COURSE, { routes: { 'GET /api/students-courses/:courseId': reply(404, { message: 'x' }) } })

    await waitForText(gone.wrapper, 'no longer available')
    expect(await audit(gone.wrapper)).toEqual([])

    const paused = await openStudentApp('/student', { user: student('EXPIRED') })

    await waitForText(paused.wrapper, 'Learning is paused')
    expect(await audit(paused.wrapper)).toEqual([])
  })
})

describe('learning controls have accessible names', () => {
  it('names the progress bar, the completion buttons, the navigation landmarks and the outline links', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper } = await openStudentApp(`${COURSE}/lessons/${sections[0].lessons[1]._id}`, { routes: backend.routes })

    await waitForText(wrapper, 'Install it')

    expect(wrapper.find('[role="progressbar"]').attributes('aria-label')).toBe('Progress in Intro to Vue')
    expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe('Lesson completion')
    expect(wrapper.find('nav[aria-label="Lesson navigation"]').exists()).toBe(true)
    expect(wrapper.find('nav[aria-label="Breadcrumb"]').exists()).toBe(true)
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(expect.arrayContaining(['Complete and continue', 'Mark as complete']))
    expect(wrapper.find('h1').text()).toBe('Install it')
  })

  it('shows completion with words, not colour alone', async () => {
    const { backend, sections } = standardCourse()

    backend.state.completed.set(sections[0].lessons[0]._id, '2026-05-20T10:00:00.000Z')

    const { wrapper } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course outline')

    const links = wrapper.findAll('nav[aria-label="Course outline"] ol ol a')

    expect(links[0].text()).toContain('Completed')
    expect(links[1].text()).toContain('Not completed')
    expect(links[0].find('svg').attributes('aria-hidden')).toBe('true')
  })
})
