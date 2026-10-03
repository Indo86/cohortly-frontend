import { describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import { aLesson, aSection, makeCourseBackend } from './data.js'
import { aiFailure, aiRoutes, DRAFT } from './aiBackend.js'
import { aQuestion, makeInstructorQuizBackend } from './quizBackend.js'
import { reply } from './fakeApi.js'
import { click, openInstructorApp, waitForText } from './instructorApp.js'

const PATH = '/instructor/courses/course-1/quiz'
const DRAFT_URL = 'POST /api/courses/:courseId/quiz/ai-draft'
const ADD_URL = 'POST /api/quizzes/:quizId/questions'
const quizWith = (...questions) => ({ quiz: { _id: 'quiz-1', course: 'course-1', title: 'Final quiz', passingScore: 70, questions } })

const open = async ({ ai = {}, routes = {}, quiz = quizWith(aQuestion('Existing question')) } = {}) => {
  const course = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One')])] })
  const quizBackend = makeInstructorQuizBackend(quiz)
  const app = await openInstructorApp(PATH, { routes: { ...course.routes, ...quizBackend.routes, ...aiRoutes(ai), ...routes } })

  await waitForText(app.wrapper, 'Existing question')

  return { ...app, quizBackend }
}

const entry = (wrapper) => wrapper.findAll('button').find((b) => b.text() === 'Generate with AI')
const panel = async (wrapper) => {
  await vi.waitFor(() => expect(entry(wrapper)).toBeTruthy())
  await entry(wrapper).trigger('click')
}
const generate = async (wrapper) => {
  await panel(wrapper)
  await click(wrapper, 'Generate draft')
  await waitForText(wrapper, 'AI-generated draft')
}
const adds = (fake) => fake.calls.filter((call) => call.method === 'POST' && call.url.endsWith('/questions'))

describe('instructor quiz AI draft', () => {
  it('is hidden when AI is off, and manual quiz editing still works', async () => {
    const { wrapper } = await open({ ai: { enabled: false, available: false } })

    expect(wrapper.find('[data-testid="quiz-ai-draft"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Existing question')
    expect(wrapper.text()).toContain('Add question')
  })

  it('says drafting is unavailable when enabled but not available', async () => {
    const { wrapper } = await open({ ai: { enabled: true, available: false } })

    await waitForText(wrapper, 'AI quiz drafting is temporarily unavailable.')
    expect(entry(wrapper)).toBeUndefined()
  })

  it('generating sends only count and focus, shows a draft, and saves NOTHING', async () => {
    const { wrapper, fake } = await open()

    await panel(wrapper)
    expect(wrapper.text()).toContain('Nothing is saved until you add the questions you choose.')
    await click(wrapper, 'Generate draft')
    await waitForText(wrapper, 'AI-generated draft')

    expect(fake.callsTo(DRAFT_URL)[0].body).toEqual({ count: 5 })
    expect(wrapper.findAll('[data-testid="quiz-ai-draft"] ol > li')).toHaveLength(3)
    expect(wrapper.text()).toContain('Draft question 1')
    expect(wrapper.text()).toContain('What does a closure keep?')
    expect(adds(fake)).toHaveLength(0)
  })

  it('validates count (1-10) and focus length before any request', async () => {
    const { wrapper, fake } = await open()

    await panel(wrapper)

    const count = wrapper.find('[data-testid="quiz-ai-draft"] input[type="number"]')

    await count.setValue('0')
    await click(wrapper, 'Generate draft')
    expect(wrapper.text()).toContain('Enter a whole number from 1 to 10.')
    await count.setValue('11')
    await click(wrapper, 'Generate draft')
    expect(wrapper.text()).toContain('Enter a whole number from 1 to 10.')

    await count.setValue('3')
    await wrapper.findAll('[data-testid="quiz-ai-draft"] input').find((i) => i.attributes('type') !== 'number' && i.attributes('type') !== 'checkbox').setValue('x'.repeat(201))
    await click(wrapper, 'Generate draft')
    expect(wrapper.text()).toContain('Keep the focus under 200 characters.')
    expect(fake.callsTo(DRAFT_URL)).toHaveLength(0)
  })

  it('applies only the selected questions, through the existing quiz API, with bodies that carry no ids', async () => {
    const { wrapper, fake } = await open()

    await generate(wrapper)
    await wrapper.find('input[aria-label="Include draft question 2"]').setValue(false)
    expect(wrapper.text()).toContain('Add 2 selected questions to quiz')
    await click(wrapper, 'Add 2 selected questions to quiz')
    await vi.waitFor(() => expect(adds(fake)).toHaveLength(2))

    expect(adds(fake).map((call) => call.body.prompt)).toEqual([DRAFT[0].prompt, DRAFT[2].prompt])

    for (const call of adds(fake)) {
      expect(Object.keys(call.body).sort()).toEqual(['options', 'prompt'])
      expect(call.body.options.every((option) => Object.keys(option).sort().join() === 'isCorrect,text')).toBe(true)
    }

    await waitForText(wrapper, 'Which statement is true?') // the unselected one stays in the draft
  })

  it('removes and edits a draft question before adding it', async () => {
    const { wrapper, fake } = await open()

    await generate(wrapper)
    await wrapper.find('button[aria-label="Remove draft question 3"]').trigger('click')
    expect(wrapper.findAll('[data-testid="quiz-ai-draft"] ol > li')).toHaveLength(2)

    await wrapper.find('button[aria-label="Edit draft question 1"]').trigger('click')
    await wrapper.find('[data-testid="quiz-ai-draft"] textarea').setValue('A reworded question?')
    await wrapper.findAll('[data-testid="quiz-ai-draft"] form').find((f) => f.find('textarea').exists()).trigger('submit.prevent')
    await waitForText(wrapper, 'A reworded question?')
    expect(adds(fake)).toHaveLength(0)

    await click(wrapper, 'Add 2 selected questions to quiz')
    await vi.waitFor(() => expect(adds(fake)).toHaveLength(2))
    expect(adds(fake)[0].body.prompt).toBe('A reworded question?')
  })

  it('discarding the draft saves nothing', async () => {
    const { wrapper, fake } = await open()

    await generate(wrapper)
    await click(wrapper, 'Discard draft')
    expect(wrapper.text()).not.toContain('AI-generated draft')
    expect(adds(fake)).toHaveLength(0)
  })

  it('stops at the first question the quiz API refuses, says which, and keeps the rest of the draft', async () => {
    const quizBackend = makeInstructorQuizBackend(quizWith(aQuestion('Existing question')))
    const original = quizBackend.routes[ADD_URL]
    let calls = 0
    const { wrapper, fake } = await open({
      quiz: quizWith(aQuestion('Existing question')),
      routes: { [ADD_URL]: (call) => { calls += 1; return calls === 2 ? reply(400, { message: 'Invalid question', errors: [{ path: 'prompt', message: 'Question text is too short' }] }) : original(call) } },
    })

    await generate(wrapper)
    await click(wrapper, 'Add 3 selected questions to quiz')
    await waitForText(wrapper, 'Question 2 was not added')
    expect(adds(fake)).toHaveLength(2)
    expect(wrapper.text()).toContain('Question text is too short')
    expect(wrapper.findAll('[data-testid="quiz-ai-draft"] ol > li')).toHaveLength(2)
  })

  it('shows the dropped-suggestions note', async () => {
    const { wrapper } = await open({ routes: { [DRAFT_URL]: { questions: DRAFT.slice(0, 1), dropped: 2, generatedAt: 'x' } } })

    await generate(wrapper)
    expect(wrapper.text()).toContain('2 suggestions were skipped')
  })

  it.each([
    ['AI_PROVIDER_UNAVAILABLE', 503, 'AI study tools are temporarily unavailable.'],
    ['AI_RATE_LIMITED', 429, 'AI study tools have reached their current usage limit. Try again later.'],
    ['AI_RESPONSE_INVALID', 502, 'The AI could not produce a usable result this time. Please try again.'],
  ])('%s: friendly message, quiz unaffected', async (code, status, message) => {
    const { wrapper, fake } = await open({ routes: { [DRAFT_URL]: aiFailure(code, status) } })

    await panel(wrapper)
    await click(wrapper, 'Generate draft')
    await waitForText(wrapper, message)
    expect(wrapper.text()).toContain('The draft could not be created')
    expect(wrapper.text()).not.toContain('raw backend text')
    expect(wrapper.text()).toContain('Existing question')
    expect(adds(fake)).toHaveLength(0)
  })

  it('an instructor with no text to draft from sees the backend explanation', async () => {
    const { wrapper } = await open({ routes: { [DRAFT_URL]: reply(422, { message: 'Add some text lessons first.', code: 'AI_NO_TEXT_CONTEXT' }) } })

    await panel(wrapper)
    await click(wrapper, 'Generate draft')
    await waitForText(wrapper, 'Add some text lessons first.')
  })

  it('passes axe collapsed and with a draft', async () => {
    const { wrapper } = await open()
    const audit = async () => (await axe.run({ include: [wrapper.element.parentElement ?? document.body], exclude: [['iframe']] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 100)).join(' | ')}`)

    await vi.waitFor(() => expect(entry(wrapper)).toBeTruthy())
    expect(await audit()).toEqual([])
    await generate(wrapper)
    expect(await audit()).toEqual([])
  })
})
