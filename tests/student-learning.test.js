import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { R } from '@/constants/routes.js'
import { queryKeys } from '@/services/queryKeys.js'
import { reply } from './fakeApi.js'
import { deferred } from './helpers.js'
import { makeLearningBackend, sectionOf, standardCourse, textLesson, videoLesson } from './learningBackend.js'
import { click, waitForGone, waitForRoute, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

const COURSE = '/student/courses/course-1'
const lessonPath = (lesson) => `${COURSE}/lessons/${lesson._id}`
const bar = (wrapper, name) => wrapper.find(`[role="progressbar"][aria-label="${name}"]`)

const summaryRow = (overrides = {}) => ({
  _id: 'course-1',
  name: 'Intro to Vue',
  tagline: 'Learn Vue by building',
  category: { _id: 'cat-1', name: 'Programming' },
  thumbnail: 'thumb.png',
  thumbnail_url: 'http://api.test/uploads/courses/thumb.png',
  progress: { completedLessons: 0, totalLessons: 3, percent: 0, completed: false },
  nextLesson: { _id: 'les-a', title: 'What is Vue', sectionId: 'sec-a', sectionTitle: 'Basics' },
  ...overrides,
})

describe('student dashboard', () => {
  it('shows real course data and a Continue learning card built from the backend nextLesson', async () => {
    const { wrapper, router } = await openStudentApp('/student', {
      routes: {
        'GET /api/students-courses': [
          summaryRow({
            progress: { completedLessons: 1, totalLessons: 3, percent: 33, completed: false },
            nextLesson: { _id: 'les-b', title: 'Install it', sectionId: 'sec-a', sectionTitle: 'Basics' },
          }),
        ],
      },
    })

    await waitForText(wrapper, 'Continue learning')

    expect(wrapper.text()).toContain('Welcome, Test User')
    expect(wrapper.text()).toContain('Next lesson: Install it')
    expect(wrapper.text()).toContain('Basics')
    expect(wrapper.text()).toContain('1 of 3 lessons')

    await click(wrapper, 'Continue learning: Intro to Vue')
    await waitForRoute(router, R.STUDENT_LESSON)

    expect(router.currentRoute.value.params).toEqual({ courseId: 'course-1', lessonId: 'les-b' })
  })

  it('picks the FIRST course (backend order) that has a nextLesson, without ranking', async () => {
    const { wrapper } = await openStudentApp('/student', {
      routes: {
        'GET /api/students-courses': [
          summaryRow({ _id: 'c-done', name: 'Alpha done', progress: { completedLessons: 2, totalLessons: 2, percent: 100, completed: true }, nextLesson: null }),
          summaryRow({ _id: 'c-b', name: 'Bravo', progress: { completedLessons: 0, totalLessons: 9, percent: 0, completed: false } }),
          summaryRow({ _id: 'c-c', name: 'Charlie', progress: { completedLessons: 8, totalLessons: 9, percent: 88, completed: false } }),
        ],
      },
    })

    await waitForText(wrapper, 'Continue learning')

    const card = wrapper.find('[aria-labelledby="continue-heading"]')

    expect(card.text()).toContain('Bravo')
    expect(card.text()).not.toContain('Charlie')
    expect(wrapper.text()).toContain('3 courses · 1 completed')
  })

  it('lists every course below the Continue card', async () => {
    const { wrapper } = await openStudentApp('/student', {
      routes: { 'GET /api/students-courses': [summaryRow({ name: 'First' }), summaryRow({ _id: 'c2', name: 'Second' })] },
    })

    await waitForText(wrapper, 'My courses')
    expect(wrapper.findAll('section[aria-labelledby="my-courses-heading"] li')).toHaveLength(2)
  })

  it('tells the student truthfully when there are no courses', async () => {
    const { wrapper } = await openStudentApp('/student')

    await waitForText(wrapper, 'You are not enrolled in any course yet')
    expect(wrapper.text()).not.toContain('Continue learning')
  })

  it('shows a completed state when every course is complete', async () => {
    const done = { completedLessons: 3, totalLessons: 3, percent: 100, completed: true }
    const { wrapper } = await openStudentApp('/student', {
      routes: { 'GET /api/students-courses': [summaryRow({ progress: done, nextLesson: null })] },
    })

    await waitForText(wrapper, 'You have completed your course')
    expect(wrapper.text()).toContain('Review my courses')
    expect(wrapper.text()).toContain('1 course · 1 completed')
  })

  it('does not claim completion when a course without lessons has nothing to continue', async () => {
    const empty = { completedLessons: 0, totalLessons: 0, percent: 0, completed: false }
    const { wrapper } = await openStudentApp('/student', {
      routes: { 'GET /api/students-courses': [summaryRow({ progress: empty, nextLesson: null })] },
    })

    await waitForText(wrapper, 'There is no lesson to continue right now')
    expect(wrapper.text()).not.toContain('You have completed')
  })

  it('shows a loading state, then an error with retry that recovers', async () => {
    const gate = deferred()
    let fail = true
    const { wrapper } = await openStudentApp('/student', {
      routes: {
        'GET /api/students-courses': async () => {
          await gate.promise

          return fail ? reply(500, { message: 'boom' }) : [summaryRow()]
        },
      },
    })

    expect(wrapper.text()).toContain('Loading your courses…')
    gate.resolve()
    await waitForText(wrapper, 'boom')

    fail = false
    await click(wrapper, 'Try again')
    await waitForText(wrapper, 'Continue learning')
  })
})

describe('my courses', () => {
  const rows = () => [
    summaryRow({ _id: 'c1', name: 'Not started course', progress: { completedLessons: 0, totalLessons: 4, percent: 0, completed: false }, nextLesson: { _id: 'l1', title: 'First', sectionId: 's', sectionTitle: 'S' } }),
    summaryRow({ _id: 'c2', name: 'Half course', progress: { completedLessons: 2, totalLessons: 4, percent: 50, completed: false }, nextLesson: { _id: 'l3', title: 'Third', sectionId: 's', sectionTitle: 'S' } }),
    summaryRow({ _id: 'c3', name: 'Done course', progress: { completedLessons: 4, totalLessons: 4, percent: 100, completed: true }, nextLesson: null }),
  ]

  it('offers Start, Continue and Review according to the backend progress', async () => {
    const { wrapper } = await openStudentApp('/student/courses', { routes: { 'GET /api/students-courses': rows() } })

    await waitForText(wrapper, 'Not started course')

    const text = wrapper.findAll('li').map((li) => li.text())

    expect(text[0]).toContain('Not started')
    expect(text[0]).toContain('Start course')
    expect(text[1]).toContain('In progress')
    expect(text[1]).toContain('Continue learning')
    expect(text[2]).toContain('Completed')
    expect(text[2]).toContain('Review course')
    expect(text[2]).not.toContain('Next:')
  })

  it('Start and Continue open the backend nextLesson, Review opens the course', async () => {
    const { wrapper, router } = await openStudentApp('/student/courses', { routes: { 'GET /api/students-courses': rows() } })

    await waitForText(wrapper, 'Half course')
    await click(wrapper, 'Continue learning: Half course')
    await waitForRoute(router, R.STUDENT_LESSON)
    expect(router.currentRoute.value.params.lessonId).toBe('l3')

    await router.push('/student/courses')
    await flushPromises()
    await click(wrapper, 'Review course: Done course')
    await waitForRoute(router, R.STUDENT_COURSE)
    expect(router.currentRoute.value.params.courseId).toBe('c3')
  })

  it('shows the backend percent and counts unchanged and exposes a labelled progress bar', async () => {
    const { wrapper } = await openStudentApp('/student/courses', {
      // 1 of 4 would be 25%: the backend says 80 and the page must not "fix" it
      routes: { 'GET /api/students-courses': [summaryRow({ progress: { completedLessons: 1, totalLessons: 4, percent: 80, completed: false } })] },
    })

    await waitForText(wrapper, 'Intro to Vue')

    const progressbar = bar(wrapper, 'Progress in Intro to Vue')

    expect(progressbar.attributes('aria-valuenow')).toBe('80')
    expect(progressbar.attributes('aria-valuetext')).toContain('1 of 4 lessons')
    expect(wrapper.text()).toContain('80%')
    expect(wrapper.text()).not.toContain('25%')
  })

  it('shows a contradictory completed flag unchanged', async () => {
    const { wrapper } = await openStudentApp('/student/courses', {
      routes: { 'GET /api/students-courses': [summaryRow({ progress: { completedLessons: 1, totalLessons: 4, percent: 25, completed: true }, nextLesson: null })] },
    })

    await waitForText(wrapper, 'Intro to Vue')
    expect(wrapper.text()).toContain('Completed')
    expect(wrapper.text()).toContain('Review course')
  })

  it('has loading, empty and error states and never mentions drafts', async () => {
    const empty = await openStudentApp('/student/courses')

    await waitForText(empty.wrapper, 'You are not enrolled in any course yet')
    expect(empty.wrapper.text().toLowerCase()).not.toContain('draft')

    const failing = await openStudentApp('/student/courses', { routes: { 'GET /api/students-courses': reply(500, { message: 'Server broke' }) } })

    await waitForText(failing.wrapper, 'Server broke')
  })
})

describe('course learning page', () => {
  it('renders sections and lessons in the returned order with section and course progress', async () => {
    const { backend, sections } = standardCourse({ completed: [] })
    const [first] = sections[0].lessons

    backend.state.completed.set(first._id, '2026-05-20T10:00:00.000Z')

    const { wrapper } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course outline')

    const sectionBlocks = wrapper.findAll('nav[aria-label="Course outline"] > ol > li')

    expect(sectionBlocks).toHaveLength(2)
    expect(sectionBlocks[0].text()).toContain('Basics')
    expect(sectionBlocks[0].text()).toContain('1 of 2 completed')
    expect(sectionBlocks[1].text()).toContain('Going further')
    expect(sectionBlocks[1].text()).toContain('0 of 1 completed')

    const lessonTitles = wrapper.findAll('nav[aria-label="Course outline"] ol ol li a').map((a) => a.text())

    expect(lessonTitles[0]).toContain('What is Vue')
    expect(lessonTitles[0]).toContain('Completed')
    expect(lessonTitles[1]).toContain('Install it')
    expect(lessonTitles[1]).toContain('Not completed')
    expect(lessonTitles[1]).toContain('Up next')
    expect(lessonTitles[1]).toContain('Video')
    expect(lessonTitles[2]).toContain('Reactivity')

    expect(bar(wrapper, 'Progress in Intro to Vue').attributes('aria-valuenow')).toBe('33')
    expect(wrapper.text()).toContain('Next lesson: Install it')
    expect(wrapper.text()).toContain('Last activity')
  })

  it('does not reorder what the backend returned', async () => {
    const sections = [sectionOf('Zeta', [textLesson('Z1')]), sectionOf('Alpha', [textLesson('A1'), textLesson('A0')])]
    const backend = makeLearningBackend({ sections })
    const { wrapper } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course outline')
    expect(wrapper.findAll('nav[aria-label="Course outline"] h3').map((h) => h.text().replace(/Section \d+:\s*/, ''))).toEqual(['Zeta', 'Alpha'])
    expect(wrapper.findAll('nav[aria-label="Course outline"] ol ol li a > span.flex-1').map((el) => el.text())).toEqual(['Z1', 'A1', 'A0'])
  })

  it('Continue learning opens the backend nextLesson; lessons open from the outline', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper, router } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course outline')
    await click(wrapper, 'Start course')
    await waitForRoute(router, R.STUDENT_LESSON)
    expect(router.currentRoute.value.params.lessonId).toBe(sections[0].lessons[0]._id)

    await router.push(COURSE)
    await flushPromises()
    await wrapper.findAll('nav[aria-label="Course outline"] a')[2].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params.lessonId).toBe(sections[1].lessons[0]._id)
  })

  it('shows the completed state with every lesson still reachable', async () => {
    const { backend, sections } = standardCourse()

    sections.flatMap((s) => s.lessons).forEach((l) => backend.state.completed.set(l._id, '2026-05-20T10:00:00.000Z'))

    const { wrapper } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course completed')
    expect(wrapper.text()).toContain('All 3 lessons are completed')
    expect(wrapper.text()).not.toContain('Up next')
    expect(wrapper.findAll('nav[aria-label="Course outline"] a')).toHaveLength(3)
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
  })

  it('shows the backend progress as it is, even when it contradicts the counts', async () => {
    const { backend } = standardCourse()
    const detail = backend.detail()

    detail.progress = { completedLessons: 1, totalLessons: 3, percent: 90, completed: false }

    const { wrapper } = await openStudentApp(COURSE, { routes: { ...backend.routes, 'GET /api/students-courses/:courseId': detail } })

    await waitForText(wrapper, 'Course outline')
    expect(bar(wrapper, 'Progress in Intro to Vue').attributes('aria-valuenow')).toBe('90')
    expect(wrapper.text()).toContain('90%')

    detail.progress = { completedLessons: 1, totalLessons: 3, percent: 33, completed: true }

    const completed = await openStudentApp(COURSE, { routes: { ...backend.routes, 'GET /api/students-courses/:courseId': detail } })

    await waitForText(completed.wrapper, 'Course completed')
  })

  it('has a loading state, an empty outline message, and an error with retry', async () => {
    const gate = deferred()
    const { backend } = standardCourse()
    const { wrapper } = await openStudentApp(COURSE, {
      routes: { 'GET /api/students-courses/:courseId': async () => { await gate.promise; return { ...backend.detail(), sections: [], nextLesson: null, progress: { completedLessons: 0, totalLessons: 0, percent: 0, completed: false } } } },
    })

    expect(wrapper.text()).toContain('Loading the course…')
    gate.resolve()
    await waitForText(wrapper, 'This course has no lessons yet')

    const failing = await openStudentApp(COURSE, { routes: { 'GET /api/students-courses/:courseId': reply(500, { message: 'Course exploded' }) } })

    await waitForText(failing.wrapper, 'Course exploded')
  })
})

