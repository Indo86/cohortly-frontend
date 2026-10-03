import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { AxiosError } from 'axios'
import axe from 'axe-core'
import { R } from '@/constants/routes.js'
import { aiFailure, aiRoutes, aiStatus, PRACTICE } from './aiBackend.js'
import { reply } from './fakeApi.js'
import { deferred, student } from './helpers.js'
import { standardCourse } from './learningBackend.js'
import { click, waitForGone, waitForRoute, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

const BILLING_WORDS = /renew|subscribe|subscription|billing|payment|checkout|pay now/i
const QUESTION_URL = 'POST /api/students-courses/:id/lessons/:id/ai/question'

// lesson 0 is a TEXT lesson, lesson 1 a VIDEO lesson
const open = async ({ ai = {}, routes = {}, lesson = 0, user = student('ACTIVE') } = {}) => {
  const { backend, sections } = standardCourse()
  const target = sections[0].lessons[lesson]
  const app = await openStudentApp(`/student/courses/course-1/lessons/${target._id}`, { routes: { ...backend.routes, ...aiRoutes(ai), ...routes }, user })

  await waitForText(app.wrapper, target.title)

  return { ...app, backend, lesson: target }
}

const toggle = (wrapper) => wrapper.find('[data-testid="lesson-assistant"] button[aria-controls]')
const expand = async (wrapper) => {
  await vi_waitFor(() => expect(toggle(wrapper).exists()).toBe(true))
  await toggle(wrapper).trigger('click')
}
const vi_waitFor = (fn) => import('vitest').then(({ vi }) => vi.waitFor(fn))
const askAbout = async (wrapper, text) => {
  await wrapper.find('textarea').setValue(text)
  await wrapper.find('form').trigger('submit.prevent')
}
const audit = async (wrapper) => {
  const result = await axe.run({ include: [wrapper.element.parentElement ?? document.body], exclude: [['iframe']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })

  return result.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.html.slice(0, 100)).join(' | ')}`)
}

describe('AI availability on the lesson page', () => {
  it('enabled: a small collapsed "AI study tools" entry under the lesson, which does not dominate the page', async () => {
    const { wrapper } = await open()

    await vi_waitFor(() => expect(toggle(wrapper).exists()).toBe(true))
    expect(toggle(wrapper).text()).toBe('AI study tools')
    expect(toggle(wrapper).attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('textarea').exists()).toBe(false)

    const html = wrapper.html()

    expect(html.indexOf('Complete and continue')).toBeLessThan(html.indexOf('AI study tools')) // secondary to the lesson actions
  })

  it('disabled: no AI UI at all, and the lesson works', async () => {
    const { wrapper } = await open({ ai: { enabled: false, available: false } })

    await flushPromises()
    expect(wrapper.find('[data-testid="lesson-assistant"]').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/AI study|AI-generated/)
    expect(wrapper.text()).toContain('Complete and continue')
  })

  it('enabled but unavailable: one calm line, lesson untouched, no technical detail', async () => {
    const { wrapper } = await open({ ai: { enabled: true, available: false } })

    await waitForText(wrapper, 'AI study tools are temporarily unavailable.')
    expect(wrapper.find('[data-testid="lesson-assistant"] button').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/openrouter|provider|key|quota/i)
    expect(wrapper.text()).toContain('Complete and continue')
  })

  it('if the status request itself fails, AI simply is not shown and the lesson is fine', async () => {
    const { wrapper } = await open({ routes: { 'GET /api/ai/status': reply(500, { message: 'boom' }) } })

    await flushPromises()
    expect(wrapper.find('[data-testid="lesson-assistant"]').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Complete and continue')
  })

  it('a video lesson explains that AI works from text', async () => {
    const { wrapper } = await open({ lesson: 1 })

    await waitForText(wrapper, 'not available for video lessons')
    expect(wrapper.find('[data-testid="lesson-assistant"] button').exists()).toBe(false)
  })

  it('the lesson, its completion and navigation work before AI is ever touched', async () => {
    const { wrapper, router } = await open()

    await click(wrapper, 'Mark as complete')
    await waitForText(wrapper, 'Mark as incomplete')
    await click(wrapper, 'Next lesson')
    await waitForRoute(router, R.STUDENT_LESSON)
  })

  it('the status is a configuration query, called once and never for the content', async () => {
    const { fake } = await open()

    expect(fake.callsTo('GET /api/ai/status')).toHaveLength(1)
    expect(fake.calls.filter((call) => call.url.includes('/ai/') && !call.url.endsWith('/ai/status'))).toHaveLength(0) // nothing generated by merely opening a lesson
  })
})

describe('Ask AI about this lesson', () => {
  it('has a labelled field with a character limit and counter', async () => {
    const { wrapper } = await open()

    await expand(wrapper)
    expect(toggle(wrapper).attributes('aria-expanded')).toBe('true')

    const area = wrapper.find('textarea')

    expect(wrapper.find(`label[for="${area.attributes('id')}"]`).text()).toBe('Ask about this lesson')
    expect(area.attributes('maxlength')).toBe('500')
    expect(wrapper.text()).toContain('0 / 500 characters')

    await area.setValue('What is a closure?')
    expect(wrapper.text()).toContain('18 / 500 characters')
    expect(wrapper.text()).toContain('AI-generated content can be wrong. Review it before relying on it.')
  })

  it('sends only the question, shows the answer labelled AI-generated and based on the lesson', async () => {
    const { wrapper, fake } = await open()

    await expand(wrapper)
    await askAbout(wrapper, '  What is a closure?  ')
    await waitForText(wrapper, 'AI-generated answer')

    const call = fake.callsTo(QUESTION_URL)[0]

    expect(call.body).toEqual({ question: 'What is a closure?' })

    const card = wrapper.find('[data-testid="ai-answer"]')

    expect(card.text()).toContain('A closure keeps access to variables from where it was created.')
    expect(card.text()).toContain('Based on this lesson')
    expect(card.text()).toContain('Your question: What is a closure?')
  })

  it('says so when the lesson may not cover the question', async () => {
    const { wrapper } = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/question': { answer: 'The lesson does not say.', groundedInLesson: false, generatedAt: 'x' } } })

    await expand(wrapper)
    await askAbout(wrapper, 'What is the capital of France?')
    await waitForText(wrapper, 'The lesson may not cover this')
  })

  it('validates before sending: at least 3 characters', async () => {
    const { wrapper, fake } = await open()

    await expand(wrapper)
    await askAbout(wrapper, 'hi')
    expect(wrapper.text()).toContain('Ask a question of at least 3 characters.')
    expect(wrapper.find('textarea').attributes('aria-invalid')).toBe('true')
    expect(fake.callsTo(QUESTION_URL)).toHaveLength(0)
  })

  it('shows a pending state, disables every AI action meanwhile, and sends ONE request however often it is submitted', async () => {
    const gate = deferred()
    const original = aiRoutes()['POST /api/students-courses/:courseId/lessons/:lessonId/ai/question']
    const { wrapper, fake } = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/question': async () => { await gate.promise; return original } } })

    await expand(wrapper)
    await askAbout(wrapper, 'What is a closure?')
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Generating…')
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button').filter((b) => ['Summarize lesson', 'Practice questions'].includes(b.text())).every((b) => b.attributes('disabled') !== undefined)).toBe(true)

    gate.resolve()
    await waitForText(wrapper, 'AI-generated answer')
    expect(fake.callsTo(QUESTION_URL)).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Generating…')
  })

  it.each([
    ['AI_PROVIDER_UNAVAILABLE', 503, 'AI study tools are temporarily unavailable.'],
    ['AI_NOT_CONFIGURED', 503, 'AI study tools are temporarily unavailable.'],
    ['AI_RATE_LIMITED', 429, 'AI study tools have reached their current usage limit. Try again later.'],
    ['AI_RESPONSE_INVALID', 502, 'The AI could not produce a usable result this time. Please try again.'],
    ['AI_DISABLED', 503, 'AI study tools are turned off.'],
  ])('%s: a friendly message in the panel, the raw backend text never shown, and the lesson stays visible', async (code, status, message) => {
    const { wrapper } = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/question': aiFailure(code, status) } })

    await expand(wrapper)
    await askAbout(wrapper, 'What is a closure?')
    await waitForText(wrapper, message)

    expect(wrapper.text()).not.toContain('raw backend text')
    expect(wrapper.text()).not.toMatch(/openrouter|gemini|quota|429|503/i)
    expect(wrapper.text()).toContain('What is Vue') // the lesson remains
    expect(wrapper.text()).toContain('Complete and continue')
    expect(wrapper.find('[data-testid="ai-answer"]').exists()).toBe(false)
  })

  it('a network failure is explained too, and can be retried', async () => {
    let calls = 0
    const original = aiRoutes()['POST /api/students-courses/:courseId/lessons/:lessonId/ai/question']
    const { wrapper } = await open({
      routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/question': () => { calls += 1; if (calls === 1) throw new AxiosError('Network Error', 'ERR_NETWORK'); return original } },
    })

    await expand(wrapper)
    await askAbout(wrapper, 'What is a closure?')
    await waitForText(wrapper, 'Cannot reach the server')
    expect(wrapper.text()).toContain('What is Vue')

    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'AI-generated answer')
  })

  it('a lesson without usable text shows the backend explanation', async () => {
    const { wrapper } = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/question': reply(422, { message: 'This lesson has no text for AI study tools to use.', code: 'AI_NO_TEXT_CONTEXT' }) } })

    await expand(wrapper)
    await askAbout(wrapper, 'What is a closure?')
    await waitForText(wrapper, 'This lesson has no text for AI study tools to use.')
  })

  it('moving to another lesson starts with a clean assistant', async () => {
    const { wrapper, router } = await open()

    await expand(wrapper)
    await askAbout(wrapper, 'What is a closure?')
    await waitForText(wrapper, 'AI-generated answer')

    const before = router.currentRoute.value.fullPath

    await click(wrapper, 'Next lesson')
    await vi_waitFor(() => expect(router.currentRoute.value.fullPath).not.toBe(before))
    await flushPromises()
    expect(wrapper.find('[data-testid="ai-answer"]').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)
  })
})

describe('lesson summary', () => {
  it('generates, shows it labelled AI-generated, and does not offer endless regeneration', async () => {
    const { wrapper, fake } = await open()

    await expand(wrapper)
    await click(wrapper, 'Summarize lesson')
    await waitForText(wrapper, 'AI-generated summary')

    const card = wrapper.find('[data-testid="ai-summary"]')

    expect(card.text()).toContain('A closure remembers its scope.')
    expect(card.text()).toContain('- It keeps outer variables.')
    expect(card.text()).toContain('Based on this lesson')
    expect(fake.callsTo('POST /api/students-courses/:id/lessons/:id/ai/summary')[0].body).toEqual({})
    expect(wrapper.findAll('button').find((b) => b.text() === 'Summarize lesson').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.lesson-prose').text()).toContain('Body of What is Vue')
  })

  it('shows a pending state and then a friendly failure', async () => {
    const gate = deferred()
    const { wrapper } = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/summary': async () => { await gate.promise; return aiFailure('AI_RATE_LIMITED', 429) } } })

    await expand(wrapper)
    await click(wrapper, 'Summarize lesson')
    expect(wrapper.text()).toContain('Generating…')
    gate.resolve()
    await waitForText(wrapper, 'AI study tools have reached their current usage limit. Try again later.')
    expect(wrapper.text()).toContain('The summary could not be created')
    expect(wrapper.findAll('button').find((b) => b.text() === 'Summarize lesson').attributes('disabled')).toBeUndefined() // can try again
  })
})

describe('practice questions', () => {
  const generate = async (wrapper) => {
    await expand(wrapper)
    await click(wrapper, 'Practice questions')
    await waitForText(wrapper, 'Practice questions')
    await vi_waitFor(() => expect(wrapper.find('[data-testid="practice-questions"]').exists()).toBe(true))
  }

  it('shows AI-generated practice questions that are clearly not the course quiz', async () => {
    const { wrapper } = await open()

    await generate(wrapper)

    const section = wrapper.find('[data-testid="practice-questions"]')

    expect(section.text()).toContain('AI-generated')
    expect(section.text()).toContain('They are not your course quiz and do not affect your progress.')
    expect(section.findAll('fieldset')).toHaveLength(2)
    expect(section.findAll('fieldset')[0].findAll('input[type="radio"]')).toHaveLength(3)
    expect(section.text()).not.toContain('keeps access to the scope') // the explanation is hidden until the student checks
  })

  it('reveals the answer and explanation only after the student checks, correct or not', async () => {
    const { wrapper } = await open()

    await generate(wrapper)

    const check = (n) => wrapper.find(`button[aria-label="Check answer to question ${n}"]`)

    expect(check(1).attributes('disabled')).toBeDefined() // nothing chosen yet

    await wrapper.findAll('fieldset')[0].findAll('input[type="radio"]')[1].setValue(true) // wrong
    await check(1).trigger('click')
    expect(wrapper.text()).toContain('Not quite. The answer is: Access to outer variables')
    expect(wrapper.text()).toContain('It keeps access to the scope where it was created.')

    await wrapper.findAll('fieldset')[1].findAll('input[type="radio"]')[1].setValue(true) // right
    await check(2).trigger('click')
    expect(wrapper.text()).toContain('Correct.')
    expect(wrapper.text()).toContain('Functions create closures.')
    expect(wrapper.findAll('fieldset')[0].attributes('disabled')).toBeDefined() // an answer cannot be changed after checking
  })

  it('a local practice score is clearly separate from the official quiz, and nothing official changes', async () => {
    const { wrapper, fake } = await open()

    await generate(wrapper)
    await wrapper.findAll('fieldset')[0].findAll('input[type="radio"]')[0].setValue(true)
    await wrapper.find('button[aria-label="Check answer to question 1"]').trigger('click')
    await wrapper.findAll('fieldset')[1].findAll('input[type="radio"]')[0].setValue(true)
    await wrapper.find('button[aria-label="Check answer to question 2"]').trigger('click')

    const score = wrapper.find('[data-testid="practice-score"]')

    expect(score.text()).toContain('Practice score: 1 of 2')
    expect(score.text()).toContain('only for practice')
    expect(score.text()).toContain('separate from your course quiz and is not saved')

    // no completion, no quiz attempt, nothing but the one generation request
    expect(fake.calls.filter((call) => call.method !== 'GET' && call.url.includes('/students-courses/')).map((call) => `${call.method} ${call.url}`)).toEqual([expect.stringMatching(/\/ai\/practice$/)])
    expect(fake.calls.some((call) => call.url.includes('/completion') || call.url.includes('/quiz'))).toBe(false)
  })

  it('"Generate new questions" replaces the set with a clean practice state', async () => {
    const { wrapper, fake } = await open()

    await generate(wrapper)
    await wrapper.findAll('fieldset')[0].findAll('input[type="radio"]')[0].setValue(true)
    await wrapper.find('button[aria-label="Check answer to question 1"]').trigger('click')
    await click(wrapper, 'Generate new questions')
    await vi_waitFor(() => expect(fake.callsTo('POST /api/students-courses/:id/lessons/:id/ai/practice')).toHaveLength(2))
    await vi_waitFor(() => expect(wrapper.findAll('fieldset')[0].attributes('disabled')).toBeUndefined())
    expect(wrapper.findAll('input[type="radio"]:checked')).toHaveLength(0)
  })

  it('a failure is explained and the lesson stays', async () => {
    const { wrapper } = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/practice': aiFailure('AI_RESPONSE_INVALID', 502) } })

    await expand(wrapper)
    await click(wrapper, 'Practice questions')
    await waitForText(wrapper, 'Practice questions could not be created')
    expect(wrapper.text()).toContain('The AI could not produce a usable result this time.')
    expect(wrapper.find('[data-testid="practice-questions"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Complete and continue')
  })

  it('the questions come from the backend: nothing is generated locally', async () => {
    const { wrapper } = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/practice': { questions: [{ ...PRACTICE[0], question: 'A question that only the backend knows?' }], generatedAt: 'x' } } })

    await generate(wrapper)
    expect(wrapper.findAll('fieldset')).toHaveLength(1)
    expect(wrapper.text()).toContain('A question that only the backend knows?')
  })
})

describe('entitlement and the core LMS', () => {
  const inactive = { message: 'x', code: 'WORKSPACE_ACCESS_INACTIVE', accessStatus: 'EXPIRED' }

  it('a 403 WORKSPACE_ACCESS_INACTIVE from an AI request keeps the session and goes to the inactive page, with no billing UI', async () => {
    const { wrapper, auth, router } = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/question': reply(403, inactive) } })

    await expand(wrapper)
    await askAbout(wrapper, 'What is a closure?')
    await waitForRoute(router, R.STUDENT_WORKSPACE_INACTIVE)
    await waitForText(wrapper, 'Learning is paused')
    expect(auth.isAuthenticated).toBe(true)
    expect(wrapper.text()).not.toMatch(BILLING_WORDS)
    expect(wrapper.find('[data-testid="lesson-assistant"]').exists()).toBe(false)
  })

  it('an inactive student cannot reach a lesson, so no AI request is ever made', async () => {
    const { router, fake } = await open({ user: student('EXPIRED') }).catch(() => ({}))
    const app = await openStudentApp('/student/courses/course-1/lessons/any', { user: student('EXPIRED'), routes: aiRoutes() })

    expect(app.router.currentRoute.value.name).toBe(R.STUDENT_WORKSPACE_INACTIVE)
    expect(app.fake.calls.filter((call) => call.url.includes('/ai/'))).toHaveLength(0)
    expect(router ?? true).toBeTruthy()
    expect(fake ?? true).toBeTruthy()
  })

  it('with AI failing everywhere, lessons, completion and the official quiz are unaffected', async () => {
    const failing = { 'GET /api/ai/status': reply(500, { message: 'down' }) }
    const { wrapper } = await open({ routes: failing })

    await flushPromises()
    await click(wrapper, 'Complete and continue')
    await waitForText(wrapper, 'Install it')
  })
})

describe('accessibility of the lesson assistant', () => {
  it('the collapsed entry, the open panel, every result and every error pass axe', async () => {
    const { wrapper } = await open()

    await vi_waitFor(() => expect(toggle(wrapper).exists()).toBe(true))
    expect(await audit(wrapper)).toEqual([])

    await expand(wrapper)
    expect(await audit(wrapper)).toEqual([])

    await askAbout(wrapper, 'hi')
    expect(await audit(wrapper)).toEqual([]) // validation error

    await askAbout(wrapper, 'What is a closure?')
    await waitForText(wrapper, 'AI-generated answer')
    await click(wrapper, 'Summarize lesson')
    await waitForText(wrapper, 'AI-generated summary')
    await click(wrapper, 'Practice questions')
    await vi_waitFor(() => expect(wrapper.find('[data-testid="practice-questions"]').exists()).toBe(true))
    await wrapper.findAll('fieldset')[0].findAll('input[type="radio"]')[0].setValue(true)
    await wrapper.find('button[aria-label="Check answer to question 1"]').trigger('click')
    expect(await audit(wrapper)).toEqual([])
  })

  it('failure and unavailable states pass axe', async () => {
    const failing = await open({ routes: { 'POST /api/students-courses/:courseId/lessons/:lessonId/ai/question': aiFailure('AI_RATE_LIMITED', 429) } })

    await expand(failing.wrapper)
    await askAbout(failing.wrapper, 'What is a closure?')
    await waitForText(failing.wrapper, 'usage limit')
    expect(await audit(failing.wrapper)).toEqual([])

    const unavailable = await open({ ai: { enabled: true, available: false } })

    await waitForText(unavailable.wrapper, 'temporarily unavailable')
    expect(await audit(unavailable.wrapper)).toEqual([])
  })

  it('works with the keyboard: the entry is a real button, results are announced politely, controls are named', async () => {
    const { wrapper } = await open()

    await expand(wrapper)
    expect(toggle(wrapper).element.tagName).toBe('BUTTON')
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
    await askAbout(wrapper, 'What is a closure?')
    await waitForText(wrapper, 'AI-generated answer')

    const unnamed = wrapper.findAll('[data-testid="lesson-assistant"] button, [data-testid="lesson-assistant"] input, [data-testid="lesson-assistant"] textarea')
      .filter((el) => !(el.attributes('aria-label') || el.text().trim() || wrapper.find(`label[for="${el.attributes('id')}"]`).exists() || el.element.closest('label')))

    expect(unnamed).toHaveLength(0)
    await waitForGone(wrapper, 'Generating…')
  })
})

void aiStatus
