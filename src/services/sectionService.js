import { api } from './http.js'

export const createSection = async (courseId, title) =>
  (await api.post(`/api/courses/${courseId}/sections`, { title })).data.data

export const renameSection = async (sectionId, title) => (await api.put(`/api/sections/${sectionId}`, { title })).data.data

// Deletes the section, its lessons and their progress records.
export const deleteSection = async (sectionId) => (await api.delete(`/api/sections/${sectionId}`)).data

// The backend needs EVERY current section id exactly once, in the new order
// (400 REORDER_MISMATCH otherwise).
export const reorderSections = async (courseId, sectionIds) =>
  (await api.patch(`/api/courses/${courseId}/sections/reorder`, { sectionIds })).data.data