describe('lesson page: content', () => {
  it('renders the backend-sanitized HTML of a text lesson', async () => {
    const html = '<h2>Heading</h2><p>Hello <strong>bold</strong> <a href="https://example.com" rel="noopener noreferrer">link</a></p><ul><li>one</li></ul><figure class="table"><table><tr><td>cell</td></tr></table></figure>'
    const sections = [sectionOf('Basics', [textLesson('Rich lesson', html)])]
    const backend = makeLearningBackend({ sections })
    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, 'Rich lesson')

    const text = wrapper.find('[data-testid="lesson-text"]')

    expect(text.find('h2').text()).toBe('Heading')
    expect(text.find('strong').text()).toBe('bold')
    expect(text.find('a').attributes('href')).toBe('https://example.com')
    expect(text.find('a').attributes('rel')).toBe('noopener noreferrer')
    expect(text.find('li').text()).toBe('one')
    expect(text.find('figure.table table td').text()).toBe('cell')
    expect(wrapper.text()).toContain('Basics')
    expect(wrapper.text()).toContain('Text lesson')
  })

  it('shows lesson and course titles as text, never as HTML', async () => {
    const sections = [sectionOf('<b>Section</b>', [textLesson('<img src=x onerror=alert(1)>', '<p>ok</p>')])]
    const backend = makeLearningBackend({ sections, course: { name: '<i>Course</i>' } })
    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, '<img src=x onerror=alert(1)>')

    expect(wrapper.find('h1 img').exists()).toBe(false)
    expect(wrapper.find('h1').text()).toBe('<img src=x onerror=alert(1)>')
    expect(wrapper.text()).toContain('<b>Section</b>')
    expect(wrapper.text()).toContain('Back to <i>Course</i>')
    expect(wrapper.find('i').exists()).toBe(false)
  })

  it('embeds a video lesson from the backend youtubeId only, in a responsive frame with a title', async () => {
    const sections = [sectionOf('Basics', [videoLesson('Watch me', 'abc_DEF-123')])]
    const backend = makeLearningBackend({ sections })
    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, 'Watch me')

    const frame = wrapper.find('[data-testid="video-frame"]')
    const iframe = frame.find('iframe')

    expect(iframe.attributes('src')).toBe('https://www.youtube.com/embed/abc_DEF-123')
    expect(iframe.attributes('title')).toBe('Video: Watch me')
    expect(iframe.attributes('allow')).toContain('fullscreen')
    expect(iframe.attributes()).toHaveProperty('allowfullscreen')
    expect(frame.classes()).toEqual(expect.arrayContaining(['aspect-video', 'w-full']))
    expect(wrapper.text()).toContain('Video lesson')
  })

  it('refuses to embed anything that is not a plain youtube id', async () => {
    const sections = [sectionOf('Basics', [videoLesson('Bad video', 'x"><script>/evil')])]
    const backend = makeLearningBackend({ sections })
    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, 'This video cannot be shown right now')
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('has loading and error states', async () => {
    const gate = deferred()
    const { wrapper } = await openStudentApp(`${COURSE}/lessons/l1`, {
      routes: { 'GET /api/students-courses/:courseId/lessons/:lessonId': async () => { await gate.promise; return reply(500, { message: 'Lesson exploded' }) } },
    })

    expect(wrapper.text()).toContain('Loading the lesson…')
    gate.resolve()
    await waitForText(wrapper, 'Lesson exploded')
  })
})

