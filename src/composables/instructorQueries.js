import { computed, unref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import * as courseService from '@/services/courseService.js'
import * as lessonService from '@/services/lessonService.js'
import * as quizService from '@/services/quizService.js'
import { getOverview } from '@/services/overviewService.js'
import * as studentService from '@/services/studentService.js'
import { queryKeys } from '@/services/queryKeys.js'

// Reads. Each hook owns one cache entry (see services/queryKeys.js); ids may be refs so the
// query follows the route.
const idKey = (builder, id) => computed(() => builder(unref(id)))
const hasId = (id) => computed(() => Boolean(unref(id)))

export const useOverviewQuery = () => useQuery({ queryKey: queryKeys.overview, queryFn: getOverview })

// categories almost never change: keep them for a while
export const useCategoriesQuery = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: courseService.getCategories, staleTime: 5 * 60_000 })

export const useCoursesQuery = () => useQuery({ queryKey: queryKeys.courses, queryFn: courseService.listCourses })

export const useCourseQuery = (courseId) =>
  useQuery({
    queryKey: idKey(queryKeys.course, courseId),
    queryFn: () => courseService.getCourse(unref(courseId)),
    enabled: hasId(courseId),
  })

export const useCourseStudentsQuery = (courseId) =>
  useQuery({
    queryKey: idKey(queryKeys.courseStudents, courseId),
    queryFn: () => studentService.getCourseStudents(unref(courseId)),
    enabled: hasId(courseId),
  })

export const useCourseProgressQuery = (courseId) =>
  useQuery({
    queryKey: idKey(queryKeys.courseProgress, courseId),
    queryFn: () => courseService.getCourseProgress(unref(courseId)),
    enabled: hasId(courseId),
  })

export const useLessonQuery = (lessonId) =>
  useQuery({
    queryKey: idKey(queryKeys.lesson, lessonId),
    queryFn: () => lessonService.getLesson(unref(lessonId)),
    enabled: hasId(lessonId),
  })

export const useStudentsQuery = () => useQuery({ queryKey: queryKeys.students, queryFn: studentService.listStudents })

export const useStudentQuery = (studentId) =>
  useQuery({
    queryKey: idKey(queryKeys.student, studentId),
    queryFn: () => studentService.getStudent(unref(studentId)),
    enabled: hasId(studentId),
  })

// The course's single final quiz (null when it has none), with the answer key: instructor only.
export const useCourseQuizQuery = (courseId) =>
  useQuery({
    queryKey: idKey(queryKeys.courseQuiz, courseId),
    queryFn: () => quizService.getCourseQuiz(unref(courseId)),
    enabled: hasId(courseId),
  })
