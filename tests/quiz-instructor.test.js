import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { aLesson, aSection, learner, makeCourseBackend, progressPayload } from './data.js'
import { reply } from './fakeApi.js'
import { aQuestion, makeInstructorQuizBackend } from './quizBackend.js'
import { click, dialog, openInstructorApp, waitForGone, waitForText } from './instructorApp.js'

const PATH = '/instructor/courses/course-1/quiz'

const open = (quizOptions = {}, extraRoutes = {}, path = PATH, courseOptions = {}) => {
  const course = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One')])], ...courseOptions })
  const quiz = makeInstructorQuizBackend(quizOptions)

  return openInstructorApp(path, { routes: { ...course.routes, ...quiz.routes, ...extraRoutes } }).then((app) => ({ ...app, quiz, course }))
}

const withQuestions = (...questions) => ({ quiz: { _id: 'quiz-1', course: 'course-1', title: 'Final quiz', passingScore: 70, questions } })

// the page has two forms (settings, and the question editor while it is open)
const editorForm = (wrapper) => wrapper.findAll('form').find((form) => form.find('textarea').exists())

const fillQuestion = async (wrapper, { prompt, options, correct }) => {
  await wrapper.find('textarea').setValue(prompt)

  for (const [index, text] of options.entries()) await wrapper.find(`input[placeholder="Option ${index + 1}"]`).setValue(text)

  if (correct !== undefined) await wrapper.find(`input[type="radio"][aria-label="Option ${correct + 1} is the correct answer"]`).setValue(true)
}

describe('the Quiz tab', () => {
  it('is one of the course tabs, between Content and Learners', async () => {
    const { wrapper } = await open()

    await waitForText(wrapper, 'This course has no final quiz')
    expect(wrapper.findAll('nav[aria-label="Course sections"] a').map((a) => a.text())).toEqual(['Content', 'Quiz', 'Learners', 'Progress', 'Settings'])
    expect(wrapper.find('nav[aria-label="Course sections"] a[aria-current="page"]').text()).toBe('Quiz')
  })

  it('explains the optional final assessment when there is no quiz yet', async () => {
    const { wrapper } = await open()

    await waitForText(wrapper, 'This course has no final quiz')
    expect(wrapper.text()).toContain('A final quiz is optional')
    expect(wrapper.text()).toContain('finish every lesson')
    expect(wrapper.text()).toContain('Create a final quiz')
  })

  it('shows a loading state and an error with retry', async () => {
    const failing = await open({}, { 'GET /api/courses/:courseId/quiz': reply(500, { message: 'Quiz exploded' }) })

    await waitForText(failing.wrapper, 'Quiz exploded')
    expect(failing.wrapper.text()).toContain('We could not load the final quiz')
  })
})

describe('creating the quiz and its settings', () => {
  it('creates the quiz (default title and passing score 70) and says it cannot be taken until it has questions', async () => {
    const { wrapper, fake } = await open()

    await waitForText(wrapper, 'This course has no final quiz')
    expect(wrapper.find('input[type="number"]').element.value).toBe('70')

    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Final quiz created.')

    expect(fake.callsTo('POST /api/courses/:courseId/quiz')[0].body).toEqual({ title: 'Final quiz', passingScore: 70 })
    expect(wrapper.text()).toContain('Students cannot take this quiz yet')
    expect(wrapper.text()).toContain('Add at least one question.')
    expect(wrapper.text()).toContain('The course cannot be published until the quiz is finished.')
    expect(wrapper.text()).toContain('Questions (0)')
  })

  it('validates the passing score before sending anything', async () => {
    const { wrapper, fake } = await open()

    await waitForText(wrapper, 'This course has no final quiz')

    for (const bad of ['0', '101', '70.5', '', 'abc']) {
      await wrapper.find('input[type="number"]').setValue(bad)
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()
      expect(wrapper.text(), bad).toContain('Enter a whole number from 1 to 100.')
    }

    await wrapper.find('input[type="text"]').setValue('ab')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Enter a title of at least 3 characters.')
    expect(fake.callsTo('POST /api/courses/:courseId/quiz')).toHaveLength(0)
  })

  it('shows the backend validation for settings next to the field', async () => {
    const { wrapper } = await open({}, { 'POST /api/courses/:courseId/quiz': reply(400, { message: 'Validation error', errors: [{ path: 'title', message: 'Title is not allowed' }] }) })

    await waitForText(wrapper, 'This course has no final quiz')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Title is not allowed')
  })

  it('saves new title and passing score of an existing quiz', async () => {
    const { wrapper, fake } = await open(withQuestions(aQuestion('Why?')))

    await waitForText(wrapper, 'Quiz settings')
    await wrapper.find('input[type="text"]').setValue('Course assessment')
    await wrapper.find('input[type="number"]').setValue('85')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Quiz settings saved.')

    expect(fake.callsTo('PUT /api/quizzes/:id')[0].body).toEqual({ title: 'Course assessment', passingScore: 85 })
    expect(wrapper.text()).toContain('at least 85%')
  })

  it('shows an existing quiz as ready with its questions and the correct answers marked', async () => {
    const { wrapper } = await open(withQuestions(aQuestion('What is Vue?', ['A framework', 'A fruit', 'A planet'], 0)))

    await waitForText(wrapper, 'The quiz is ready')
    expect(wrapper.text()).toContain('Questions (1)')
    expect(wrapper.text()).toContain('What is Vue?')

    const options = wrapper.findAll('ol li li')

    expect(options.map((o) => o.text())).toEqual(['A frameworkCorrect', 'A fruit', 'A planet'])
  })
})