describe('lesson page: previous / next navigation', () => {
  it('uses the backend ids, crosses section boundaries, and disables the null ends', async () => {
    const { backend, sections } = standardCourse()
    const [intro, install] = sections[0].lessons
    const [reactivity] = sections[1].lessons
    const { wrapper, router } = await openStudentApp(lessonPath(intro), { routes: backend.routes })

    await waitForText(wrapper, 'What is Vue')

    const nav = () => wrapper.find('nav[aria-label="Lesson navigation"]')
    const previous = () => nav().findAll('button, a').find((el) => el.text() === 'Previous lesson')

    expect(previous().element.tagName).toBe('BUTTON')
    expect(previous().attributes('disabled')).toBeDefined()

    await click(wrapper, 'Next lesson')
    await waitForText(wrapper, 'Install it')
    expect(router.currentRoute.value.params.lessonId).toBe(install._id)

    await click(wrapper, 'Next lesson') // Basics -> Going further
    await waitForText(wrapper, 'Reactivity')
    expect(router.currentRoute.value.params.lessonId).toBe(reactivity._id)
    expect(wrapper.text()).toContain('Going further')

    const next = nav().findAll('button, a').find((el) => el.text() === 'Next lesson')

    expect(next.element.tagName).toBe('BUTTON')
    expect(next.attributes('disabled')).toBeDefined()

    await click(wrapper, 'Previous lesson') // back across the boundary
    await waitForText(wrapper, 'Install it')
  })

  it('goes back to the course outline', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper, router } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, 'Back to Intro to Vue')
    await click(wrapper, '← Back to Intro to Vue')
    await waitForRoute(router, R.STUDENT_COURSE)
  })

  it('moves focus to the new lesson title after navigating', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, 'What is Vue')
    await click(wrapper, 'Next lesson')
    await waitForText(wrapper, 'Install it')
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.find('h1').element)
  })
})

