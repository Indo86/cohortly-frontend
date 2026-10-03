import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/services/queryKeys.js'
import * as learningService from '@/services/learningService.js'
import { courseAction, courseState, lessonCountText } from '@/utils/studentCourse.js'
import { R } from '@/constants/routes.js'
import { fakeApi } from './fakeApi.js'

describe('learningService', () => {
  it('uses the real endpoints and returns the backend data untouched', async () => {
    const detail = { _id: 'c1', progress: { completedLessons: 1, totalLessons: 4, percent: 99, completed: false }, nextLesson: null }
    const fake = fakeApi({
      'GET /api/students-courses': [{ _id: 'c1' }],
      'GET /api/students-courses/:courseId': detail,
      'GET /api/students-courses/:courseId/lessons/:lessonId': { _id: 'l1' },
      'PUT /api/lessons/:lessonId/completion': { lessonId: 'l1', completed: true },
      'DELETE /api/lessons/:lessonId/completion': { lessonId: 'l1', completed: false },
    })

    expect(await learningService.getMyCourses()).toEqual([{ _id: 'c1' }])
    expect(await learningService.getCourse('c1')).toEqual(detail)
    expect((await learningService.getCourse('c1')).progress.percent).toBe(99)
    expect(await learningService.getLesson('c1', 'l1')).toEqual({ _id: 'l1' })
    expect(await learningService.markLessonComplete('l1')).toEqual({ lessonId: 'l1', completed: true })
    expect(await learningService.undoLessonComplete('l1')).toEqual({ lessonId: 'l1', completed: false })

    expect(fake.calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /api/students-courses',
      'GET /api/students-courses/c1',
      'GET /api/students-courses/c1',
      'GET /api/students-courses/c1/lessons/l1',
      'PUT /api/lessons/l1/completion',
      'DELETE /api/lessons/l1/completion',
    ])
  })
})

describe('student query keys', () => {
  it('live in their own branch, away from the instructor keys', () => {
    expect(queryKeys.studentCourses).toEqual(['student', 'courses'])
    expect(queryKeys.studentCourse('c1')).toEqual(['student', 'course', 'c1'])
    expect(queryKeys.studentLesson('c1', 'l1')).toEqual(['student', 'course', 'c1', 'lesson', 'l1'])
    expect(queryKeys.studentCourse('c1').slice(0, 2)).not.toEqual(queryKeys.course('c1').slice(0, 2))
  })
})

describe('studentCourse helpers', () => {
  const progress = (completedLessons, totalLessons, completed = completedLessons === totalLessons && totalLessons > 0) => ({
    completedLessons,
    totalLessons,
    percent: 7, // never read by the helpers
    completed,
  })

  it('reads the state from the backend fields', () => {
    expect(courseState(progress(0, 0))).toBe('empty')
    expect(courseState(progress(0, 3))).toBe('not-started')
    expect(courseState(progress(1, 3))).toBe('in-progress')
    expect(courseState(progress(3, 3))).toBe('completed')
    expect(courseState(progress(1, 3, true))).toBe('completed')
  })

  it('chooses Start, Continue, Review or Open from the state and the backend nextLesson', () => {
    const next = { _id: 'l9' }

    expect(courseAction({ _id: 'c', progress: progress(0, 3), nextLesson: next })).toMatchObject({ label: 'Start course', to: { name: R.STUDENT_LESSON, params: { courseId: 'c', lessonId: 'l9' } } })
    expect(courseAction({ _id: 'c', progress: progress(1, 3), nextLesson: next }).label).toBe('Continue learning')
    expect(courseAction({ _id: 'c', progress: progress(3, 3), nextLesson: null })).toMatchObject({ label: 'Review course', to: { name: R.STUDENT_COURSE } })
    expect(courseAction({ _id: 'c', progress: progress(0, 0), nextLesson: null }).label).toBe('Open course')
  })

  it('words the counts', () => {
    expect(lessonCountText(progress(1, 1))).toBe('1 of 1 lesson')
    expect(lessonCountText(progress(2, 5))).toBe('2 of 5 lessons')
  })
})