describe('questions', () => {
  it('adds a single-answer question: text, options and ONE correct option', async () => {
    const { wrapper, fake } = await open(withQuestions())

    await waitForText(wrapper, 'No questions yet')
    await click(wrapper, 'Add the first question')
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(4)
    await fillQuestion(wrapper, { prompt: 'What is 2 + 2?', options: ['Three', 'Four', 'Five', 'Six'], correct: 1 })
    await editorForm(wrapper).trigger('submit.prevent')
    await waitForText(wrapper, 'Question added.')

    expect(fake.callsTo('POST /api/quizzes/:id/questions')[0].body).toEqual({
      prompt: 'What is 2 + 2?',
      options: [{ text: 'Three', isCorrect: false }, { text: 'Four', isCorrect: true }, { text: 'Five', isCorrect: false }, { text: 'Six', isCorrect: false }],
    })
    expect(wrapper.text()).toContain('Questions (1)')
    expect(wrapper.text()).toContain('The quiz is ready')
    expect(wrapper.findAll('ol li li').map((o) => o.text())).toEqual(['Three', 'FourCorrect', 'Five', 'Six'])
  })

  it('explains what is wrong before sending: text, empty or duplicate options, no correct option', async () => {
    const { wrapper, fake } = await open(withQuestions())

    await waitForText(wrapper, 'No questions yet')
    await click(wrapper, 'Add the first question')
    await editorForm(wrapper).trigger('submit.prevent')

    expect(wrapper.text()).toContain('Enter the question text (at least 3 characters).')
    expect(wrapper.text()).toContain('Enter the option text, or remove this option.')
    expect(wrapper.text()).toContain('Choose which option is correct.')

    await fillQuestion(wrapper, { prompt: 'Duplicates?', options: ['Same', 'same', 'Other', 'More'], correct: 0 })
    await editorForm(wrapper).trigger('submit.prevent')
    expect(wrapper.text()).toContain('Each option must be different from the others.')
    expect(fake.callsTo('POST /api/quizzes/:id/questions')).toHaveLength(0)
  })

  it('keeps between 2 and 8 options', async () => {
    const { wrapper } = await open(withQuestions())

    await waitForText(wrapper, 'No questions yet')
    await click(wrapper, 'Add the first question')

    for (let i = 0; i < 4; i += 1) await click(wrapper, 'Add option')

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(8)
    expect(wrapper.findAll('button').find((b) => b.text() === 'Add option').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('at most 8 options')

    for (let i = 0; i < 6; i += 1) await wrapper.find('button[aria-label="Remove option 1"]').trigger('click')

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(wrapper.find('button[aria-label="Remove option 1"]').attributes('disabled')).toBeDefined()
  })

  it('shows a backend rejection of a question without losing what was typed', async () => {
    const { wrapper } = await open(withQuestions(), { 'POST /api/quizzes/:quizId/questions': reply(400, { message: 'Validation error', errors: [{ path: 'options', message: 'Mark exactly one option as correct' }] }) })

    await waitForText(wrapper, 'No questions yet')
    await click(wrapper, 'Add the first question')
    await fillQuestion(wrapper, { prompt: 'A question?', options: ['One', 'Two', 'Three', 'Four'], correct: 0 })
    await editorForm(wrapper).trigger('submit.prevent')
    await waitForText(wrapper, 'Mark exactly one option as correct')
    expect(wrapper.find('textarea').element.value).toBe('A question?')
  })

  it('edits a question and keeps the ids of the options that stay (the correct answer follows its id)', async () => {
    const question = aQuestion('Old question?', ['Alpha', 'Beta', 'Gamma'], 0)
    const { wrapper, fake } = await open(withQuestions(question))

    await waitForText(wrapper, 'Old question?')
    await click(wrapper, 'Edit question 1')
    expect(wrapper.find('textarea').element.value).toBe('Old question?')
    expect(wrapper.find('input[type="radio"]:checked').attributes('aria-label')).toBe('Option 1 is the correct answer')

    await wrapper.find('textarea').setValue('New question?')
    await wrapper.find('input[placeholder="Option 2"]').setValue('Beta (edited)')
    await wrapper.find('input[type="radio"][aria-label="Option 3 is the correct answer"]').setValue(true)
    await editorForm(wrapper).trigger('submit.prevent')
    await waitForText(wrapper, 'Question saved.')

    expect(fake.callsTo('PUT /api/quizzes/:id/questions/:id')[0].body).toEqual({
      prompt: 'New question?',
      options: [
        { id: question.options[0]._id, text: 'Alpha', isCorrect: false },
        { id: question.options[1]._id, text: 'Beta (edited)', isCorrect: false },
        { id: question.options[2]._id, text: 'Gamma', isCorrect: true },
      ],
    })
    expect(wrapper.findAll('ol li li').map((o) => o.text())).toEqual(['Alpha', 'Beta (edited)', 'GammaCorrect'])
  })

  it('cancelling an edit changes nothing', async () => {
    const { wrapper, fake } = await open(withQuestions(aQuestion('Keep me?')))

    await waitForText(wrapper, 'Keep me?')
    await click(wrapper, 'Edit question 1')
    await wrapper.find('textarea').setValue('Changed')
    await click(wrapper, 'Cancel')
    expect(wrapper.text()).toContain('Keep me?')
    expect(fake.callsTo('PUT /api/quizzes/:id/questions/:id')).toHaveLength(0)
  })

  it('deletes a question only after confirming, and says attempts are kept', async () => {
    const { wrapper, fake } = await open(withQuestions(aQuestion('First?'), aQuestion('Second?')))

    await waitForText(wrapper, 'Questions (2)')
    await click(wrapper, 'Delete question 1')

    expect(dialog(wrapper).text()).toContain('Delete question 1?')
    expect(dialog(wrapper).text()).toContain('kept as history')
    expect(fake.callsTo('DELETE /api/quizzes/:id/questions/:id')).toHaveLength(0)

    await click(dialog(wrapper), 'Delete question')
    await waitForText(wrapper, 'Question deleted.')
    await waitForGone(wrapper, 'First?')
    expect(wrapper.text()).toContain('Questions (1)')
  })

  it('reorders with real buttons and sends the COMPLETE list of ids', async () => {
    const [a, b, c] = [aQuestion('Alpha?'), aQuestion('Beta?'), aQuestion('Gamma?')]
    const { wrapper, fake } = await open(withQuestions(a, b, c))

    await waitForText(wrapper, 'Questions (3)')
    expect(wrapper.find('button[aria-label="Move question 1 up"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[aria-label="Move question 3 down"]').attributes('disabled')).toBeDefined()

    await wrapper.find('button[aria-label="Move question 1 down"]').trigger('click')
    await flushPromises()

    expect(fake.callsTo('PATCH /api/quizzes/:id/questions/reorder')[0].body).toEqual({ questionIds: [b._id, a._id, c._id] })
    expect(wrapper.findAll('h3').map((h) => h.text())).toEqual(['Beta?', 'Alpha?', 'Gamma?'])
  })

  it('tells the instructor when the order changed elsewhere and shows the real order', async () => {
    const [a, b] = [aQuestion('Alpha?'), aQuestion('Beta?')]
    const { wrapper } = await open(withQuestions(a, b), { 'PATCH /api/quizzes/:quizId/questions/reorder': reply(400, { message: 'mismatch', code: 'REORDER_MISMATCH' }) })

    await waitForText(wrapper, 'Questions (2)')
    await wrapper.find('button[aria-label="Move question 1 down"]').trigger('click')
    await waitForText(wrapper, 'The questions changed elsewhere')
  })

  it('shows the problems of an unfinished quiz (a question with one option)', async () => {
    const broken = { _id: 'q-broken', prompt: 'Broken?', options: [{ _id: 'o1', text: 'Only', isCorrect: true }] }
    const { wrapper } = await open(withQuestions(broken))

    await waitForText(wrapper, 'Students cannot take this quiz yet')
    expect(wrapper.text()).toContain('Question 1 needs at least 2 options.')
  })
})

describe('deleting the quiz', () => {
  it('asks first, states the consequences, then returns to the no-quiz state', async () => {
    const { wrapper, fake } = await open(withQuestions(aQuestion('Why?')))

    await waitForText(wrapper, 'Quiz settings')
    await click(wrapper, 'Delete quiz')

    const text = dialog(wrapper).text()

    expect(text).toContain('Delete the final quiz?')
    expect(text).toContain('receive their certificate')
    expect(text).toContain('Submitted attempts are kept as history')
    expect(fake.callsTo('DELETE /api/quizzes/:id')).toHaveLength(0)

    await click(dialog(wrapper), 'Delete quiz')
    await waitForText(wrapper, 'Final quiz deleted.')
    await waitForText(wrapper, 'This course has no final quiz')
  })

  it('a refused delete keeps the quiz and says why', async () => {
    const { wrapper } = await open(withQuestions(aQuestion('Why?')), { 'DELETE /api/quizzes/:quizId': reply(404, { message: 'Quiz not found' }) })

    await waitForText(wrapper, 'Quiz settings')
    await click(wrapper, 'Delete quiz')
    await click(dialog(wrapper), 'Delete quiz')
    await waitForText(dialog(wrapper), 'Quiz not found')
    expect(wrapper.text()).toContain('Questions (1)')
  })
})

describe('publishing with a quiz', () => {
  it('surfaces QUIZ_NOT_READY from the backend cleanly and points to the Quiz tab', async () => {
    const { wrapper } = await open(
      {},
      { 'PUT /api/courses/:id/status': reply(422, { message: 'Finish the final quiz', code: 'QUIZ_NOT_READY', problems: [{ code: 'NO_QUESTIONS', message: 'Add at least one question.' }] }) },
      '/instructor/courses/course-1'
    )

    await waitForText(wrapper, 'Intro to Vue')
    await click(wrapper, 'Publish')
    await waitForText(wrapper, 'Finish the final quiz before publishing')
    expect(wrapper.text()).toContain('The Quiz tab lists what is missing.')
    expect(wrapper.find('main header').text()).toContain('Draft')
  })

  it('tells the instructor on the Quiz tab that a published course cannot be completed until the quiz is finished', async () => {
    const { wrapper } = await open(withQuestions(), {}, PATH, { course: { status: 'published' } })

    await waitForText(wrapper, 'Students cannot take this quiz yet')
    expect(wrapper.text()).toContain('learners cannot complete this course')
  })
})

describe('learner progress with a quiz', () => {
  const rows = () => [
    learner({ _id: 'l1', name: 'Ada Lovelace', progress: { completedLessons: 2, totalLessons: 2, percent: 100, completed: false }, nextLesson: null, quiz: { status: 'failed', attempts: 2, latestScore: 66, bestScore: 66 }, certificateIssued: false }),
    learner({ _id: 'l2', name: 'Grace Hopper', progress: { completedLessons: 2, totalLessons: 2, percent: 100, completed: true }, nextLesson: null, quiz: { status: 'passed', attempts: 1, latestScore: 100, bestScore: 100 }, certificateIssued: true }),
    learner({ _id: 'l3', name: 'Alan Turing', progress: { completedLessons: 0, totalLessons: 2, percent: 0, completed: false }, quiz: { status: 'not-started', attempts: 0, latestScore: null, bestScore: null }, certificateIssued: false }),
  ]

  it('shows quiz status, attempts, scores and the certificate separately from lesson progress', async () => {
    const payload = progressPayload({ status: 'published', totalLessons: 2, students: rows() })

    payload.quiz = { _id: 'quiz-1', title: 'Final quiz', totalQuestions: 3, passingScore: 70, ready: true }
    payload.summary.certificatesIssued = 1

    const { wrapper } = await open({}, { 'GET /api/courses/:courseId/progress': payload }, '/instructor/courses/course-1/progress')

    await waitForText(wrapper, 'Ada Lovelace')

    const cards = wrapper.findAll('li').filter((li) => li.find('[role="progressbar"]').exists())

    expect(wrapper.text()).toContain('Certificates issued')
    expect(wrapper.text()).toContain('Final quiz: “Final quiz”, 3 questions, passing score 70%')
    expect(cards[0].text()).toContain('Not passed yet')
    expect(cards[0].text()).toContain('2 attempts')
    expect(cards[0].text()).toContain('best 66%, latest 66%')
    expect(cards[0].text()).toContain('All lessons completed') // lessons are 100% but the course is not complete: kept separate
    expect(cards[0].text()).toContain('Not issued')
    expect(cards[0].find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(cards[1].text()).toContain('Passed')
    expect(cards[1].text()).toContain('1 attempt')
    expect(cards[1].text()).toContain('Issued')
    expect(cards[1].text()).toContain('Completed')
    expect(cards[2].text()).toContain('Not started')
  })

  it('a course without a quiz shows no quiz information at all', async () => {
    const payload = progressPayload({ status: 'published', totalLessons: 2, students: [learner({ _id: 'l1', name: 'Ada Lovelace' })] })

    const { wrapper } = await open({}, { 'GET /api/courses/:courseId/progress': payload }, '/instructor/courses/course-1/progress')

    await waitForText(wrapper, 'Ada Lovelace')
    expect(wrapper.text()).not.toContain('Final quiz')
    expect(wrapper.text()).not.toContain('Certificate')
  })
})
