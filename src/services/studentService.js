import { api } from './http.js'

// Instructor-side student management and enrollment.

// [{ _id, name, photo_url, courses: [courseId] }] (courses = the courses the student is enrolled in)
export const listStudents = async () => (await api.get('/api/students')).data.data

// { _id, name, email }
export const getStudent = async (studentId) => (await api.get(`/api/students/${studentId}`)).data.data

// Builds the multipart body. The password is only included when one was typed: a missing
// password means "keep the current one" to the backend, and "undefined" / "null" strings
// must never be sent.
export const studentForm = ({ name, email, password, avatar }) => {
  const form = new FormData()

  form.append('name', name)
  form.append('email', email)
  if (password) form.append('password', password)
  if (avatar) form.append('avatar', avatar)

  return form
}

export const createStudent = async (values) => (await api.post('/api/students', studentForm(values))).data

export const updateStudent = async (studentId, values) =>
  (await api.put(`/api/students/${studentId}`, studentForm(values))).data

// Also removes the student's enrollments and all their progress.
export const deleteStudent = async (studentId) => (await api.delete(`/api/students/${studentId}`)).data

// ---- enrollment ----

// { _id, name, students: [{ _id, name, email, photo_url }] }
export const getCourseStudents = async (courseId) => (await api.get(`/api/courses/students/${courseId}`)).data.data

export const enrollStudent = async (courseId, studentId) =>
  (await api.post(`/api/courses/students/${courseId}`, { studentId })).data

// Also deletes the student's progress in that course.
export const unenrollStudent = async (courseId, studentId) =>
  (await api.put(`/api/courses/students/${courseId}`, { studentId })).data
