import { api } from './http.js'

// Instructor final-quiz API (M8 backend). One quiz per course; every call returns the whole quiz
// as the instructor edits it:
// { _id, course, title, passingScore, totalQuestions, ready, problems: [{ code, message, questionId? }],
//   questions: [{ _id, prompt, order, options: [{ _id, text, isCorrect }] }] }
// This is the only API that shows which option is correct. Nothing here scores or validates for
// the backend: the backend is authoritative.

// null when the course has no quiz yet (that is a normal answer, not an error)
export const getCourseQuiz = async (courseId) => (await api.get(`/api/courses/${courseId}/quiz`)).data.data

export const createQuiz = async (courseId, settings) => (await api.post(`/api/courses/${courseId}/quiz`, settings)).data.data

// settings = { title, passingScore }
export const updateQuiz = async (quizId, settings) => (await api.put(`/api/quizzes/${quizId}`, settings)).data.data

export const deleteQuiz = async (quizId) => (await api.delete(`/api/quizzes/${quizId}`)).data

// question = { prompt, options: [{ id?, text, isCorrect }] }; an option that already exists keeps
// its `id`, so the stored correct answer follows it when options are edited.
export const addQuestion = async (quizId, question) => (await api.post(`/api/quizzes/${quizId}/questions`, question)).data.data

export const updateQuestion = async (quizId, questionId, question) =>
  (await api.put(`/api/quizzes/${quizId}/questions/${questionId}`, question)).data.data

export const deleteQuestion = async (quizId, questionId) => (await api.delete(`/api/quizzes/${quizId}/questions/${questionId}`)).data.data

// the COMPLETE list of question ids in the new order
export const reorderQuestions = async (quizId, questionIds) =>
  (await api.patch(`/api/quizzes/${quizId}/questions/reorder`, { questionIds })).data.data