describe('lesson completion', () => {
  it('does not change anything before the backend answers, then renders the backend result', async () => {
    const { backend, sections } = standardCourse()
    const gate = deferred()
    const original = backend.routes['PUT /api/lessons/:lessonId/completion']
    const { wrapper, fake } = await openStudentApp(lessonPath(sections[0].lessons[0]), {
      routes: { ...backend.routes, 'PUT /api/lessons/:lessonId/completion': async (call) => { await gate.promise; return original(call) } },
    })

    await waitForText(wrapper, 'What is Vue')
    await click(wrapper, 'Mark as complete')

    // request in flight: still not completed, controls locked
    expect(fake.callsTo('PUT /api/lessons/:id/completion')).toHaveLength(1)
    expect(wrapper.find('h1').element.parentElement.textContent).toContain('Not completed')
    expect(wrapper.findAll('button').find((b) => b.text().includes('Mark as complete')).attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button').find((b) => b.text().includes('Complete and continue')).attributes('disabled')).toBeDefined()

    gate.resolve()
    await waitForText(wrapper, 'Mark as incomplete')

    expect(wrapper.find('h1').element.parentElement.textContent).toContain('Completed')
    expect(bar(wrapper, 'Progress in Intro to Vue').attributes('aria-valuenow')).toBe('33')
  })

  it('shows the progress from the backend answer immediately, before the course refetch has finished', async () => {
    const { backend, sections } = standardCourse()
    const gate = deferred()
    const courseRoute = backend.routes['GET /api/students-courses/:courseId']
    let calls = 0
    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), {
      routes: {
        ...backend.routes,
        // the first request (page load) answers at once; the refetch after completion is held back
        'GET /api/students-courses/:courseId': async (call) => {
          calls += 1

          if (calls > 1) await gate.promise

          return courseRoute(call)
        },
      },
    })

    await waitForText(wrapper, 'What is Vue')
    await waitForText(wrapper, '0 of 3 lessons')
    await wrapper.findAll('button').find((b) => b.text() === 'Mark as complete').trigger('click')
    await waitForText(wrapper, '1 of 3 lessons · 33%')
    expect(bar(wrapper, 'Progress in Intro to Vue').attributes('aria-valuenow')).toBe('33')

    gate.resolve()
    await flushPromises()
  })

  it('protects against double clicks: one request only', async () => {
    const { backend, sections } = standardCourse()
    const gate = deferred()
    const original = backend.routes['PUT /api/lessons/:lessonId/completion']
    const { wrapper, fake } = await openStudentApp(lessonPath(sections[0].lessons[0]), {
      routes: { ...backend.routes, 'PUT /api/lessons/:lessonId/completion': async (call) => { await gate.promise; return original(call) } },
    })

    await waitForText(wrapper, 'What is Vue')

    const target = wrapper.findAll('button').find((b) => b.text() === 'Mark as complete')

    await target.trigger('click')
    await target.trigger('click')
    await wrapper.findAll('button').find((b) => b.text().includes('Complete and continue')).trigger('click')
    gate.resolve()
    await waitForText(wrapper, 'Mark as incomplete')

    expect(fake.callsTo('PUT /api/lessons/:id/completion')).toHaveLength(1)
  })

  it('leaves the lesson unchanged and explains when the request fails', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), {
      routes: { ...backend.routes, 'PUT /api/lessons/:lessonId/completion': reply(500, { message: 'Could not save' }) },
    })

    await waitForText(wrapper, 'What is Vue')
    await click(wrapper, 'Mark as complete')
    await waitForText(wrapper, 'Could not save')

    expect(wrapper.text()).toContain('Not completed')
    expect(wrapper.text()).not.toContain('Mark as incomplete')
    expect(wrapper.findAll('button').find((b) => b.text() === 'Mark as complete').attributes('disabled')).toBeUndefined()
  })

  it('refreshes the course and the course list, and nothing else', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper, fake, queryClient, router } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, 'What is Vue')
    await queryClient.prefetchQuery({ queryKey: queryKeys.studentCourses, queryFn: () => backend.routes['GET /api/students-courses']() })

    const before = fake.calls.length

    await click(wrapper, 'Mark as complete')
    await waitForText(wrapper, 'Mark as incomplete')
    await flushPromises()

    const after = fake.calls.slice(before).map((call) => `${call.method} ${call.url}`)

    expect(after).toContain('PUT /api/lessons/' + sections[0].lessons[0]._id + '/completion')
    expect(after).toContain('GET /api/students-courses/course-1')
    // the list is not on screen: it is marked stale and refetched when it is next opened
    expect(queryClient.getQueryState(queryKeys.studentCourses).isInvalidated).toBe(true)
    expect(after.filter((entry) => entry.includes('/lessons/') && entry.startsWith('GET'))).toHaveLength(0)
    expect(after.some((entry) => /\/api\/(courses|students|overviews|sections)\b/.test(entry.split(' ')[1]) && !entry.includes('students-courses'))).toBe(false)
    // student data only; the optional AI configuration query (key 'ai') is not learning data
    expect(queryClient.getQueryCache().getAll().every((query) => ['student', 'ai'].includes(query.queryKey[0]))).toBe(true)

    await router.push('/student/courses')
    await waitForText(wrapper, '1 of 3 lessons')
  })

  it('shows a completed course after the last lesson is completed', async () => {
    const { backend, sections } = standardCourse()
    const all = sections.flatMap((s) => s.lessons)

    all.slice(0, 2).forEach((l) => backend.state.completed.set(l._id, '2026-05-20T10:00:00.000Z'))

    const { wrapper } = await openStudentApp(lessonPath(all[2]), { routes: backend.routes })

    await waitForText(wrapper, 'Reactivity')
    await click(wrapper, 'Mark as complete')
    await waitForText(wrapper, 'Course completed')
    expect(wrapper.text()).toContain('All 3 lessons are completed')
  })
})

