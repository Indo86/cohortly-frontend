import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import axe from 'axe-core'
import App from '@/App.vue'
import { aLesson, aSection, makeCourseBackend } from './data.js'
import { createTestApp } from './helpers.js'
import { aQuestion, CERT_NUMBER, finishLessons, makeInstructorQuizBackend, makeStudentQuizBackend } from './quizBackend.js'
import { click, dialog, openInstructorApp, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

// Each test mounts the real app and runs axe several times, which is slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 })

// Structural accessibility (axe-core, WCAG 2.0/2.1 A and AA) of the M8 pages: the instructor quiz
// editor, the student quiz, the certificate and the public verification pages. Colour contrast is
// reviewed separately in a real browser (jsdom has no layout).
const audit = async (wrapper) => {
  const result = await axe.run({ include: [wrapper.element.parentElement ?? document.body], exclude: [['iframe']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })

  return result.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.html.slice(0, 100)).join(' | ')}`)
}

const instructorQuiz = (quiz) => {
  const course = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One')])] })
  const quizBackend = makeInstructorQuizBackend({ quiz })

  return { ...course.routes, ...quizBackend.routes }
}
const withQuestions = (...questions) => ({ _id: 'quiz-1', course: 'course-1', title: 'Final quiz', passingScore: 70, questions })

const openAnonymous = async (path, routes) => {
  const app = createTestApp({ routes })

  await app.router.push(path)

  const wrapper = mount(App, { attachTo: document.body, global: { plugins: app.plugins } })

  await flushPromises()

  return wrapper
}

describe('instructor quiz editor', () => {
  it('no quiz yet, and a quiz with questions, readiness and settings', async () => {
    const empty = await openInstructorApp('/instructor/courses/course-1/quiz', { routes: instructorQuiz(null) })

    await waitForText(empty.wrapper, 'This course has no final quiz')
    expect(await audit(empty.wrapper)).toEqual([])

    const full = await openInstructorApp('/instructor/courses/course-1/quiz', { routes: instructorQuiz(withQuestions(aQuestion('What is Vue?'), aQuestion('Why?'))) })

    await waitForText(full.wrapper, 'The quiz is ready')
    expect(await audit(full.wrapper)).toEqual([])
  })

  it('an unfinished quiz warning, the question editor with its radio group, and a confirmation dialog', async () => {
    const broken = await openInstructorApp('/instructor/courses/course-1/quiz', {
      routes: instructorQuiz(withQuestions({ _id: 'q', prompt: 'Broken?', options: [{ _id: 'o', text: 'Only', isCorrect: true }] })),
    })

    await waitForText(broken.wrapper, 'Students cannot take this quiz yet')
    expect(await audit(broken.wrapper)).toEqual([])

    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/quiz', { routes: instructorQuiz(withQuestions(aQuestion('Edit me?'))) })

    await waitForText(wrapper, 'Edit me?')
    await click(wrapper, 'Edit question 1')

    const group = wrapper.find('fieldset')

    expect(group.find('legend').text()).toContain('Answer options')
    expect(group.findAll('input[type="radio"]').every((r) => r.attributes('aria-label')?.match(/^Option \d is the correct answer$/))).toBe(true)
    expect(new Set(group.findAll('input[type="radio"]').map((r) => r.attributes('name'))).size).toBe(1) // one radio group
    expect(group.findAll('input[type="text"]').every((i) => wrapper.find(`label[for="${i.attributes('id')}"]`).exists())).toBe(true)
    expect(group.findAll('button[aria-label^="Remove option"]')).toHaveLength(3) // one named remove button per option
    expect(group.findAll('button').every((b) => b.attributes('aria-label') || b.text())).toBe(true)
    expect(await audit(wrapper)).toEqual([])

    // validation errors are tied to their fields
    await wrapper.find('input[placeholder="Option 1"]').setValue('')
    await wrapper.findAll('form').find((f) => f.find('textarea').exists()).trigger('submit.prevent')
    expect(wrapper.find('input[placeholder="Option 1"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('input[placeholder="Option 1"]').attributes('aria-describedby')).toBeTruthy()
    expect(await audit(wrapper)).toEqual([])
  })

  it('the delete-question and delete-quiz dialogs', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/quiz', { routes: instructorQuiz(withQuestions(aQuestion('Delete me?'))) })

    await waitForText(wrapper, 'Delete me?')
    await click(wrapper, 'Delete question 1')
    expect(dialog(wrapper).find('h2').text()).toContain('Delete question 1?')
    expect(document.activeElement.textContent.trim()).toBe('Cancel')
    expect(await audit(wrapper)).toEqual([])
    await click(dialog(wrapper), 'Cancel')

    await click(wrapper, 'Delete quiz')
    expect(dialog(wrapper).find('h2').text()).toBe('Delete the final quiz?')
    expect(await audit(wrapper)).toEqual([])
  })
})

describe('student quiz', () => {
  const unlocked = () => {
    const backend = makeStudentQuizBackend()

    finishLessons(backend)

    return backend
  }

  it('the course page with a locked and an available quiz card', async () => {
    const locked = await openStudentApp('/student/courses/course-1', { routes: makeStudentQuizBackend().routes })

    await waitForText(locked.wrapper, 'Complete all lessons to unlock the final quiz.')
    expect(await audit(locked.wrapper)).toEqual([])

    const open = await openStudentApp('/student/courses/course-1', { routes: unlocked().routes })

    await waitForText(open.wrapper, 'Take final quiz')
    expect(await audit(open.wrapper)).toEqual([])
  })

  it('the quiz form: every question is a labelled radio group, and the error summary', async () => {
    const { wrapper } = await openStudentApp('/student/courses/course-1/quiz', { routes: unlocked().routes })

    await waitForText(wrapper, 'Question 1?')

    const groups = wrapper.findAll('fieldset')

    expect(groups).toHaveLength(3)
    expect(groups.every((g) => g.find('legend').text().length > 0)).toBe(true)
    expect(groups.every((g) => g.findAll('input[type="radio"]').length === 3)).toBe(true)
    expect(groups.every((g) => new Set(g.findAll('input[type="radio"]').map((r) => r.attributes('name'))).size === 1)).toBe(true)
    expect(await audit(wrapper)).toEqual([])

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.find('[data-testid="quiz-error-summary"]').exists()).toBe(true)
    expect(await audit(wrapper)).toEqual([])
  })

  it('a failed result, a passed result and the locked page', async () => {
    const backend = unlocked()
    const { wrapper } = await openStudentApp('/student/courses/course-1/quiz', { routes: backend.routes })

    await waitForText(wrapper, 'Question 1?')

    for (const [index] of [[1], [2], [3]]) await wrapper.findAll('fieldset')[index - 1].findAll('input[type="radio"]')[1].setValue(true)

    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Not passed this time')
    expect(await audit(wrapper)).toEqual([])

    await click(wrapper, 'Retry quiz')
    for (const index of [1, 2, 3]) await wrapper.findAll('fieldset')[index - 1].findAll('input[type="radio"]')[0].setValue(true)

    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'You passed')
    expect(await audit(wrapper)).toEqual([])

    const locked = await openStudentApp('/student/courses/course-1/quiz', { routes: makeStudentQuizBackend().routes })

    await waitForText(locked.wrapper, 'The final quiz is locked')
    expect(await audit(locked.wrapper)).toEqual([])
  })
})

describe('certificates', () => {
  const certified = () => {
    const backend = makeStudentQuizBackend({ withQuiz: false })

    finishLessons(backend)
    backend.issueIfDue()

    return backend.routes
  }

  it('the list, the certificate and its not-found state', async () => {
    const list = await openStudentApp('/student/certificates', { routes: certified() })

    await waitForText(list.wrapper, CERT_NUMBER)
    expect(await audit(list.wrapper)).toEqual([])

    const one = await openStudentApp(`/student/certificates/${CERT_NUMBER}`, { routes: certified() })

    await waitForText(one.wrapper, 'Certificate of Completion')
    expect(one.wrapper.find('article[aria-labelledby="certificate-title"] h2#certificate-title').exists()).toBe(true)
    expect(one.wrapper.find('h1').text()).toContain('Certificate of Completion: Intro to Vue')
    expect(await audit(one.wrapper)).toEqual([])

    const missing = await openStudentApp('/student/certificates/COH-2026-ZZZZZZZZ', { routes: certified() })

    await waitForText(missing.wrapper, 'Certificate not found')
    expect(await audit(missing.wrapper)).toEqual([])

    const empty = await openStudentApp('/student/certificates')

    await waitForText(empty.wrapper, 'You have no certificates yet')
    expect(await audit(empty.wrapper)).toEqual([])
  })

  it('the public verification pages: valid, not found, lookup', async () => {
    const valid = await openAnonymous(`/certificates/verify/${CERT_NUMBER}`, certified())

    await waitForText(valid, 'Valid certificate')
    expect(valid.find('h1').text()).toBe('Valid certificate')
    expect(await audit(valid)).toEqual([])

    const unknown = await openAnonymous('/certificates/verify/COH-2026-ZZZZZZZZ', certified())

    await waitForText(unknown, 'Certificate not found')
    expect(await audit(unknown)).toEqual([])

    const lookup = await openAnonymous('/certificates/verify', certified())

    await waitForText(lookup, 'Verify a certificate')
    await lookup.find('form').trigger('submit.prevent')
    expect(lookup.find('input').attributes('aria-invalid')).toBe('true')
    expect(await audit(lookup)).toEqual([])
  })

  it('the public pages have a skip link and a main landmark', async () => {
    const wrapper = await openAnonymous(`/certificates/verify/${CERT_NUMBER}`, certified())

    await waitForText(wrapper, 'Valid certificate')
    expect(wrapper.find('a[href="#main"]').exists()).toBe(true)
    expect(wrapper.find('main#main').exists()).toBe(true)
  })
})
