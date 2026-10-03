import { reply } from './fakeApi.js'

let seq = 0
export const uid = (prefix) => `${prefix}-${++seq}`

export const category = (name = 'Programming', id = 'cat-1') => ({ _id: id, name })

// ---- list / overview shapes (as the backend returns them) ----
export const courseRow = (overrides = {}) => ({
  _id: uid('course'),
  name: 'Intro to Vue',
  status: 'draft',
  thumbnail_url: 'http://api.test/uploads/courses/thumb.png',
  category: { name: 'Programming' },
  students: [],
  total_students: 0,
  ...overrides,
})

export const studentRow = (overrides = {}) => ({
  _id: uid('student'),
  name: 'Ada Lovelace',
  photo_url: 'http://api.test/uploads/students/ada.png',
  courses: [],
  ...overrides,
})

export const overview = (overrides = {}) => ({
  totalCourses: 3,
  publishedCourses: 2,
  totalStudents: 7,
  totalVideos: 11,
  totalTexts: 5,
  courses: [courseRow({ name: 'Course A', status: 'published', total_students: 4 }), courseRow({ name: 'Course B' })],
  students: [],
  ...overrides,
})

export const learner = (overrides = {}) => ({
  _id: uid('learner'),
  name: 'Grace Hopper',
  email: 'grace@test.dev',
  photo_url: 'http://api.test/uploads/students/grace.png',
  progress: { completedLessons: 2, totalLessons: 5, percent: 40, completed: false },
  nextLesson: { _id: 'lesson-x', title: 'Closures', sectionId: 'section-x', sectionTitle: 'Going further' },
  lastActivityAt: '2026-05-20T10:30:00.000Z',
  ...overrides,
})

export const progressPayload = ({ status = 'published', totalLessons = 5, students = [] } = {}) => ({
  course: { _id: 'course-1', name: 'Intro to Vue', status, totalLessons },
  summary: {
    enrolledLearners: students.length,
    completedLearners: students.filter((s) => s.progress.completed).length,
  },
  students,
})

// ---- a small stateful backend for ONE course (sections + lessons + status) ----
// It behaves like the M3B backend (append on create, full-list reorder, 422 on publishing an
// empty course) so tests show that the UI refetches the right data after each change.
export const makeCourseBackend = ({ course = {}, sections = [] } = {}) => {
  const state = {
    course: {
      _id: 'course-1',
      name: 'Intro to Vue',
      tagline: 'Learn Vue by building',
      description: 'A complete description of the course.',
      status: 'draft',
      category: { _id: 'cat-1', name: 'Programming' },
      thumbnail_url: 'http://api.test/uploads/courses/thumb.png',
      students: [],
      ...course,
    },
    sections: structuredClone(sections),
    rejectNextReorder: false,
  }

  const findLesson = (lessonId) => {
    for (const section of state.sections) {
      const lesson = section.lessons.find((item) => item._id === lessonId)

      if (lesson) return { section, lesson }
    }

    return null
  }

  const detail = () => ({
    ...state.course,
    sections: state.sections.map((section, order) => ({
      _id: section._id,
      title: section.title,
      order,
      lessons: section.lessons.map((lesson, position) => ({
        _id: lesson._id,
        title: lesson.title,
        type: lesson.type,
        order: position,
      })),
    })),
    total_sections: state.sections.length,
    total_lessons: state.sections.reduce((sum, section) => sum + section.lessons.length, 0),
  })

  const sameIds = (given, current) =>
    given.length === current.length && given.every((id) => current.includes(id)) && new Set(given).size === given.length

  const reorder = (items, ids, label) => {
    if (state.rejectNextReorder) {
      state.rejectNextReorder = false
      // someone else changed the order meanwhile
      items.reverse()

      return reply(400, { message: `${label} must list every item of the parent exactly once`, code: 'REORDER_MISMATCH' })
    }

    if (!sameIds(ids, items.map((item) => item._id))) {
      return reply(400, { message: 'mismatch', code: 'REORDER_MISMATCH' })
    }

    items.sort((a, b) => ids.indexOf(a._id) - ids.indexOf(b._id))

    return {}
  }

  const routes = {
    'GET /api/courses/:id': () => detail(),

    'PUT /api/courses/:id/status': (call) => {
      if (call.body.status === 'published' && detail().total_lessons === 0) {
        return reply(422, { message: 'A course needs at least one lesson before it can be published', code: 'COURSE_NOT_PUBLISHABLE' })
      }

      state.course.status = call.body.status

      return { _id: state.course._id, status: state.course.status }
    },

    'POST /api/courses/:courseId/sections': (call) => {
      const section = { _id: uid('section'), title: call.body.title, lessons: [] }

      state.sections.push(section)

      return reply(201, { message: 'ok', data: { _id: section._id, title: section.title, lessons: [] } })
    },

    'PUT /api/sections/:sectionId': (call) => {
      state.sections.find((s) => s._id === call.params.sectionId).title = call.body.title

      return {}
    },

    'DELETE /api/sections/:sectionId': (call) => {
      state.sections = state.sections.filter((s) => s._id !== call.params.sectionId)

      return {}
    },

    'PATCH /api/courses/:courseId/sections/reorder': (call) => reorder(state.sections, call.body.sectionIds, 'sectionIds'),

    'POST /api/sections/:sectionId/lessons': (call) => {
      const lesson = { _id: uid('lesson'), ...call.body }

      state.sections.find((s) => s._id === call.params.sectionId).lessons.push(lesson)

      return reply(201, { message: 'ok', data: lesson })
    },

    'GET /api/lessons/:lessonId': (call) => {
      const found = findLesson(call.params.lessonId)

      return { ...found.lesson, section: found.section._id, course: state.course._id }
    },

    'PUT /api/lessons/:lessonId': (call) => {
      const found = findLesson(call.params.lessonId)

      Object.keys(found.lesson).forEach((key) => key !== '_id' && delete found.lesson[key])
      Object.assign(found.lesson, call.body)

      return found.lesson
    },

    'DELETE /api/lessons/:lessonId': (call) => {
      const found = findLesson(call.params.lessonId)

      found.section.lessons = found.section.lessons.filter((l) => l._id !== call.params.lessonId)

      return {}
    },

    'PATCH /api/sections/:sectionId/lessons/reorder': (call) =>
      reorder(state.sections.find((s) => s._id === call.params.sectionId).lessons, call.body.lessonIds, 'lessonIds'),
  }

  return { state, routes, detail }
}

export const aSection = (title, lessons = []) => ({ _id: uid('section'), title, lessons })
export const aLesson = (title, type = 'text', extra = {}) => ({
  _id: uid('lesson'),
  title,
  type,
  ...(type === 'video' ? { youtubeId: 'dQw4w9WgXcQ' } : { text: '<p>hello</p>' }),
  ...extra,
})