describe('complete and continue', () => {
  it('navigates only after the backend confirmed, to the backend nextLesson', async () => {
    const { backend, sections } = standardCourse()
    const gate = deferred()
    const original = backend.routes['PUT /api/lessons/:lessonId/completion']
    const { wrapper, router } = await openStudentApp(lessonPath(sections[0].lessons[0]), {
      routes: { ...backend.routes, 'PUT /api/lessons/:lessonId/completion': async (call) => { await gate.promise; return original(call) } },
    })

    await waitForText(wrapper, 'What is Vue')
    await click(wrapper, 'Complete and continue')
    expect(router.currentRoute.value.params.lessonId).toBe(sections[0].lessons[0]._id)

    gate.resolve()
    await waitForText(wrapper, 'Install it')
    expect(router.currentRoute.value.params.lessonId).toBe(sections[0].lessons[1]._id)
    expect(backend.state.completed.has(sections[0].lessons[0]._id)).toBe(true)
  })

  it('follows the backend nextLesson even when it is an earlier incomplete lesson', async () => {
    const { backend, sections } = standardCourse()
    const [first, second] = sections[0].lessons
    const [third] = sections[1].lessons

    backend.state.completed.set(second._id, '2026-05-20T10:00:00.000Z')

    const { wrapper, router } = await openStudentApp(lessonPath(third), { routes: backend.routes })

    await waitForText(wrapper, 'Reactivity')
    await click(wrapper, 'Complete and continue')
    await waitForText(wrapper, 'What is Vue')
    expect(router.currentRoute.value.params.lessonId).toBe(first._id)
  })

  it('goes to the completed course when nextLesson is null', async () => {
    const { backend, sections } = standardCourse()
    const all = sections.flatMap((s) => s.lessons)

    all.slice(0, 2).forEach((l) => backend.state.completed.set(l._id, '2026-05-20T10:00:00.000Z'))

    const { wrapper, router } = await openStudentApp(lessonPath(all[2]), { routes: backend.routes })

    await waitForText(wrapper, 'Reactivity')
    await click(wrapper, 'Complete and continue')
    await waitForRoute(router, R.STUDENT_COURSE)
    await waitForText(wrapper, 'Course completed')
  })

  it('does not navigate when the request fails', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper, router } = await openStudentApp(lessonPath(sections[0].lessons[0]), {
      routes: { ...backend.routes, 'PUT /api/lessons/:lessonId/completion': reply(500, { message: 'Nope' }) },
    })

    await waitForText(wrapper, 'What is Vue')
    await click(wrapper, 'Complete and continue')
    await waitForText(wrapper, 'Nope')
    expect(router.currentRoute.value.params.lessonId).toBe(sections[0].lessons[0]._id)
  })

  it('is replaced by Next lesson on an already completed lesson', async () => {
    const { backend, sections } = standardCourse()

    backend.state.completed.set(sections[0].lessons[0]._id, '2026-05-20T10:00:00.000Z')

    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, 'Mark as incomplete')
    expect(wrapper.text()).not.toContain('Complete and continue')
    expect(wrapper.text()).toContain('Next lesson')
  })
})

