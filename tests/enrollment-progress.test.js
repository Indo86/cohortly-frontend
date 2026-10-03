import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { learner, makeCourseBackend, progressPayload, studentRow } from './data.js'
import { reply } from './fakeApi.js'
import { button, click, dialog, openInstructorApp, waitForGone, waitForText } from './instructorApp.js'

// a tiny stateful enrollment backend
const enrollmentBackend = ({ enrolled = [], all = [] } = {}) => {
  const state = { enrolled: [...enrolled], all }

  return {
    state,
    routes: {
      ...makeCourseBackend().routes,
      'GET /api/students': () => state.all,
      'GET /api/courses/students/:courseId': () => ({
        _id: 'course-1',
        name: 'Intro to Vue',
        students: state.all
          .filter((s) => state.enrolled.includes(s._id))
          .map((s) => ({ _id: s._id, name: s.name, email: `${s.name.split(' ')[0].toLowerCase()}@test.dev`, photo_url: s.photo_url })),
      }),
      'POST /api/courses/students/:courseId': (call) => {
        if (!state.enrolled.includes(call.body.studentId)) state.enrolled.push(call.body.studentId)

        return {}
      },
      'PUT /api/courses/students/:courseId': (call) => {
        state.enrolled = state.enrolled.filter((id) => id !== call.body.studentId)

        return {}
      },
    },
  }
}

const ada = studentRow({ _id: 's1', name: 'Ada Lovelace' })
const grace = studentRow({ _id: 's2', name: 'Grace Hopper' })

