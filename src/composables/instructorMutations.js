import { useMutation, useQueryClient } from '@tanstack/vue-query'
import * as courseService from '@/services/courseService.js'
import * as lessonService from '@/services/lessonService.js'
import * as quizService from '@/services/quizService.js'
import * as sectionService from '@/services/sectionService.js'
import * as studentService from '@/services/studentService.js'
import { queryKeys } from '@/services/queryKeys.js'
import { notify } from './useToast.js'

// Writes. Each mutation refreshes ONLY the cache entries its change can affect, and returns
// the invalidation promise so the mutation stays "pending" until the screen shows fresh data.
// The backend stays authoritative: nothing is updated optimistically. After the refresh a short
// confirmation toast is shown (see useToast.js): "Course saved.", "Lesson created.", ...

const refresh = (queryClient, ...keys) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))

// only the detail of one course (not its learners / progress)
const refreshCourseDetail = (queryClient, courseId) =>
  queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId), exact: true })

// the learner and progress lists of every course (a student's name or existence changed)
const refreshAllLearnerLists = (queryClient) =>
  queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === 'instructor' && queryKey[1] === 'course' && ['students', 'progress'].includes(queryKey[3]),
  })

// runs the refresh, then confirms
const confirmed = async (message, refreshing) => {
  await refreshing
  notify(message)
}

// ---- courses ----

export const useCreateCourse = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: courseService.createCourse,
    onSuccess: () => confirmed('Course created.', refresh(queryClient, queryKeys.courses, queryKeys.overview)),
  })
}

export const useUpdateCourse = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form) => courseService.updateCourse(courseId.value, form),
    onSuccess: () =>
      confirmed(
        'Course saved.',
        Promise.all([
          refreshCourseDetail(queryClient, courseId.value),
          refresh(queryClient, queryKeys.courses, queryKeys.overview),
        ])
      ),
  })
}

export const useDeleteCourse = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: courseService.deleteCourse,
    onSuccess: (_data, courseId) => {
      // everything about the deleted course is gone for good
      queryClient.removeQueries({ queryKey: queryKeys.course(courseId) })

      return confirmed('Course deleted.', refresh(queryClient, queryKeys.courses, queryKeys.overview, queryKeys.students))
    },
  })
}

export const useSetCourseStatus = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status) => courseService.setCourseStatus(courseId.value, status),
    onSuccess: (_data, status) =>
      confirmed(
        status === 'published' ? 'Course published. Enrolled students can now see it.' : 'Course unpublished. It is now a draft.',
        refresh(queryClient, queryKeys.course(courseId.value), queryKeys.courses, queryKeys.overview)
      ),
  })
}

// ---- sections ----

export const useCreateSection = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (title) => sectionService.createSection(courseId.value, title),
    onSuccess: () => confirmed('Section added.', refreshCourseDetail(queryClient, courseId.value)),
  })
}

export const useRenameSection = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, title }) => sectionService.renameSection(sectionId, title),
    onSuccess: () => confirmed('Section renamed.', refreshCourseDetail(queryClient, courseId.value)),
  })
}

// lessons (and their progress) go with the section, so counts and progress change
export const useDeleteSection = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sectionId) => sectionService.deleteSection(sectionId),
    onSuccess: () =>
      confirmed(
        'Section deleted.',
        Promise.all([
          refreshCourseDetail(queryClient, courseId.value),
          refresh(queryClient, queryKeys.courseProgress(courseId.value), queryKeys.overview),
        ])
      ),
  })
}

// On failure (e.g. REORDER_MISMATCH) the caller refetches: the server's order wins.
// Reordering is a small, immediately visible change, so it gets no toast.
export const useReorderSections = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sectionIds) => sectionService.reorderSections(courseId.value, sectionIds),
    onSuccess: () => refreshCourseDetail(queryClient, courseId.value),
    onError: () => refreshCourseDetail(queryClient, courseId.value),
  })
}

// ---- lessons ----

export const useCreateLesson = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, lesson }) => lessonService.createLesson(sectionId, lesson),
    onSuccess: () =>
      confirmed(
        'Lesson created.',
        Promise.all([
          refreshCourseDetail(queryClient, courseId.value),
          refresh(queryClient, queryKeys.courseProgress(courseId.value), queryKeys.overview),
        ])
      ),
  })
}

export const useUpdateLesson = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ lessonId, lesson }) => lessonService.updateLesson(lessonId, lesson),
    onSuccess: (_data, { lessonId }) =>
      confirmed(
        'Lesson saved.',
        Promise.all([
          refreshCourseDetail(queryClient, courseId.value),
          refresh(queryClient, queryKeys.lesson(lessonId), queryKeys.overview),
        ])
      ),
  })
}