describe('undo completion', () => {
  it('marks the lesson incomplete, updates progress and lets the course reopen with a backend nextLesson', async () => {
    const { backend, sections } = standardCourse()
    const all = sections.flatMap((s) => s.lessons)

    all.forEach((l) => backend.state.completed.set(l._id, '2026-05-20T10:00:00.000Z'))

    const { wrapper, router } = await openStudentApp(lessonPath(all[1]), { routes: backend.routes })

    await waitForText(wrapper, 'Mark as incomplete')
    expect(bar(wrapper, 'Progress in Intro to Vue').attributes('aria-valuenow')).toBe('100')
    expect(wrapper.text()).toContain('Course completed')

    await click(wrapper, 'Mark as incomplete')
    await waitForText(wrapper, 'Mark as complete')

    expect(bar(wrapper, 'Progress in Intro to Vue').attributes('aria-valuenow')).toBe('66')
    expect(wrapper.text()).not.toContain('All 3 lessons are completed')

    await router.push(COURSE)
    await waitForText(wrapper, 'Next lesson: Install it')
    expect(wrapper.text()).toContain('2 of 3 lessons')
    expect(wrapper.text()).not.toContain('Course completed')
  })

  it('leaves the lesson completed and explains when undo fails', async () => {
    const { backend, sections } = standardCourse()

    backend.state.completed.set(sections[0].lessons[0]._id, '2026-05-20T10:00:00.000Z')

    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), {
      routes: { ...backend.routes, 'DELETE /api/lessons/:lessonId/completion': reply(500, { message: 'Undo failed' }) },
    })

    await waitForText(wrapper, 'Mark as incomplete')
    await click(wrapper, 'Mark as incomplete')
    await waitForText(wrapper, 'Undo failed')
    expect(wrapper.text()).toContain('Mark as incomplete')
  })
})

