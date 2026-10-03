import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { AxiosError } from 'axios'
import { R } from '@/constants/routes.js'
import { reply } from './fakeApi.js'
import { deferred, student } from './helpers.js'
import { CERT_NUMBER, finishLessons, makeStudentQuizBackend } from './quizBackend.js'
import { click, waitForGone, waitForRoute, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

const COURSE = '/student/courses/course-1'
const QUIZ = `${COURSE}/quiz`
const BILLING_WORDS = /renew|subscribe|subscription|billing|payment|checkout|pay now/i

const open = (backend, path, extraRoutes = {}, user = student('ACTIVE')) =>
  openStudentApp(path, { routes: { ...backend.routes, ...extraRoutes }, user })

const radio = (wrapper, questionNumber, optionIndex) => wrapper.findAll('fieldset')[questionNumber - 1].findAll('input[type="radio"]')[optionIndex]
const answer = (wrapper, questionNumber, correct = true) => radio(wrapper, questionNumber, correct ? 0 : 1).setValue(true)
const answerAll = async (wrapper, correctCount, total = 3) => {
  for (let i = 1; i <= total; i += 1) await answer(wrapper, i, i <= correctCount)
}
const unlocked = () => {
  const backend = makeStudentQuizBackend()

  finishLessons(backend)

  return backend
}

describe('the final quiz on the course page', () => {
  it('is LOCKED until every lesson is done: the page says so and offers no way in', async () => {
    const backend = makeStudentQuizBackend()
    const { wrapper } = await open(backend, COURSE)

    await waitForText(wrapper, 'Final quiz')

    const card = wrapper.find('[data-testid="quiz-card"]')

    expect(card.text()).toContain('Complete all lessons to unlock the final quiz.')
    expect(card.text()).toContain('3 questions')
    expect(card.text()).toContain('Passing score: 70%')
    expect(card.text()).toContain('Locked')
    expect(card.find('a').exists()).toBe(false)
    expect(card.find('button').exists()).toBe(false)
  })

  it('with all lessons done the lesson percent stays 100, the course is NOT complete and the quiz is the next step', async () => {
    const { wrapper } = await open(unlocked(), COURSE)

    await waitForText(wrapper, 'Take final quiz')

    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(wrapper.text()).toContain('2 of 2 lessons · 100%')
    expect(wrapper.text()).not.toContain('Course completed')
    expect(wrapper.text()).toContain('Final quiz pending')
    expect(wrapper.text()).toContain('Pass the final quiz below to complete the course.')
    expect(wrapper.find('[data-testid="quiz-card"] a').attributes('href')).toBe(QUIZ)
  })

  it('offers a retry after a failed attempt, with the latest score', async () => {
    const backend = unlocked()

    backend.state.attempts.push({ _id: 'a1', attemptNumber: 1, score: 33, passingScore: 70, correctAnswers: 1, totalQuestions: 3, passed: false, submittedAt: '2026-05-20T10:00:00.000Z' })

    const { wrapper } = await open(backend, COURSE)

    await waitForText(wrapper, 'Retry final quiz')
    expect(wrapper.text()).toContain('Your latest attempt scored 33%')
    expect(wrapper.text()).toContain('Not passed yet')
    expect(wrapper.text()).not.toContain('Course completed')
  })

  it('shows Passed, the completed course and the certificate once the backend says so', async () => {
    const backend = unlocked()

    backend.state.attempts.push({ _id: 'a1', attemptNumber: 1, score: 100, passingScore: 70, correctAnswers: 3, totalQuestions: 3, passed: true, submittedAt: '2026-05-20T10:00:00.000Z' })
    backend.issueIfDue()

    const { wrapper } = await open(backend, COURSE)

    await waitForText(wrapper, 'Course completed')
    expect(wrapper.find('[data-testid="quiz-card"]').text()).toContain('You passed the final quiz with 100%')
    expect(wrapper.find('a[href="/student/certificates/' + CERT_NUMBER + '"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('View certificate')
  })

  it('says when the instructor has not finished the quiz', async () => {
    const backend = makeStudentQuizBackend({ quizReady: false })

    finishLessons(backend)

    const { wrapper } = await open(backend, COURSE)

    await waitForText(wrapper, 'Your instructor is still preparing the final quiz')
    expect(wrapper.find('[data-testid="quiz-card"] a').exists()).toBe(false)
    expect(wrapper.text()).toContain('The final quiz is not available yet.')
  })

  it('a course WITHOUT a quiz has no quiz card and completes with its last lesson, with a certificate', async () => {
    const backend = makeStudentQuizBackend({ withQuiz: false })
    const { wrapper, router } = await open(backend, `${COURSE}/lessons/${backend.lessons[0]._id}`)

    await waitForText(wrapper, 'Lesson one')
    await click(wrapper, 'Complete and continue')
    await waitForText(wrapper, 'Lesson two')
    await click(wrapper, 'Complete and continue')
    await waitForRoute(router, R.STUDENT_COURSE)
    await waitForText(wrapper, 'Course completed')

    expect(wrapper.find('[data-testid="quiz-card"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('View certificate')
  })

  it('after the LAST lesson of a quiz course, Complete and continue lands on the course page where the quiz waits', async () => {
    const backend = makeStudentQuizBackend()
    const { wrapper, router } = await open(backend, `${COURSE}/lessons/${backend.lessons[0]._id}`)

    await waitForText(wrapper, 'Lesson one')
    await click(wrapper, 'Complete and continue')
    await waitForText(wrapper, 'Lesson two')
    await click(wrapper, 'Complete and continue')
    await waitForRoute(router, R.STUDENT_COURSE)
    await waitForText(wrapper, 'Take final quiz')
    expect(wrapper.text()).not.toContain('Course completed')
  })
})

describe('the dashboard and My Courses follow the backend next activity', () => {
  it('Continue learning leads to the final quiz when only the quiz is left', async () => {
    const { wrapper, router } = await open(unlocked(), '/student')

    await waitForText(wrapper, 'Continue learning')

    const card = wrapper.find('[aria-labelledby="continue-heading"]')

    expect(card.text()).toContain('Next: Final quiz')
    expect(card.text()).not.toContain('You have completed')

    await click(wrapper, 'Take final quiz: Intro to Vue')
    await waitForRoute(router, R.STUDENT_QUIZ)
  })

  it('My Courses shows the right action per state: Take / Retry final quiz, Review course + View certificate', async () => {
    const backend = unlocked()
    const first = await open(backend, '/student/courses')

    await waitForText(first.wrapper, 'Take final quiz')
    expect(first.wrapper.text()).toContain('Final quiz pending')

    backend.state.attempts.push({ _id: 'a1', attemptNumber: 1, score: 0, passingScore: 70, correctAnswers: 0, totalQuestions: 3, passed: false, submittedAt: '2026-05-20T10:00:00.000Z' })

    const second = await open(backend, '/student/courses')

    await waitForText(second.wrapper, 'Retry final quiz')

    backend.state.attempts.push({ _id: 'a2', attemptNumber: 2, score: 100, passingScore: 70, correctAnswers: 3, totalQuestions: 3, passed: true, submittedAt: '2026-05-21T10:00:00.000Z' })
    backend.issueIfDue()

    const third = await open(backend, '/student/courses')

    await waitForText(third.wrapper, 'Review course')
    expect(third.wrapper.text()).toContain('View certificate')
    expect(third.wrapper.text()).toContain('Completed')
  })

  it('the dashboard says all courses are completed only when the backend completion says so', async () => {
    const backend = unlocked()
    const { wrapper } = await open(backend, '/student')

    await waitForText(wrapper, 'Continue learning')
    expect(wrapper.text()).toContain('1 course · 0 completed')
    expect(wrapper.text()).not.toContain('You have completed')
  })
})

describe('the quiz page', () => {
  it('is locked until the lessons are completed: a calm explanation, not an error', async () => {
    const { wrapper, fake } = await open(makeStudentQuizBackend(), QUIZ)

    await waitForText(wrapper, 'The final quiz is locked')
    expect(wrapper.text()).toContain('Complete all lessons to unlock the final quiz.')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('a[href="/student/courses/course-1"]').exists()).toBe(true)
    expect(fake.callsTo('POST /api/students-courses/:id/quiz/attempts')).toHaveLength(0)
  })

  it('explains an unfinished quiz and a course without a quiz', async () => {
    const pending = makeStudentQuizBackend({ quizReady: false })

    finishLessons(pending)

    const a = await open(pending, QUIZ)

    await waitForText(a.wrapper, 'The final quiz is not available yet')

    const b = await open(makeStudentQuizBackend({ withQuiz: false }), QUIZ)

    await waitForText(b.wrapper, 'This course has no final quiz')
  })

  it('loads the questions with their options and NO answer key in the page', async () => {
    const { wrapper } = await open(unlocked(), QUIZ)

    await waitForText(wrapper, 'Question 1?')

    expect(wrapper.find('h1').text()).toBe('Final quiz')
    expect(wrapper.text()).toContain('3 questions · Passing score: 70%')
    expect(wrapper.findAll('fieldset')).toHaveLength(3)
    expect(wrapper.findAll('fieldset')[0].find('legend').text()).toContain('Question 1?')
    expect(wrapper.findAll('fieldset')[0].findAll('input[type="radio"]')).toHaveLength(3)
    expect(wrapper.findAll('fieldset')[0].findAll('label').map((l) => l.text())).toEqual(['Right', 'Wrong', 'Other'])
    expect(wrapper.html()).not.toMatch(/isCorrect|correctOption|"correct"/)
    expect(wrapper.findAll('input[type="radio"]:checked')).toHaveLength(0)
  })

  it('each question is one radio group, and answering counts progress', async () => {
    const { wrapper } = await open(unlocked(), QUIZ)

    await waitForText(wrapper, 'Question 1?')
    expect(wrapper.text()).toContain('0 of 3 answered')

    await answer(wrapper, 1, false)
    expect(wrapper.text()).toContain('1 of 3 answered')

    await radio(wrapper, 1, 2).setValue(true) // changing the choice does not count twice
    expect(wrapper.text()).toContain('1 of 3 answered')
    expect(wrapper.findAll('fieldset')[0].findAll('input[type="radio"]:checked')).toHaveLength(1)
    expect(new Set(wrapper.findAll('fieldset')[0].findAll('input[type="radio"]').map((r) => r.attributes('name'))).size).toBe(1)
  })

  it('requires every question: an error summary lists what is missing, nothing is sent, and focus moves to it', async () => {
    const { wrapper, fake } = await open(unlocked(), QUIZ)

    await waitForText(wrapper, 'Question 1?')
    await answer(wrapper, 1)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const summary = wrapper.find('[data-testid="quiz-error-summary"]')

    expect(summary.attributes('role')).toBe('alert')
    expect(summary.text()).toContain('Answer every question before submitting')
    expect(summary.findAll('li').map((li) => li.text())).toEqual(['Question 2?', 'Question 3?'])
    expect(summary.find('a').attributes('href')).toBe('#question-qq-2')
    expect(wrapper.findAll('.type-error').map((e) => e.text())).toEqual(['Choose an answer for this question.', 'Choose an answer for this question.'])
    expect(document.activeElement).toBe(summary.element)
    expect(fake.callsTo('POST /api/students-courses/:id/quiz/attempts')).toHaveLength(0)

    // the missing questions are tied to their error text for assistive technology
    expect(wrapper.findAll('fieldset')[1].attributes('aria-describedby')).toBe('error-qq-2')
  })

  it('submits ONLY the choices: no score, no correctness, no pass flag', async () => {
    const { wrapper, fake } = await open(unlocked(), QUIZ)

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 3)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'You passed')

    const body = fake.callsTo('POST /api/students-courses/:id/quiz/attempts')[0].body

    expect(Object.keys(body)).toEqual(['answers'])
    expect(body.answers).toEqual([
      { questionId: 'qq-1', optionId: 'qq-1-o0' },
      { questionId: 'qq-2', optionId: 'qq-2-o0' },
      { questionId: 'qq-3', optionId: 'qq-3-o0' },
    ])
    expect(body.answers.every((a) => Object.keys(a).sort().join() === 'optionId,questionId')).toBe(true)
  })
})

describe('results', () => {
  it('a failing attempt: neutral wording, score and passing score, per-question right/wrong, retry, course still incomplete', async () => {
    const backend = unlocked()
    const { wrapper, router } = await open(backend, QUIZ)

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 1)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Not passed this time')

    const result = wrapper.find('[data-testid="quiz-result"]')

    expect(result.find('[data-testid="quiz-score"]').text()).toBe('33%')
    expect(result.text()).toContain('1 of 3 correct · Passing score: 70%')
    expect(result.text()).toContain('You need at least 70% to pass')
    expect(result.text()).toContain('retry as many times as you want')
    expect(result.findAll('ol li').map((li) => li.text().replace(/\s+/g, ' '))).toEqual(['1. Question 1?Correct', '2. Question 2?Not correct', '3. Question 3?Not correct'])
    expect(result.text()).not.toContain('Course completed')
    expect(result.text()).not.toContain('certificate')
    expect(document.activeElement.textContent).toContain('Not passed this time') // the result is announced and focused
    expect(wrapper.html()).not.toContain('qq-1-o0"') // the key is still not shown
    expect(wrapper.text()).toContain('Attempt 1')
    expect(wrapper.text()).toContain('Not passed')

    // the course page agrees: still incomplete, retry offered
    await router.push(COURSE)
    await waitForText(wrapper, 'Retry final quiz')
    expect(wrapper.text()).not.toContain('Course completed')
  })

  it('a passing attempt: Passed, the course is completed and the certificate is one click away', async () => {
    const { wrapper, router } = await open(unlocked(), QUIZ)

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 3)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'You passed')

    const result = wrapper.find('[data-testid="quiz-result"]')

    expect(result.find('[data-testid="quiz-score"]').text()).toBe('100%')
    expect(result.text()).toContain('Course completed')
    expect(result.text()).toContain('Your certificate is ready.')
    expect(result.findAll('ol li').map((li) => li.text().replace(/\s+/g, ' '))).toEqual(['1. Question 1?Correct', '2. Question 2?Correct', '3. Question 3?Correct'])

    await click(result, 'View certificate')
    await waitForRoute(router, R.STUDENT_CERTIFICATE)
    expect(router.currentRoute.value.params.certificateNumber).toBe(CERT_NUMBER)
  })

  it('shows the score and the pass/fail the BACKEND returned, even when they disagree with the answers', async () => {
    const lenient = unlocked()

    lenient.state.forcedResult = { score: 12, passed: true } // every answer wrong, but the backend says passed at 12%

    const a = await open(lenient, QUIZ)

    await waitForText(a.wrapper, 'Question 1?')
    await answerAll(a.wrapper, 0)
    await a.wrapper.find('form').trigger('submit.prevent')
    await waitForText(a.wrapper, 'You passed')
    expect(a.wrapper.find('[data-testid="quiz-score"]').text()).toBe('12%')
    expect(a.wrapper.text()).toContain('0 of 3 correct')

    const strict = unlocked()

    strict.state.forcedResult = { score: 99, passed: false } // every answer right, but the backend says not passed at 99%

    const b = await open(strict, QUIZ)

    await waitForText(b.wrapper, 'Question 1?')
    await answerAll(b.wrapper, 3)
    await b.wrapper.find('form').trigger('submit.prevent')
    await waitForText(b.wrapper, 'Not passed this time')
    expect(b.wrapper.find('[data-testid="quiz-score"]').text()).toBe('99%')
    expect(b.wrapper.text()).toContain('3 of 3 correct')
    expect(b.wrapper.text()).not.toContain('Course completed')
  })

  it('Retry quiz clears the choices and keeps the history; a later attempt is a new row', async () => {
    const backend = unlocked()
    const { wrapper } = await open(backend, QUIZ)

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 1)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Not passed this time')

    await click(wrapper, 'Retry quiz')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.findAll('input[type="radio"]:checked')).toHaveLength(0)
    expect(wrapper.text()).toContain('0 of 3 answered')
    expect(wrapper.text()).toContain('Attempt 1') // history stays

    await answerAll(wrapper, 3)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'You passed')
    await waitForText(wrapper, 'Attempt 2')

    expect(backend.state.attempts.map((a) => a.score)).toEqual([33, 100])
  })

  it('an already passed student is told retaking changes nothing', async () => {
    const backend = unlocked()

    backend.state.attempts.push({ _id: 'a1', attemptNumber: 1, score: 100, passingScore: 70, correctAnswers: 3, totalQuestions: 3, passed: true, submittedAt: '2026-05-20T10:00:00.000Z' })
    backend.issueIfDue()

    const { wrapper } = await open(backend, QUIZ)

    await waitForText(wrapper, 'You have already passed this quiz')
    expect(wrapper.text()).toContain('does not change your result or your certificate')
    expect(wrapper.text()).toContain('Attempt 1')
  })
})

