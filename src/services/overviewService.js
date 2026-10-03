import { api } from './http.js'

// Real numbers for the instructor dashboard:
// { totalCourses, publishedCourses, totalStudents, totalVideos, totalTexts, courses, students }
export const getOverview = async () => (await api.get('/api/overviews')).data.data
