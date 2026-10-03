import { api } from './http.js'

// Student learning API (M3B backend). Progress is computed by the backend and every shape
// below is returned as-is: this layer only unwraps the { message, data } envelope.

// Enrolled, PUBLISHED courses (backend order), each:
// { _id, name, tagline, category: { _id, name }, thumbnail, thumbnail_url,
//   progress: { completedLessons, totalLessons, percent, completed }, nextLesson }
export const getMyCourses = async () => (await api.get('/api/students-courses')).data.data

// The learning view of one course: the course fields above plus `description`, ordered
// `sections` [{ _id, title, order, completedLessons, totalLessons,
// lessons: [{ _id, title, type, order, completed }] }], `progress`, `nextLesson`, `lastActivityAt`.
// Lesson content is not included.
export const getCourse = async (courseId) => (await api.get(`/api/students-courses/${courseId}`)).data.data

// One lesson: { _id, title, type, text (sanitized HTML), youtubeId, sectionId, sectionTitle,
// completed, completedAt, previousLessonId, nextLessonId }
export const getLesson = async (courseId, lessonId) =>
  (await api.get(`/api/students-courses/${courseId}/lessons/${lessonId}`)).data.data

// Both are idempotent state-setting calls and answer with
// { lessonId, completed, completedAt, progress, nextLesson }
export const markLessonComplete = async (lessonId) => (await api.put(`/api/lessons/${lessonId}/completion`)).data.data

export const undoLessonComplete = async (lessonId) => (await api.delete(`/api/lessons/${lessonId}/completion`)).data.data

// ---- final quiz (M8) ----

// The quiz to answer: { _id, title, passingScore, totalQuestions, questions: [{ _id, prompt, order,
// options: [{ _id, text }] }] }. It never contains the answer key. 409 QUIZ_LOCKED until every
// lesson is completed, 409 QUIZ_NOT_READY while the instructor has not finished it.
export const getQuiz = async (courseId) => (await api.get(`/api/students-courses/${courseId}/quiz`)).data.data

// answers = [{ questionId, optionId }] for EVERY question. Only the choices are sent: the backend
// computes correctness, score and pass/fail. Returns
// { _id, attemptNumber, score, passingScore, correctAnswers, totalQuestions, passed, submittedAt,
//   results: [{ questionId, correct }], courseCompleted, certificateIssued,
//   progress, nextLesson, nextActivity, quiz, certificate }
export const submitQuizAttempt = async (courseId, answers) =>
  (await api.post(`/api/students-courses/${courseId}/quiz/attempts`, { answers })).data.data

// the student's own attempts, oldest first: [{ _id, attemptNumber, score, passingScore, correctAnswers,
// totalQuestions, passed, submittedAt }]
export const getQuizAttempts = async (courseId) => (await api.get(`/api/students-courses/${courseId}/quiz/attempts`)).data.data

