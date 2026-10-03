import { api } from './http.js'

// Instructor course API. Bodies and responses follow the M3B backend.

export const getCategories = async () => (await api.get('/api/categories')).data.data

// [{ _id, name, status, thumbnail_url, category: { name }, students, total_students }]
export const listCourses = async () => (await api.get('/api/courses')).data.data

// The management view: course fields (category: { _id, name }), status, thumbnail_url and the
// ordered `sections` with their `lessons` (no lesson content).
export const getCourse = async (courseId) => (await api.get(`/api/courses/${courseId}`)).data.data

// `form` is a FormData with name, tagline, description, categoryId and (when set) thumbnail.
// Returns { _id } of the new course. The backend always creates it as a draft.
export const createCourse = async (form) => (await api.post('/api/courses', form)).data.data

export const updateCourse = async (courseId, form) => (await api.put(`/api/courses/${courseId}`, form)).data

export const deleteCourse = async (courseId) => (await api.delete(`/api/courses/${courseId}`)).data

// status: 'draft' | 'published'. Publishing needs at least one lesson (422 COURSE_NOT_PUBLISHABLE).
export const setCourseStatus = async (courseId, status) =>
  (await api.put(`/api/courses/${courseId}/status`, { status })).data.data

// Learner progress, computed by the backend:
// { course: { _id, name, status, totalLessons }, summary: { enrolledLearners, completedLearners },
//   students: [{ _id, name, email, photo_url, progress, nextLesson, lastActivityAt }] }
export const getCourseProgress = async (courseId) => (await api.get(`/api/courses/${courseId}/progress`)).data.data
