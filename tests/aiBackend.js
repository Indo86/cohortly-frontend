import { reply } from './fakeApi.js'

// A stand-in for the optional AI endpoints. The real backend (provider, prompts, limits) is covered by the
// backend suite; here the frontend must only show what comes back and keep the LMS working when AI does not.
export const aiStatus = ({ enabled = true, available = true } = {}) => ({
  'GET /api/ai/status': { enabled, available, provider: enabled ? 'openrouter' : null },
})

export const PRACTICE = [
  { question: 'What does a closure keep?', options: ['Access to outer variables', 'A copy of the DOM', 'Nothing'], answer: 0, explanation: 'It keeps access to the scope where it was created.' },
  { question: 'Where is a closure created?', options: ['Only in classes', 'Inside a function'], answer: 1, explanation: 'Functions create closures.' },
]

export const DRAFT = [
  { prompt: 'What does a closure keep?', options: [{ text: 'Access to outer variables', isCorrect: true }, { text: 'A copy of the DOM', isCorrect: false }, { text: 'Nothing', isCorrect: false }] },
  { prompt: 'Which statement is true?', options: [{ text: 'Functions create closures', isCorrect: true }, { text: 'Only classes create closures', isCorrect: false }] },
  { prompt: 'What is hoisting?', options: [{ text: 'Declarations move to the top of their scope', isCorrect: true }, { text: 'A kind of loop', isCorrect: false }] },
]

export const aiRoutes = (options = {}) => ({
  ...aiStatus(options),
  'POST /api/students-courses/:courseId/lessons/:lessonId/ai/question': { answer: 'A closure keeps access to variables from where it was created.', groundedInLesson: true, generatedAt: '2026-05-21T10:00:00.000Z' },
  'POST /api/students-courses/:courseId/lessons/:lessonId/ai/summary': { summary: 'A closure remembers its scope.\n- It keeps outer variables.', generatedAt: '2026-05-21T10:00:00.000Z', cached: false },
  'POST /api/students-courses/:courseId/lessons/:lessonId/ai/practice': { questions: PRACTICE, generatedAt: '2026-05-21T10:00:00.000Z' },
  'POST /api/courses/:courseId/quiz/ai-draft': { questions: DRAFT, dropped: 0, generatedAt: '2026-05-21T10:00:00.000Z' },
})

// the controlled AI failures, as the backend sends them
export const aiFailure = (code, status = 503) => reply(status, { message: `raw backend text for ${code}`, code })