describe('submitting safely', () => {
  it('protects against double submits: one request while one is in flight', async () => {
    const backend = unlocked()
    const gate = deferred()
    const original = backend.routes['POST /api/students-courses/:courseId/quiz/attempts']
    const { wrapper, fake } = await open(backend, QUIZ, { 'POST /api/students-courses/:courseId/quiz/attempts': async (call) => { await gate.promise; return original(call) } })

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 3)

    const form = wrapper.find('form')

    await form.trigger('submit.prevent')
    await form.trigger('submit.prevent')
    await wrapper.find('button[type="submit"]').trigger('click')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[type="submit"]').attributes('aria-busy')).toBe('true')

    gate.resolve()
    await waitForText(wrapper, 'You passed')
    expect(fake.callsTo('POST /api/students-courses/:id/quiz/attempts')).toHaveLength(1)
    expect(backend.state.attempts).toHaveLength(1)
  })

  it('a network failure keeps every selection and lets the student try again', async () => {
    const backend = unlocked()
    const original = backend.routes['POST /api/students-courses/:courseId/quiz/attempts']
    let calls = 0
    const { wrapper } = await open(backend, QUIZ, {
      'POST /api/students-courses/:courseId/quiz/attempts': (call) => {
        calls += 1

        if (calls === 1) throw new AxiosError('Network Error', 'ERR_NETWORK')

        return original(call)
      },
    })

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 2)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Your answers were not submitted')

    expect(wrapper.find('[role="alert"]').text()).toContain('Cannot reach the server')
    expect(wrapper.findAll('input[type="radio"]:checked')).toHaveLength(3)
    expect(wrapper.text()).toContain('3 of 3 answered')
    expect(wrapper.find('[data-testid="quiz-result"]').exists()).toBe(false)
    expect(backend.state.attempts).toHaveLength(0)

    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Not passed this time')
    expect(backend.state.attempts).toHaveLength(1)
  })

  it('a server validation error is shown and the choices stay', async () => {
    const { wrapper } = await open(unlocked(), QUIZ, { 'POST /api/students-courses/:courseId/quiz/attempts': reply(400, { message: 'Validation error' }) })

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 3)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Your answers were not submitted')
    expect(wrapper.findAll('input[type="radio"]:checked')).toHaveLength(3)
  })

  it('a lock that appears while answering (a lesson was added) is explained and nothing is recorded', async () => {
    const backend = unlocked()
    const { wrapper } = await open(backend, QUIZ, { 'POST /api/students-courses/:courseId/quiz/attempts': reply(409, { message: 'Complete all lessons to unlock the final quiz.', code: 'QUIZ_LOCKED' }) })

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 3)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Complete all lessons to unlock the final quiz.')
    expect(backend.state.attempts).toHaveLength(0)
  })
})