describe('course learners (enrollment)', () => {
  it('shows who is enrolled and offers only students who are not', async () => {
    const backend = enrollmentBackend({ enrolled: ['s1'], all: [ada, grace] })
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/learners', { routes: backend.routes })

    await waitForText(wrapper, 'Enrolled learners (1)')

    expect(wrapper.find('ul').text()).toContain('Ada Lovelace')
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['Choose a student…', 'Grace Hopper']) // no duplicate offered
  })

  it('enrolls the chosen student and updates both lists', async () => {
    const backend = enrollmentBackend({ enrolled: [], all: [ada, grace] })
    const { wrapper, fake } = await openInstructorApp('/instructor/courses/course-1/learners', { routes: backend.routes })

    await waitForText(wrapper, 'Enrolled learners (0)')

    await wrapper.find('select').setValue('s2')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Enrolled learners (1)')

    expect(fake.callsTo('POST /api/courses/students/:courseId')[0].body).toEqual({ studentId: 's2' })
    expect(fake.callsTo('POST /api/courses/students/:courseId')[0].url).toBe('/api/courses/students/course-1')
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['Choose a student…', 'Ada Lovelace'])
  })

  it('requires choosing a student before enrolling', async () => {
    const backend = enrollmentBackend({ all: [ada] })
    const { wrapper, fake } = await openInstructorApp('/instructor/courses/course-1/learners', { routes: backend.routes })

    await waitForText(wrapper, 'Enrolled learners (0)')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Choose a student to enroll.')
    expect(fake.callsTo('POST /api/courses/students/:courseId')).toHaveLength(0)
  })

  it('shows an enroll failure from the backend', async () => {
    const backend = enrollmentBackend({ all: [ada] })
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/learners', {
      routes: { ...backend.routes, 'POST /api/courses/students/:courseId': reply(404, { message: 'Student not found' }) },
    })

    await waitForText(wrapper, 'Enrolled learners (0)')
    await wrapper.find('select').setValue('s1')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Student not found')
  })

  it('explains the first step when the instructor has no students at all', async () => {
    const backend = enrollmentBackend()
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/learners', { routes: backend.routes })

    await waitForText(wrapper, 'You have no students yet.')

    expect(wrapper.find('main a[href="/instructor/students/new"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No learners enrolled yet')
  })

  it('says so when every student is already enrolled', async () => {
    const backend = enrollmentBackend({ enrolled: ['s1'], all: [ada] })
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/learners', { routes: backend.routes })

    await waitForText(wrapper, 'All of your students are already enrolled in this course.')
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('warns that unenrolling deletes the student’s progress, and only acts after confirmation', async () => {
    const backend = enrollmentBackend({ enrolled: ['s1', 's2'], all: [ada, grace] })
    const { wrapper, fake } = await openInstructorApp('/instructor/courses/course-1/learners', { routes: backend.routes })

    await waitForText(wrapper, 'Enrolled learners (2)')
    await click(wrapper, 'Remove Ada Lovelace from this course')

    const text = dialog(wrapper).text()

    expect(text).toContain('Ada Lovelace’s progress in this course will be deleted.')
    expect(text).toContain('they start from zero')
    expect(fake.callsTo('PUT /api/courses/students/:courseId')).toHaveLength(0)

    await click(dialog(wrapper), 'Cancel')
    expect(fake.callsTo('PUT /api/courses/students/:courseId')).toHaveLength(0)

    await click(wrapper, 'Remove Ada Lovelace from this course')
    await click(dialog(wrapper), 'Remove from course')
    await waitForText(wrapper, 'Enrolled learners (1)')

    expect(fake.callsTo('PUT /api/courses/students/:courseId')[0].body).toEqual({ studentId: 's1' })
    expect(wrapper.find('ul').text()).not.toContain('Ada Lovelace')
  })

  it('tells the instructor that a draft course is invisible to students', async () => {
    const backend = enrollmentBackend({ all: [ada] })
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/learners', { routes: backend.routes })

    await waitForText(wrapper, 'Students can only see this course once it is published.')
  })
})

describe('learner progress (backend values only)', () => {
  const open = (payload) =>
    openInstructorApp('/instructor/courses/course-1/progress', {
      routes: { ...makeCourseBackend().routes, 'GET /api/courses/:courseId/progress': payload },
    })

  it('renders the backend counts, percent, status and next lesson for each learner', async () => {
    const students = [
      learner({ _id: 'l1', name: 'Grace Hopper' }),
      learner({
        _id: 'l2',
        name: 'Alan Turing',
        email: 'alan@test.dev',
        progress: { completedLessons: 5, totalLessons: 5, percent: 100, completed: true },
        nextLesson: null,
        lastActivityAt: '2026-05-21T08:00:00.000Z',
      }),
      learner({
        _id: 'l3',
        name: 'Margaret Hamilton',
        email: 'margaret@test.dev',
        progress: { completedLessons: 0, totalLessons: 5, percent: 0, completed: false },
        nextLesson: { _id: 'x', title: 'Welcome', sectionId: 's', sectionTitle: 'Getting started' },
        lastActivityAt: null,
      }),
    ]
    const { wrapper } = await open(progressPayload({ students }))

    await waitForText(wrapper, 'Margaret Hamilton')

    const cards = wrapper.findAll('li').filter((li) => li.find('[role="progressbar"]').exists())

    // in progress
    expect(cards[0].text()).toContain('In progress')
    expect(cards[0].text()).toContain('2 of 5 lessons')
    expect(cards[0].text()).toContain('Closures')
    expect(cards[0].text()).toContain('Going further')
    // completed
    expect(cards[1].text()).toContain('Completed')
    expect(cards[1].text()).toContain('5 of 5 lessons')
    expect(cards[1].text()).toContain('All lessons completed')
    // not started
    expect(cards[2].text()).toContain('Not started')
    expect(cards[2].text()).toContain('0 of 5 lessons')
    expect(cards[2].text()).toContain('No activity yet')
    expect(cards[2].text()).toContain('Welcome')
  })

  it('exposes progress as accessible progressbars whose values are the backend’s percent', async () => {
    const students = [learner({ name: 'Grace Hopper', progress: { completedLessons: 2, totalLessons: 5, percent: 40, completed: false } })]
    const { wrapper } = await open(progressPayload({ students }))

    await waitForText(wrapper, 'Grace Hopper')

    const bar = wrapper.find('[role="progressbar"]')

    expect(bar.attributes('aria-label')).toBe('Progress of Grace Hopper')
    expect(bar.attributes('aria-valuenow')).toBe('40')
    expect(bar.attributes('aria-valuemin')).toBe('0')
    expect(bar.attributes('aria-valuemax')).toBe('100')
    expect(bar.attributes('aria-valuetext')).toBe('40%, 2 of 5 lessons')
    expect(bar.find('div').attributes('style')).toContain('width: 40%')
  })

  it('does NOT recompute: a percent that disagrees with the counts is shown exactly as the backend sent it', async () => {
    // 1 of 4 would be 25% if the browser calculated it; the backend says 99
    const students = [learner({ name: 'Odd Case', progress: { completedLessons: 1, totalLessons: 4, percent: 99, completed: false } })]
    const { wrapper } = await open(progressPayload({ students }))

    await waitForText(wrapper, 'Odd Case')

    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('99')
    expect(wrapper.text()).toContain('1 of 4 lessons')
  })

  it('takes "completed" from the backend flag, not from the counts', async () => {
    const students = [learner({ name: 'Flag Case', progress: { completedLessons: 3, totalLessons: 3, percent: 100, completed: false } })]
    const { wrapper } = await open(progressPayload({ students }))

    await waitForText(wrapper, 'Flag Case')

    const card = wrapper.findAll('li').find((li) => li.find('[role="progressbar"]').exists())

    expect(card.text()).toContain('In progress') // the card follows the backend flag
    expect(card.text()).not.toContain('Completed')
  })

  it('shows the backend summary numbers and course status', async () => {
    const students = [
      learner({ _id: 'a', name: 'Done One', progress: { completedLessons: 5, totalLessons: 5, percent: 100, completed: true } }),
      learner({ _id: 'b', name: 'Going Two' }),
    ]
    const { wrapper } = await open(progressPayload({ students, totalLessons: 5 }))

    await waitForText(wrapper, 'Done One')

    const stats = Object.fromEntries(wrapper.findAll('dl > div').map((d) => [d.find('dt').text(), d.find('dd').text()]))

    expect(stats['Enrolled learners']).toBe('2')
    expect(stats['Completed the course']).toBe('1')
    expect(stats['Lessons in the course']).toBe('5')
    expect(stats.Status).toBe('Published')
  })

  it('formats the backend timestamp for last activity', async () => {
    const { wrapper } = await open(progressPayload({ students: [learner({ lastActivityAt: '2026-05-20T10:30:00.000Z' })] }))

    await waitForText(wrapper, 'Last activity')

    expect(wrapper.text()).toMatch(/May 20, 2026|20 May 2026|2026/)
    expect(wrapper.text()).not.toContain('2026-05-20T10:30:00.000Z')
  })

  it('shows an empty state with a link to enroll when nobody is enrolled', async () => {
    const { wrapper } = await open(progressPayload({ students: [] }))

    await waitForText(wrapper, 'No learners to show yet')

    expect(wrapper.find('main a[href="/instructor/courses/course-1/learners"]').exists()).toBe(true)
  })

  it('explains a draft course and a course without lessons', async () => {
    const { wrapper } = await open(progressPayload({ status: 'draft', totalLessons: 0, students: [learner({ progress: { completedLessons: 0, totalLessons: 0, percent: 0, completed: false }, nextLesson: null })] }))

    await waitForText(wrapper, 'This course is a draft')

    expect(wrapper.text()).toContain('no lessons yet, so there is no progress to measure')
    expect(wrapper.text()).toContain('No lessons yet')
  })

  it('shows an error state with retry', async () => {
    const { wrapper, fake } = await open(reply(500, { message: 'x' }))

    await waitForText(wrapper, 'The server had a problem')

    fake.set('GET /api/courses/:courseId/progress', progressPayload({ students: [learner({ name: 'Back Again' })] }))
    await click(wrapper, 'Try again')
    await waitForText(wrapper, 'Back Again')
  })

  it('refreshes after a new lesson is added (progress was invalidated)', async () => {
    const backend = makeCourseBackend({ sections: [{ _id: 'sec-1', title: 'Basics', lessons: [] }] })
    let total = 1
    const { wrapper, fake } = await openInstructorApp('/instructor/courses/course-1/progress', {
      routes: {
        ...backend.routes,
        'GET /api/courses/:courseId/progress': () => progressPayload({ totalLessons: total, students: [learner({ name: 'Live Learner' })] }),
      },
    })

    await waitForText(wrapper, 'Live Learner')
    expect(fake.callsTo('GET /api/courses/:courseId/progress')).toHaveLength(1)

    // a lesson is created through the API (as the content tab would); the progress cache must refresh
    total = 2
    await wrapper.vm.$router.push('/instructor/courses/course-1/sections/sec-1/lessons/new')
    await flushPromises()
    await waitForText(wrapper, 'New lesson')
    await wrapper.find('input[type="text"]').setValue('Another lesson')
    await wrapper.find('select').setValue('video')
    await wrapper.findAll('input[type="text"]')[1].setValue('abcdefghijk')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    await wrapper.vm.$router.push('/instructor/courses/course-1/progress')
    await waitForText(wrapper, 'Lessons in the course')

    // creating the lesson marked the progress query stale, so coming back refetched it
    await vi.waitFor(() => expect(fake.callsTo('GET /api/courses/:courseId/progress').length).toBeGreaterThan(1))
    expect(button(wrapper, 'Try again')).toBeFalsy()
    await waitForGone(wrapper, 'Loading')
  })
})