export const useDeleteLesson = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lessonId) => lessonService.deleteLesson(lessonId),
    onSuccess: (_data, lessonId) => {
      queryClient.removeQueries({ queryKey: queryKeys.lesson(lessonId) })

      return confirmed(
        'Lesson deleted.',
        Promise.all([
          refreshCourseDetail(queryClient, courseId.value),
          refresh(queryClient, queryKeys.courseProgress(courseId.value), queryKeys.overview),
        ])
      )
    },
  })
}

export const useReorderLessons = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sectionId, lessonIds }) => lessonService.reorderLessons(sectionId, lessonIds),
    onSuccess: () => refreshCourseDetail(queryClient, courseId.value),
    onError: () => refreshCourseDetail(queryClient, courseId.value),
  })
}

// ---- students ----

export const useCreateStudent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: studentService.createStudent,
    onSuccess: () => confirmed('Student added.', refresh(queryClient, queryKeys.students, queryKeys.overview)),
  })
}

export const useUpdateStudent = (studentId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values) => studentService.updateStudent(studentId.value, values),
    onSuccess: () =>
      confirmed(
        'Student updated.',
        Promise.all([
          refresh(queryClient, queryKeys.students, queryKeys.student(studentId.value), queryKeys.overview),
          refreshAllLearnerLists(queryClient),
        ])
      ),
  })
}

export const useDeleteStudent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: studentService.deleteStudent,
    onSuccess: (_data, studentId) => {
      queryClient.removeQueries({ queryKey: queryKeys.student(studentId) })

      return confirmed(
        'Student deleted.',
        Promise.all([
          refresh(queryClient, queryKeys.students, queryKeys.courses, queryKeys.overview),
          refreshAllLearnerLists(queryClient),
        ])
      )
    },
  })
}

// ---- enrollment ----

const refreshEnrollment = (queryClient, courseId) =>
  refresh(
    queryClient,
    queryKeys.courseStudents(courseId),
    queryKeys.courseProgress(courseId),
    queryKeys.students,
    queryKeys.courses,
    queryKeys.overview
  )

export const useEnrollStudent = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (studentId) => studentService.enrollStudent(courseId.value, studentId),
    onSuccess: () => confirmed('Learner enrolled.', refreshEnrollment(queryClient, courseId.value)),
  })
}

// deletes the student's progress in this course
export const useUnenrollStudent = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (studentId) => studentService.unenrollStudent(courseId.value, studentId),
    onSuccess: () => confirmed('Learner removed from the course.', refreshEnrollment(queryClient, courseId.value)),
  })
}

// ---- final quiz ----
// Every quiz call answers with the WHOLE quiz as the backend now has it, so that answer replaces the
// cached quiz (no guessing locally). The learner progress page also shows quiz results, so it is
// refreshed; deleting the quiz can complete the course for waiting learners.

const storeQuiz = (queryClient, courseId, quiz) => queryClient.setQueryData(queryKeys.courseQuiz(courseId), quiz)

const refreshProgress = (queryClient, courseId) =>
  queryClient.invalidateQueries({ queryKey: queryKeys.courseProgress(courseId) })

export const useCreateQuiz = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings) => quizService.createQuiz(courseId.value, settings),
    onSuccess: async (quiz) => {
      storeQuiz(queryClient, courseId.value, quiz)
      await refreshProgress(queryClient, courseId.value)
      notify('Final quiz created.')
    },
  })
}

export const useUpdateQuiz = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ quizId, settings }) => quizService.updateQuiz(quizId, settings),
    onSuccess: async (quiz) => {
      storeQuiz(queryClient, courseId.value, quiz)
      await refreshProgress(queryClient, courseId.value)
      notify('Quiz settings saved.')
    },
  })
}

export const useDeleteQuiz = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (quizId) => quizService.deleteQuiz(quizId),
    onSuccess: async () => {
      storeQuiz(queryClient, courseId.value, null)
      await refreshProgress(queryClient, courseId.value)
      notify('Final quiz deleted.')
    },
  })
}

export const useAddQuestion = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ quizId, question }) => quizService.addQuestion(quizId, question),
    onSuccess: (quiz) => {
      storeQuiz(queryClient, courseId.value, quiz)
      notify('Question added.')
    },
  })
}

export const useUpdateQuestion = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ quizId, questionId, question }) => quizService.updateQuestion(quizId, questionId, question),
    onSuccess: (quiz) => {
      storeQuiz(queryClient, courseId.value, quiz)
      notify('Question saved.')
    },
  })
}

export const useDeleteQuestion = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ quizId, questionId }) => quizService.deleteQuestion(quizId, questionId),
    onSuccess: (quiz) => {
      storeQuiz(queryClient, courseId.value, quiz)
      notify('Question deleted.')
    },
  })
}

// On failure (REORDER_MISMATCH) the caller refetches: the server order wins. No toast: the change is visible.
export const useReorderQuestions = (courseId) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ quizId, questionIds }) => quizService.reorderQuestions(quizId, questionIds),
    onSuccess: (quiz) => storeQuiz(queryClient, courseId.value, quiz),
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.courseQuiz(courseId.value), exact: true }),
  })
}