describe('availability and entitlement', () => {
  it('an unpublished or unenrolled course is the usual unavailable state and the student stays signed in', async () => {
    const { wrapper, auth } = await open(unlocked(), QUIZ, { 'GET /api/students-courses/:courseId/quiz': reply(404, { message: 'Course not found' }) })

    await waitForText(wrapper, 'This course is no longer available')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('WORKSPACE_ACCESS_INACTIVE on the quiz request keeps the session and moves to the inactive page, with no billing controls', async () => {
    const inactive = { message: 'x', code: 'WORKSPACE_ACCESS_INACTIVE', accessStatus: 'EXPIRED' }
    const { wrapper, auth, router } = await open(unlocked(), QUIZ, { 'GET /api/students-courses/:courseId/quiz': reply(403, inactive) })

    await waitForRoute(router, R.STUDENT_WORKSPACE_INACTIVE)
    await waitForText(wrapper, 'Learning is paused')
    expect(auth.isAuthenticated).toBe(true)
    expect(wrapper.text()).not.toMatch(BILLING_WORDS)
  })

  it('WORKSPACE_ACCESS_INACTIVE while submitting keeps the session and records nothing', async () => {
    const backend = unlocked()
    const inactive = { message: 'x', code: 'WORKSPACE_ACCESS_INACTIVE', accessStatus: 'EXPIRED' }
    const { wrapper, auth, router } = await open(backend, QUIZ, { 'POST /api/students-courses/:courseId/quiz/attempts': reply(403, inactive) })

    await waitForText(wrapper, 'Question 1?')
    await answerAll(wrapper, 3)
    await wrapper.find('form').trigger('submit.prevent')
    await waitForRoute(router, R.STUDENT_WORKSPACE_INACTIVE)
    expect(auth.isAuthenticated).toBe(true)
    expect(backend.state.attempts).toHaveLength(0)
    await waitForGone(wrapper, 'Submit answers')
  })

  it('an inactive student is redirected from the quiz route without any quiz request', async () => {
    const { router, fake } = await open(unlocked(), QUIZ, {}, student('EXPIRED'))

    expect(router.currentRoute.value.name).toBe(R.STUDENT_WORKSPACE_INACTIVE)
    expect(fake.calls.filter((call) => call.url.includes('/quiz'))).toHaveLength(0)
  })
})
