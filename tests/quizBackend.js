import { reply } from './fakeApi.js'
import { makeLearningBackend, sectionOf, textLesson } from './learningBackend.js'

// Stateful stand-ins for the M8 backend, written to behave like the real controllers (the real
// ones are covered by the backend suite). The frontend must show what these return and never
// compute any of it itself.

let seq = 0
const oid = (prefix) => `${prefix}-${++seq}`

// ---------------------------------------------------------------------------------------------
// Instructor: GET/POST /api/courses/:id/quiz, PUT/DELETE /api/quizzes/:id, questions CRUD + reorder
// ---------------------------------------------------------------------------------------------
export const makeInstructorQuizBackend = ({ quiz = null, courseId = 'course-1' } = {}) => {
  const state = { quiz: quiz && structuredClone(quiz), publishRefused: false }

  const problemsOf = (q) => {
    const problems = []

    if (q.questions.length === 0) problems.push({ code: 'NO_QUESTIONS', message: 'Add at least one question.' })

    q.questions.forEach((question, index) => {
      if (question.options.length < 2) problems.push({ code: 'TOO_FEW_OPTIONS', questionId: question._id, message: `Question ${index + 1} needs at least 2 options.` })
    })

    return problems
  }

  const view = () => {
    const problems = problemsOf(state.quiz)

    return {
      ...state.quiz,
      totalQuestions: state.quiz.questions.length,
      ready: problems.length === 0,
      problems,
      updatedAt: `2026-05-01T00:00:0${seq % 10}.000Z`,
      questions: state.quiz.questions.map((q, order) => ({ ...q, order })),
    }
  }

  const invalid = (errors) => reply(400, { message: 'Validation error', errors })

  const buildQuestion = (call, existing) => {
    const { prompt, options } = call.body
    const errors = []

    if (!prompt || prompt.trim().length < 3) errors.push({ path: 'prompt', message: 'Question text is required' })
    if (!Array.isArray(options) || options.length < 2) errors.push({ path: 'options', message: 'A question needs at least 2 options' })
    else if (options.filter((o) => o.isCorrect).length !== 1) errors.push({ path: 'options', message: 'Mark exactly one option as correct' })

    if (errors.length) return { errors }

    return {
      question: {
        _id: existing?._id ?? oid('q'),
        prompt: prompt.trim(),
        options: options.map((o) => ({ _id: o.id ?? oid('o'), text: o.text, isCorrect: o.isCorrect })),
      },
    }
  }

  const routes = {
    'GET /api/courses/:courseId/quiz': () => (state.quiz ? view() : null),
    'POST /api/courses/:courseId/quiz': (call) => {
      if (state.quiz) return reply(409, { message: 'This course already has a final quiz', code: 'QUIZ_EXISTS' })

      const { title, passingScore } = call.body

      if (!title || title.trim().length < 3) return invalid([{ path: 'title', message: 'Title is too short' }])
      if (!Number.isInteger(passingScore) || passingScore < 1 || passingScore > 100) return invalid([{ path: 'passingScore', message: 'Passing score must be 1-100' }])

      state.quiz = { _id: oid('quiz'), course: courseId, title: title.trim(), passingScore, questions: [] }

      return reply(201, { message: 'ok', data: view() })
    },
    'PUT /api/quizzes/:quizId': (call) => {
      state.quiz.title = call.body.title
      state.quiz.passingScore = call.body.passingScore

      return view()
    },
    'DELETE /api/quizzes/:quizId': () => {
      state.quiz = null

      return {}
    },
    'POST /api/quizzes/:quizId/questions': (call) => {
      const built = buildQuestion(call)

      if (built.errors) return invalid(built.errors)

      state.quiz.questions.push(built.question)

      return reply(201, { message: 'ok', data: view() })
    },
    'PUT /api/quizzes/:quizId/questions/:questionId': (call) => {
      const index = state.quiz.questions.findIndex((q) => q._id === call.params.questionId)
      const built = buildQuestion(call, state.quiz.questions[index])

      if (built.errors) return invalid(built.errors)

      state.quiz.questions[index] = built.question

      return view()
    },
    'DELETE /api/quizzes/:quizId/questions/:questionId': (call) => {
      state.quiz.questions = state.quiz.questions.filter((q) => q._id !== call.params.questionId)

      return view()
    },
    'PATCH /api/quizzes/:quizId/questions/reorder': (call) => {
      const ids = call.body.questionIds

      if (ids.length !== state.quiz.questions.length) return reply(400, { message: 'mismatch', code: 'REORDER_MISMATCH' })

      state.quiz.questions.sort((a, b) => ids.indexOf(a._id) - ids.indexOf(b._id))

      return view()
    },
    'GET /api/courses/:courseId/progress': () => ({
      course: { _id: courseId, name: 'Intro to Vue', status: 'draft', totalLessons: 2 },
      quiz: state.quiz ? { _id: state.quiz._id, title: state.quiz.title, passingScore: state.quiz.passingScore, totalQuestions: state.quiz.questions.length, ready: problemsOf(state.quiz).length === 0 } : null,
      summary: { enrolledLearners: 0, completedLearners: 0, certificatesIssued: 0 },
      students: [],
    }),
  }

  return { state, routes, view }
}

