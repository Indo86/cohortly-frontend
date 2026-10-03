import { api } from './http.js'

// A lesson body is { title, type: 'text' | 'video', text } or { title, type, youtubeId }.
// Only the field for the chosen type is sent; the backend sanitizes `text` and stays authoritative.
export const lessonPayload = ({ title, type, text, youtubeId }) =>
  type === 'video' ? { title, type, youtubeId } : { title, type, text }

export const getLesson = async (lessonId) => (await api.get(`/api/lessons/${lessonId}`)).data.data

export const createLesson = async (sectionId, lesson) =>
  (await api.post(`/api/sections/${sectionId}/lessons`, lessonPayload(lesson))).data.data

export const updateLesson = async (lessonId, lesson) =>
  (await api.put(`/api/lessons/${lessonId}`, lessonPayload(lesson))).data.data

// Deletes the lesson and every student's completion of it.
export const deleteLesson = async (lessonId) => (await api.delete(`/api/lessons/${lessonId}`)).data

// Lessons only move within their section: pass every lesson id of that section in the new order.
export const reorderLessons = async (sectionId, lessonIds) =>
  (await api.patch(`/api/sections/${sectionId}/lessons/reorder`, { lessonIds })).data.data