describe('content changes by the instructor', () => {
  it('a completed course reopens on the next fetch when a lesson is added, with the new nextLesson', async () => {
    const { backend, sections } = standardCourse()
    const all = sections.flatMap((s) => s.lessons)

    all.forEach((l) => backend.state.completed.set(l._id, '2026-05-20T10:00:00.000Z'))

    const { wrapper, router } = await openStudentApp(COURSE, { routes: backend.routes })

    await waitForText(wrapper, 'Course completed')

    const added = textLesson('Brand new lesson')

    backend.state.sections[1].lessons.push(added)

    await router.push('/student/courses')
    await waitForText(wrapper, 'Brand new lesson')
    expect(wrapper.text()).toContain('Continue learning')
    expect(wrapper.text()).toContain('In progress')

    await router.push(COURSE)
    await waitForText(wrapper, 'Next lesson: Brand new lesson')
    expect(wrapper.text()).not.toContain('Course completed')
  })

  it('shows the lesson that was removed as unavailable, without signing the student out', async () => {
    const { backend, sections } = standardCourse()
    const { wrapper, auth } = await openStudentApp(lessonPath(sections[0].lessons[0]), {
      routes: { ...backend.routes, 'GET /api/students-courses/:courseId/lessons/:lessonId': reply(404, { message: 'Lesson not found' }) },
    })

    await waitForText(wrapper, 'This lesson is no longer available')
    expect(auth.isAuthenticated).toBe(true)
    expect(wrapper.text()).toContain('Back to My Courses')
  })
})

describe('video and text mix in one course', () => {
  it('uses the right renderer for each type while navigating', async () => {
    const sections = [sectionOf('Mixed', [textLesson('T1'), videoLesson('V1'), textLesson('T2')])]
    const backend = makeLearningBackend({ sections })
    const { wrapper } = await openStudentApp(lessonPath(sections[0].lessons[0]), { routes: backend.routes })

    await waitForText(wrapper, 'T1')
    expect(wrapper.find('iframe').exists()).toBe(false)
    await click(wrapper, 'Next lesson')
    await waitForText(wrapper, 'Video lesson')
    expect(wrapper.find('iframe').exists()).toBe(true)
    await click(wrapper, 'Next lesson')
    await waitForGone(wrapper, 'Video lesson')
    expect(wrapper.find('iframe').exists()).toBe(false)
  })
})
