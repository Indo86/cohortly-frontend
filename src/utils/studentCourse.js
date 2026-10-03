import { R } from '@/constants/routes.js'

// How a course looks to the student, read from the BACKEND's fields only. Nothing here computes a
// percentage, a score, a completion flag or a next lesson. `progress.completed` is the
// authoritative course completion (all lessons, plus a passed final quiz when the course has one).
export const courseState = (progress, quiz = null) => {
  if (!progress || progress.totalLessons === 0) return 'empty'
  if (progress.completed) return 'completed'
  // every lesson is done but the final quiz still has to be passed (the lesson percent stays 100)
  if (quiz && progress.completedLessons === progress.totalLessons) return 'quiz-pending'
  if (progress.completedLessons === 0) return 'not-started'

  return 'in-progress'
}

export const STATE_LABELS = Object.freeze({
  empty: 'No lessons yet',
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'quiz-pending': 'Final quiz pending',
  completed: 'Completed',
})

export const STATE_TONES = Object.freeze({
  empty: 'neutral',
  'not-started': 'neutral',
  'in-progress': 'info',
  'quiz-pending': 'warning',
  completed: 'success',
})

export const lessonRoute = (courseId, lessonId) => ({
  name: R.STUDENT_LESSON,
  params: { courseId, lessonId },
})

export const courseRoute = (courseId) => ({ name: R.STUDENT_COURSE, params: { courseId } })
export const quizRoute = (courseId) => ({ name: R.STUDENT_QUIZ, params: { courseId } })
export const certificateRoute = (certificateNumber) => ({ name: R.STUDENT_CERTIFICATE, params: { certificateNumber } })

// What the main button of a course does, from the backend's nextActivity (a lesson or the final
// quiz) with nextLesson as the fallback: Start / Continue open the next lesson, "Take final quiz" /
// "Retry final quiz" open the quiz, Review (and a course without lessons) opens the outline.
export const courseAction = (course) => {
  const state = courseState(course.progress, course.quiz)

  if (state === 'completed') return { label: 'Review course', to: courseRoute(course._id), variant: 'secondary' }

  const activity = course.nextActivity ?? (course.nextLesson ? { type: 'lesson', ...course.nextLesson } : null)

  if (activity?.type === 'lesson' && state !== 'empty') {
    return {
      label: state === 'not-started' ? 'Start course' : 'Continue learning',
      to: lessonRoute(course._id, activity._id),
      variant: 'primary',
    }
  }

  if (activity?.type === 'quiz' && course.quiz?.state === 'available') {
    return {
      label: course.quiz.attempts > 0 ? 'Retry final quiz' : 'Take final quiz',
      to: quizRoute(course._id),
      variant: 'primary',
    }
  }

  return { label: 'Open course', to: courseRoute(course._id), variant: 'secondary' }
}

// "View certificate", when the backend says one was issued
export const certificateAction = (course) =>
  course.certificate ? { label: 'View certificate', to: certificateRoute(course.certificate.certificateNumber) } : null

export const lessonCountText = (progress) =>
  `${progress.completedLessons} of ${progress.totalLessons} ${progress.totalLessons === 1 ? 'lesson' : 'lessons'}`
