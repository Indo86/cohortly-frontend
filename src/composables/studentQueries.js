import { computed, unref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import * as certificateService from '@/services/certificateService.js'
import * as learningService from '@/services/learningService.js'
import { queryKeys } from '@/services/queryKeys.js'

// Student reads. staleTime is 0 on purpose: learning data changes under the student's feet
// (an instructor adds a lesson, unpublishes a course), so every visit shows the cached copy
// only until the backend has answered again. Nothing is stored outside the query cache.
const enabledWhen = (...ids) => computed(() => ids.every((id) => Boolean(unref(id))))

export const useStudentCoursesQuery = () =>
  useQuery({
    queryKey: queryKeys.studentCourses,
    queryFn: learningService.getMyCourses,
    staleTime: 0,
  })

export const useStudentCourseQuery = (courseId) =>
  useQuery({
    queryKey: computed(() => queryKeys.studentCourse(unref(courseId))),
    queryFn: () => learningService.getCourse(unref(courseId)),
    enabled: enabledWhen(courseId),
    staleTime: 0,
  })

export const useStudentLessonQuery = (courseId, lessonId) =>
  useQuery({
    queryKey: computed(() => queryKeys.studentLesson(unref(courseId), unref(lessonId))),
    queryFn: () => learningService.getLesson(unref(courseId), unref(lessonId)),
    enabled: enabledWhen(courseId, lessonId),
    staleTime: 0,
  })

// The quiz to answer. A 409 (QUIZ_LOCKED / QUIZ_NOT_READY) is an answer the page explains, not a
// glitch, so it is never retried (queryClient retries only network and server errors).
export const useStudentQuizQuery = (courseId) =>
  useQuery({
    queryKey: computed(() => queryKeys.studentQuiz(unref(courseId))),
    queryFn: () => learningService.getQuiz(unref(courseId)),
    enabled: enabledWhen(courseId),
    staleTime: 0,
  })

export const useQuizAttemptsQuery = (courseId) =>
  useQuery({
    queryKey: computed(() => queryKeys.quizAttempts(unref(courseId))),
    queryFn: () => learningService.getQuizAttempts(unref(courseId)),
    enabled: enabledWhen(courseId),
    staleTime: 0,
  })

// Certificates are history: they stay readable while the workspace is inactive, so these queries
// are not behind the active-workspace route rule.
export const useMyCertificatesQuery = () =>
  useQuery({ queryKey: queryKeys.studentCertificates, queryFn: certificateService.getMyCertificates, staleTime: 0 })

export const useMyCertificateQuery = (certificateNumber) =>
  useQuery({
    queryKey: computed(() => queryKeys.studentCertificate(unref(certificateNumber))),
    queryFn: () => certificateService.getMyCertificate(unref(certificateNumber)),
    enabled: enabledWhen(certificateNumber),
    staleTime: 0,
  })

// Public verification: no session needed. A certificate never changes, so a short cache is fine.
export const useCertificateVerificationQuery = (certificateNumber) =>
  useQuery({
    queryKey: computed(() => queryKeys.certificateVerification(unref(certificateNumber))),
    queryFn: () => certificateService.verifyCertificate(unref(certificateNumber)),
    enabled: enabledWhen(certificateNumber),
  })
