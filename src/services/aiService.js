import { api } from './http.js'

// Optional AI assistance (M9). The browser only ever talks to the Cohortly backend: the provider, its key,
// the model and every instruction live there. A request carries user data only (a question, a count,
// a focus); there is no way to send a prompt, a provider or a model.
//
// Generation can be slower than a normal API call (the provider has its own timeout and the backend may retry
// once), so these calls get a longer client timeout than the default 15 seconds.
const AI_TIMEOUT_MS = 60000

// { enabled, available, provider }: configuration state only (the backend never calls the provider for it)
export const getAiStatus = async () => (await api.get('/api/ai/status')).data.data

const lessonUrl = (courseId, lessonId, kind) => `/api/students-courses/${courseId}/lessons/${lessonId}/ai/${kind}`

// -> { answer, groundedInLesson, generatedAt }
export const askLessonQuestion = async (courseId, lessonId, question) =>
  (await api.post(lessonUrl(courseId, lessonId, 'question'), { question }, { timeout: AI_TIMEOUT_MS })).data.data

// -> { summary, generatedAt, cached }
export const getLessonSummary = async (courseId, lessonId) =>
  (await api.post(lessonUrl(courseId, lessonId, 'summary'), {}, { timeout: AI_TIMEOUT_MS })).data.data

// -> { questions: [{ question, options, answer (index into options), explanation }], generatedAt }; practice only
export const generatePracticeQuestions = async (courseId, lessonId) =>
  (await api.post(lessonUrl(courseId, lessonId, 'practice'), {}, { timeout: AI_TIMEOUT_MS })).data.data

// -> { questions: [{ prompt, options: [{ text, isCorrect }] }], dropped, generatedAt }: a DRAFT in the exact shape
// of the quiz API. Nothing is saved: the instructor applies it through the normal quiz endpoints.
export const generateQuizDraft = async (courseId, { count, focus }) =>
  (await api.post(`/api/courses/${courseId}/quiz/ai-draft`, { count, ...(focus ? { focus } : {}) }, { timeout: AI_TIMEOUT_MS })).data.data
