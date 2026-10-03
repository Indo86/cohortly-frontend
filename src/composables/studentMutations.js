import { useMutation, useQueryClient } from '@tanstack/vue-query'
import * as learningService from '@/services/learningService.js'
import { queryKeys } from '@/services/queryKeys.js'

// Student writes: lesson completion and quiz attempts. The backend is authoritative, so nothing is
// changed before it answers (no optimistic update). After a success the backend's answer is copied
// into the cache and the affected queries are refetched:
//  - the course's progress, nextLesson and (when the answer has them) nextActivity, quiz and
//    certificate are set from the answer, so the screen is right immediately;
//  - the course (outline, lastActivityAt) and the "my courses" list are invalidated and refetched,
//    and the mutation stays pending until the course is fresh.
// Other lessons and every instructor key are left alone.

// only the fields the answer actually carries: an older answer never erases newer cached state
const STATE_KEYS = ['progress', 'nextLesson', 'nextActivity', 'quiz', 'certificate']

const mergeState = (course, result) => {
  if (!course) return course

  const patch = {}

  for (const key of STATE_KEYS) if (result[key] !== undefined) patch[key] = result[key]

  return { ...course, ...patch }
}

const refreshCourse = (queryClient, courseId) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.studentCourse(courseId), exact: true }),
    queryClient.invalidateQueries({ queryKey: queryKeys.studentCourses, exact: true }),
  ])

const useCompletion = (courseId, service) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lessonId) => service(lessonId),
    onSuccess: (result, lessonId) => {
      const lessonKey = queryKeys.studentLesson(courseId.value, lessonId)

      queryClient.setQueryData(lessonKey, (lesson) =>
        lesson ? { ...lesson, completed: result.completed, completedAt: result.completedAt } : lesson
      )
      queryClient.setQueryData(queryKeys.studentCourse(courseId.value), (course) => mergeState(course, result))

      // completing the last lesson of a course without a quiz can issue a certificate
      if (result.certificate) queryClient.invalidateQueries({ queryKey: queryKeys.studentCertificates })

      return refreshCourse(queryClient, courseId.value)
    },
  })
}

export const useCompleteLesson = (courseId) => useCompletion(courseId, learningService.markLessonComplete)

export const useUndoLessonCompletion = (courseId) => useCompletion(courseId, learningService.undoLessonComplete)

// Submitting an attempt. The answer carries the score, pass/fail, per-question right/wrong, the new
// completion state and the certificate; the page shows exactly that. Every submit is a NEW attempt
// on the backend, so the attempt history is refetched.
export const useSubmitQuiz = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (answers) => learningService.submitQuizAttempt(courseId.value, answers),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.studentCourse(courseId.value), (course) => mergeState(course, result))

      if (result.certificate) queryClient.invalidateQueries({ queryKey: queryKeys.studentCertificates })

      return Promise.all([
        refreshCourse(queryClient, courseId.value),
        queryClient.invalidateQueries({ queryKey: queryKeys.quizAttempts(courseId.value), exact: true }),
      ])
    },
  })
}