export const aQuestion = (prompt, options = ['Right', 'Wrong', 'Other'], correct = 0) => ({
  _id: oid('q'),
  prompt,
  options: options.map((text, index) => ({ _id: oid('o'), text, isCorrect: index === correct })),
})

// ---------------------------------------------------------------------------------------------
// Student: lessons (learningBackend) + final quiz + attempts + certificate
// ---------------------------------------------------------------------------------------------
export const CERT_NUMBER = 'COH-2026-ABCD2345'

export const makeStudentQuizBackend = ({ questionCount = 3, passingScore = 70, withQuiz = true, quizReady = true, completed = [] } = {}) => {
  const sections = [sectionOf('Basics', [textLesson('Lesson one'), textLesson('Lesson two')])]
  const base = makeLearningBackend({ sections, completed })
  const quiz = withQuiz
    ? {
        _id: 'quiz-1',
        title: 'Final quiz',
        passingScore,
        questions: Array.from({ length: questionCount }, (_, i) => ({
          _id: `qq-${i + 1}`,
          prompt: `Question ${i + 1}?`,
          options: ['Right', 'Wrong', 'Other'].map((text, o) => ({ _id: `qq-${i + 1}-o${o}`, text })),
          correct: `qq-${i + 1}-o0`,
        })),
      }
    : null
  const state = { quiz, attempts: [], certificate: null, quizReady, forcedResult: null, available: true }

  const lessons = () => base.summary().progress
  const lessonsComplete = () => lessons().totalLessons > 0 && lessons().completedLessons === lessons().totalLessons
  const passed = () => state.attempts.some((a) => a.passed)
  const completedNow = () => lessonsComplete() && (!state.quiz || passed())

  const quizSummary = () => {
    if (!state.quiz) return null

    const latest = state.attempts.at(-1) ?? null
    let status = 'available'

    if (passed()) status = 'passed'
    else if (!state.quizReady) status = 'not-ready'
    else if (!lessonsComplete()) status = 'locked'

    return {
      _id: state.quiz._id,
      title: state.quiz.title,
      totalQuestions: state.quiz.questions.length,
      passingScore: state.quiz.passingScore,
      state: status,
      passed: passed(),
      attempts: state.attempts.length,
      latestAttempt: latest && { score: latest.score, passed: latest.passed, submittedAt: latest.submittedAt },
      bestScore: state.attempts.length ? Math.max(...state.attempts.map((a) => a.score)) : null,
    }
  }

  const decorate = (data) => {
    const summary = quizSummary()
    const nextActivity = data.nextLesson
      ? { type: 'lesson', ...data.nextLesson }
      : summary && !summary.passed
        ? { type: 'quiz', quizId: summary._id, title: summary.title, state: summary.state }
        : null

    return {
      ...data,
      progress: { ...data.progress, completed: completedNow() },
      nextActivity,
      quiz: summary,
      certificate: state.certificate && { certificateNumber: state.certificate.certificateNumber, issuedAt: state.certificate.issuedAt },
    }
  }

  const issueIfDue = () => {
    if (completedNow() && !state.certificate) {
      state.certificate = {
        certificateNumber: CERT_NUMBER,
        studentName: 'Test User',
        courseName: 'Intro to Vue',
        instructorName: 'Ina Instructor',
        totalLessons: 2,
        finalScore: state.quiz ? 100 : null,
        issuedAt: '2026-05-21T10:00:00.000Z',
        course: 'course-1',
      }

      return true
    }

    return false
  }

  const gone = () => reply(404, { message: 'Course not found' })

  const routes = {
    ...base.routes,
    'GET /api/students-courses': () => (state.available ? [decorate(base.summary())] : []),
    'GET /api/students-courses/:courseId': () => (state.available ? decorate(base.detail()) : gone()),
    'PUT /api/lessons/:lessonId/completion': (call) => {
      const result = base.routes['PUT /api/lessons/:lessonId/completion'](call)

      if (result instanceof Object && result.status) return result

      const issued = issueIfDue()

      return { ...decorate(result), certificateIssued: issued }
    },
    'DELETE /api/lessons/:lessonId/completion': (call) => decorate(base.routes['DELETE /api/lessons/:lessonId/completion'](call)),

    'GET /api/students-courses/:courseId/quiz': () => {
      if (!state.quiz) return reply(404, { message: 'This course has no final quiz', code: 'QUIZ_NOT_FOUND' })
      if (!state.quizReady) return reply(409, { message: 'The final quiz is not available yet.', code: 'QUIZ_NOT_READY' })
      if (!lessonsComplete()) return reply(409, { message: 'Complete all lessons to unlock the final quiz.', code: 'QUIZ_LOCKED' })

      // the student view: ids and text only, never the key
      return {
        _id: state.quiz._id,
        title: state.quiz.title,
        passingScore: state.quiz.passingScore,
        totalQuestions: state.quiz.questions.length,
        questions: state.quiz.questions.map((q, order) => ({ _id: q._id, prompt: q.prompt, order, options: q.options })),
      }
    },
    'POST /api/students-courses/:courseId/quiz/attempts': (call) => {
      if (!lessonsComplete()) return reply(409, { message: 'Complete all lessons to unlock the final quiz.', code: 'QUIZ_LOCKED' })

      const answers = call.body.answers

      if (answers.length !== state.quiz.questions.length) return reply(400, { message: 'Validation error', errors: [{ path: 'answers', message: 'Answer every question' }] })

      const results = state.quiz.questions.map((q) => ({ questionId: q._id, correct: answers.find((a) => a.questionId === q._id)?.optionId === q.correct }))
      const correctAnswers = results.filter((r) => r.correct).length
      const total = state.quiz.questions.length
      const computed = Math.floor((correctAnswers * 100) / total)
      const forced = state.forcedResult
      const score = forced?.score ?? computed
      const didPass = forced?.passed ?? score >= state.quiz.passingScore
      const attempt = { _id: oid('attempt'), attemptNumber: state.attempts.length + 1, score, passingScore: state.quiz.passingScore, correctAnswers, totalQuestions: total, passed: didPass, submittedAt: `2026-05-2${state.attempts.length}T10:00:00.000Z` }

      state.attempts.push(attempt)

      const issued = issueIfDue()
      const decorated = decorate(base.detail())

      return reply(201, {
        message: 'ok',
        data: {
          ...attempt,
          results,
          courseCompleted: decorated.progress.completed,
          certificateIssued: issued,
          progress: decorated.progress,
          nextLesson: decorated.nextLesson,
          nextActivity: decorated.nextActivity,
          quiz: decorated.quiz,
          certificate: decorated.certificate,
        },
      })
    },
    'GET /api/students-courses/:courseId/quiz/attempts': () => state.attempts.map(({ _id, attemptNumber, score, passingScore: ps, correctAnswers, totalQuestions, passed: p, submittedAt }) => ({ _id, attemptNumber, score, passingScore: ps, correctAnswers, totalQuestions, passed: p, submittedAt })),

    'GET /api/my-certificates': () => (state.certificate ? [state.certificate] : []),
    'GET /api/my-certificates/:number': (call) =>
      state.certificate && call.params.number === state.certificate.certificateNumber ? state.certificate : reply(404, { message: 'Certificate not found' }),
    'GET /api/certificates/verify/:number': (call) =>
      state.certificate && call.params.number === state.certificate.certificateNumber
        ? { valid: true, certificateNumber: state.certificate.certificateNumber, studentName: state.certificate.studentName, courseName: state.certificate.courseName, instructorName: state.certificate.instructorName, issuedAt: state.certificate.issuedAt, totalLessons: state.certificate.totalLessons }
        : reply(404, { message: 'Certificate not found', valid: false }),
  }

  return { routes, state, base, lessons: sections[0].lessons, decorate, completedNow, issueIfDue }
}

// all lesson ids as completed (the quiz becomes the next activity)
export const finishLessons = (backend) => {
  for (const lesson of backend.lessons) backend.base.state.completed.set(lesson._id, '2026-05-20T10:00:00.000Z')
}
