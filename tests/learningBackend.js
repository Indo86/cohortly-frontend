import { reply } from './fakeApi.js'

// A small stateful stand-in for the M3B Student learning API, written to behave like the real
// controllers (backend/src/controllers/learningController.js): progress is derived from the
// completion set with percent rounded DOWN, nextLesson is the first incomplete lesson in
// course order, previous/next ids follow course order across sections, and a course that is
// unpublished or not enrolled answers 404. The frontend must show what this returns; it is
// the only place in the tests where "the backend" computes anything.
let seq = 0
const id = (prefix) => `${prefix}-${++seq}`

export const sectionOf = (title, lessons) => ({ _id: id('sec'), title, lessons })
export const textLesson = (title, text = `<p>Body of ${title}</p>`) => ({ _id: id('les'), title, type: 'text', text, youtubeId: null })
export const videoLesson = (title, youtubeId = 'dQw4w9WgXcQ') => ({ _id: id('les'), title, type: 'video', text: '', youtubeId })

export const makeLearningBackend = ({ sections, course = {}, completed = [] } = {}) => {
  const state = {
    course: {
      _id: 'course-1',
      name: 'Intro to Vue',
      tagline: 'Learn Vue by building',
      description: 'A complete description of the course.',
      category: { _id: 'cat-1', name: 'Programming' },
      thumbnail: 'thumb.png',
      thumbnail_url: 'http://api.test/uploads/courses/thumb.png',
      ...course,
    },
    sections: structuredClone(sections),
    completed: new Map(completed.map((lessonId) => [lessonId, '2026-05-20T10:00:00.000Z'])),
    available: true, // false: unpublished or not enrolled -> 404
  }

  const ordered = () => state.sections.flatMap((section) => section.lessons.map((lesson) => ({ ...lesson, section })))
  const find = (lessonId) => ordered().find((lesson) => lesson._id === lessonId)

  const progress = () => {
    const all = ordered()
    const done = all.filter((lesson) => state.completed.has(lesson._id)).length

    return {
      completedLessons: done,
      totalLessons: all.length,
      percent: all.length === 0 ? 0 : Math.floor((done * 100) / all.length),
      completed: all.length > 0 && done === all.length,
    }
  }

  const nextLesson = () => {
    const next = ordered().find((lesson) => !state.completed.has(lesson._id))

    return next ? { _id: next._id, title: next.title, sectionId: next.section._id, sectionTitle: next.section.title } : null
  }

  const summary = () => ({
    _id: state.course._id,
    name: state.course.name,
    tagline: state.course.tagline,
    category: state.course.category,
    thumbnail: state.course.thumbnail,
    thumbnail_url: state.course.thumbnail_url,
    progress: progress(),
    nextLesson: nextLesson(),
  })

  const detail = () => ({
    ...state.course,
    sections: state.sections
      .filter((section) => section.lessons.length > 0)
      .map((section, order) => {
        const lessons = section.lessons.map((lesson, position) => ({
          _id: lesson._id,
          title: lesson.title,
          type: lesson.type,
          order: position,
          completed: state.completed.has(lesson._id),
        }))

        return {
          _id: section._id,
          title: section.title,
          order,
          lessons,
          completedLessons: lessons.filter((lesson) => lesson.completed).length,
          totalLessons: lessons.length,
        }
      }),
    progress: progress(),
    nextLesson: nextLesson(),
    lastActivityAt: [...state.completed.values()].sort().at(-1) ?? null,
  })

  const lessonView = (lessonId) => {
    const all = ordered()
    const position = all.findIndex((lesson) => lesson._id === lessonId)
    const lesson = all[position]

    return {
      _id: lesson._id,
      title: lesson.title,
      type: lesson.type,
      order: 0,
      text: lesson.text,
      youtubeId: lesson.youtubeId,
      sectionId: lesson.section._id,
      sectionTitle: lesson.section.title,
      completed: state.completed.has(lesson._id),
      completedAt: state.completed.get(lesson._id) ?? null,
      previousLessonId: all[position - 1]?._id ?? null,
      nextLessonId: all[position + 1]?._id ?? null,
    }
  }

  const gone = () => reply(404, { message: 'Course not found' })

  const completion = (lessonId) => ({
    lessonId,
    completed: state.completed.has(lessonId),
    completedAt: state.completed.get(lessonId) ?? null,
    progress: progress(),
    nextLesson: nextLesson(),
  })

  const routes = {
    'GET /api/students-courses': () => (state.available ? [summary()] : []),
    'GET /api/students-courses/:courseId': () => (state.available ? detail() : gone()),
    'GET /api/students-courses/:courseId/lessons/:lessonId': (call) => {
      if (!state.available) return gone()

      return find(call.params.lessonId) ? lessonView(call.params.lessonId) : reply(404, { message: 'Lesson not found' })
    },
    'PUT /api/lessons/:lessonId/completion': (call) => {
      if (!state.available || !find(call.params.lessonId)) return gone()

      if (!state.completed.has(call.params.lessonId)) state.completed.set(call.params.lessonId, new Date().toISOString())

      return completion(call.params.lessonId)
    },
    'DELETE /api/lessons/:lessonId/completion': (call) => {
      if (!state.available || !find(call.params.lessonId)) return gone()

      state.completed.delete(call.params.lessonId)

      return completion(call.params.lessonId)
    },
  }

  return { state, routes, summary, detail }
}

// The standard course used by most tests: two sections, three lessons (text, video, text).
export const standardCourse = (options = {}) => {
  const sections = [
    sectionOf('Basics', [textLesson('What is Vue'), videoLesson('Install it')]),
    sectionOf('Going further', [textLesson('Reactivity')]),
  ]

  return { sections, backend: makeLearningBackend({ sections, ...options }) }
}
