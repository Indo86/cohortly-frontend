import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { R } from '@/constants/routes.js'
import { category, courseRow, makeCourseBackend, overview, aLesson, aSection } from './data.js'
import { reply } from './fakeApi.js'
import { button, click, dialog, openInstructorApp, waitForGone, waitForRoute, waitForText } from './instructorApp.js'

describe('dashboard: real overview data', () => {
  it('shows the numbers the backend returned, and nothing else', async () => {
    const { wrapper, fake } = await openInstructorApp('/instructor', { routes: { 'GET /api/overviews': overview() } })

    await waitForText(wrapper, 'Video lessons')

    const stats = Object.fromEntries(wrapper.findAll('dl > div').map((d) => [d.find('dt').text(), d.find('dd').text()]))

    expect(stats).toMatchObject({ Courses: '3', Published: '2', Students: '7', 'Video lessons': '11', 'Text lessons': '5' })
    expect(fake.callsTo('GET /api/overviews')).toHaveLength(1)
    expect(wrapper.text()).toContain('Course A')
    expect(wrapper.text()).not.toMatch(/Our Rapport|Completed 75%/) // the old fake donut is gone
  })

  it('shows a loading state, then the data', async () => {
    let release
    const gate = new Promise((resolve) => (release = resolve))
    const { wrapper } = await openInstructorApp('/instructor', {
      routes: { 'GET /api/overviews': async () => (await gate, overview()) },
    })

    expect(wrapper.text()).toContain('Loading your overview')

    release()
    await waitForText(wrapper, 'Video lessons')
  })

  it('shows an error with retry when the overview fails, and recovers on retry', async () => {
    const { wrapper, fake } = await openInstructorApp('/instructor', {
      routes: { 'GET /api/overviews': reply(500, { message: 'Internal server error' }) },
    })

    await waitForText(wrapper, 'The server had a problem')

    fake.set('GET /api/overviews', overview())
    await click(wrapper, 'Try again')
    await waitForText(wrapper, 'Video lessons')
  })

  it('shows a first-use state with next steps when there is nothing yet', async () => {
    const { wrapper } = await openInstructorApp('/instructor')

    await waitForText(wrapper, 'Let’s set up your first course')

    expect(wrapper.find('main a[href="/instructor/courses/new"]').exists()).toBe(true)
    expect(wrapper.find('main a[href="/instructor/students/new"]').exists()).toBe(true)
    expect(wrapper.findAll('dl').length).toBe(0) // no zero-filled fake metrics
  })
})

describe('course list', () => {
  const courses = () => [
    courseRow({ _id: 'c1', name: 'Intro to Vue', status: 'draft', total_students: 1, category: { name: 'Programming' } }),
    courseRow({ _id: 'c2', name: 'Advanced Design', status: 'published', total_students: 3, category: { name: 'Design' } }),
  ]

  it('lists the courses with status, category and student count', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses', { routes: { 'GET /api/courses': courses() } })

    await waitForText(wrapper, 'Advanced Design')

    const text = wrapper.text()

    expect(text).toContain('Intro to Vue')
    expect(text).toContain('Draft')
    expect(text).toContain('Published')
    expect(text).toContain('Design')
    expect(text).toContain('3 students')
    expect(text).toContain('1 student')
    expect(wrapper.find('a[href="/instructor/courses/c1"]').exists()).toBe(true)
  })

  it('shows an empty state that explains how to start', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses')

    await waitForText(wrapper, 'You have no courses yet')

    expect(wrapper.find('main a[href="/instructor/courses/new"]').exists()).toBe(true)
  })

  it('shows an error state with retry when the list cannot be loaded', async () => {
    const { wrapper, fake } = await openInstructorApp('/instructor/courses', {
      routes: { 'GET /api/courses': reply(503, { message: 'down' }) },
    })

    await waitForText(wrapper, 'The server had a problem')

    fake.set('GET /api/courses', courses())
    await click(wrapper, 'Try again')
    await waitForText(wrapper, 'Advanced Design')
  })

  it('filters the loaded courses by name on the client (and says so)', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses', { routes: { 'GET /api/courses': courses() } })

    await waitForText(wrapper, 'Advanced Design')
    expect(wrapper.text()).toContain('Filters the courses shown below.')

    await wrapper.find('input[type="search"]').setValue('design')

    expect(wrapper.text()).toContain('Advanced Design')
    expect(wrapper.text()).not.toContain('Intro to Vue')

    await wrapper.find('input[type="search"]').setValue('zzz')
    expect(wrapper.text()).toContain('No course matches')
  })

  it('publishes a draft from the list only after the backend confirms, then shows the new status', async () => {
    const backend = makeCourseBackend({ sections: [aSection('S1', [aLesson('L1')])] })
    let published = false
    const { wrapper, fake } = await openInstructorApp('/instructor/courses', {
      routes: {
        'GET /api/courses': () => [courseRow({ _id: 'course-1', name: 'Intro to Vue', status: published ? 'published' : 'draft' })],
        'PUT /api/courses/:id/status': (call) => {
          published = call.body.status === 'published'

          return backend.routes['PUT /api/courses/:id/status'](call)
        },
      },
    })

    await waitForText(wrapper, 'Draft')
    await click(wrapper, 'Publish')
    await waitForText(wrapper, 'Published')

    expect(fake.callsTo('PUT /api/courses/:id/status')[0].body).toEqual({ status: 'published' })
    expect(fake.callsTo('GET /api/courses').length).toBeGreaterThan(1) // the list was refetched
    expect(button(wrapper, 'Unpublish')).toBeTruthy()
  })

  it('translates COURSE_NOT_PUBLISHABLE into guidance and keeps the course a draft', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses', {
      routes: {
        'GET /api/courses': [courseRow({ _id: 'course-1', name: 'Empty course', status: 'draft' })],
        'PUT /api/courses/:id/status': reply(422, { message: 'x', code: 'COURSE_NOT_PUBLISHABLE' }),
      },
    })

    await waitForText(wrapper, 'Draft')
    await click(wrapper, 'Publish')
    await waitForText(wrapper, 'Add at least one lesson before publishing.')

    expect(wrapper.text()).toContain('Draft')
    expect(wrapper.text()).not.toContain('Unpublish')
  })

  it('asks before unpublishing, explaining that students lose access but keep progress', async () => {
    const { wrapper, fake } = await openInstructorApp('/instructor/courses', {
      routes: {
        'GET /api/courses': [courseRow({ _id: 'course-1', name: 'Live course', status: 'published' })],
        'PUT /api/courses/:id/status': { status: 'draft' },
      },
    })

    await waitForText(wrapper, 'Published')
    await click(wrapper, 'Unpublish')

    expect(dialog(wrapper).exists()).toBe(true)
    expect(dialog(wrapper).text()).toContain('Students lose access to this course immediately')
    expect(dialog(wrapper).text()).toContain('progress is kept')
    expect(fake.callsTo('PUT /api/courses/:id/status')).toHaveLength(0) // nothing sent yet

    await click(dialog(wrapper), 'Cancel')
    expect(dialog(wrapper).exists()).toBe(false)
    expect(fake.callsTo('PUT /api/courses/:id/status')).toHaveLength(0)

    await click(wrapper, 'Unpublish')
    await click(dialog(wrapper), 'Unpublish')

    expect(fake.callsTo('PUT /api/courses/:id/status')[0].body).toEqual({ status: 'draft' })
  })

  it('deletes only after an explicit confirmation that lists what is removed', async () => {
    let list = courses()
    const { wrapper, fake } = await openInstructorApp('/instructor/courses', {
      routes: {
        'GET /api/courses': () => list,
        'DELETE /api/courses/:id': (call) => {
          list = list.filter((course) => course._id !== call.params.id)

          return {}
        },
      },
    })

    await waitForText(wrapper, 'Intro to Vue')
    await click(wrapper, 'Delete course Intro to Vue')

    const text = dialog(wrapper).text()

    expect(text).toContain('sections and lessons')
    expect(text).toContain('progress')
    expect(text).toContain('enrollments')
    expect(fake.callsTo('DELETE /api/courses/:id')).toHaveLength(0)

    await click(dialog(wrapper), 'Delete course')
    await waitForGone(wrapper, 'Intro to Vue')

    expect(fake.callsTo('DELETE /api/courses/:id')[0].url).toBe('/api/courses/c1')
    expect(wrapper.text()).toContain('Advanced Design')
  })

  it('shows a delete failure inside the dialog and keeps the course', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses', {
      routes: { 'GET /api/courses': courses(), 'DELETE /api/courses/:id': reply(500, { message: 'Internal server error' }) },
    })

    await waitForText(wrapper, 'Intro to Vue')
    await click(wrapper, 'Delete course Intro to Vue')
    await click(dialog(wrapper), 'Delete course')

    expect(dialog(wrapper).text()).toContain('Internal server error')
    expect(wrapper.text()).toContain('Intro to Vue')
  })
})

describe('create course', () => {
  const fillAndSubmit = async (wrapper) => {
    await wrapper.find('input[type="text"]').setValue('Brand new course') // name
    const inputs = wrapper.findAll('input[type="text"]')

    await inputs[1].setValue('A short tagline')
    await wrapper.find('select').setValue('cat-1')
    await wrapper.find('textarea').setValue('A long enough description of the course')


    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
  }

  const base = (extra = {}) => ({ 'GET /api/categories': [category(), category('Design', 'cat-2')], ...extra })

  it('lists the real categories and sends a multipart body without any status', async () => {
    const { wrapper, fake, router } = await openInstructorApp('/instructor/courses/new', {
      routes: base({
        'POST /api/courses': () => ({ _id: 'new-course-id' }),
        'GET /api/courses/:id': makeCourseBackend().routes['GET /api/courses/:id'],
      }),
    })

    await waitForText(wrapper, 'Course name')
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['Choose…', 'Programming', 'Design'])

    await fillAndSubmit(wrapper)

    const sent = fake.callsTo('POST /api/courses')[0]

    expect(sent.body).toBeInstanceOf(FormData)
    expect(sent.form).toMatchObject({
      name: 'Brand new course',
      tagline: 'A short tagline',
      categoryId: 'cat-1',
      description: 'A long enough description of the course',
    })
    expect(sent.form).not.toHaveProperty('thumbnail') // the cover is generated, never uploaded
    expect(sent.form).not.toHaveProperty('status')

    // after creating, the instructor lands in the new course's editor
    await waitForRoute(router, R.INSTRUCTOR_COURSE)
    expect(router.currentRoute.value.params.courseId).toBe('new-course-id')
  })

  it('validates locally first, and offers no image upload', async () => {
    const { wrapper, fake } = await openInstructorApp('/instructor/courses/new', { routes: base() })

    await waitForText(wrapper, 'Course name')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(fake.callsTo('POST /api/courses')).toHaveLength(0)
    expect(wrapper.text()).toContain('Enter a name of at least 5 characters.')
    expect(wrapper.text()).toContain('Choose a category.')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Thumbnail')
  })

  it('shows the backend validation errors next to their fields', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses/new', {
      routes: base({
        'POST /api/courses': reply(400, {
          message: 'Validation error',
          errors: [{ path: 'name', message: 'String must contain at least 5 character(s)' }],
        }),
      }),
    })

    await waitForText(wrapper, 'Course name')
    await fillAndSubmit(wrapper)

    const name = wrapper.find('input[type="text"]')

    expect(name.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('String must contain at least 5 character(s)')
  })

  it('shows a non-field backend error as a message and keeps the form usable', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses/new', {
      routes: base({ 'POST /api/courses': reply(400, { message: 'Category not found' }) }),
    })

    await waitForText(wrapper, 'Course name')
    await fillAndSubmit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toBe('Category not found')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('explains when no categories exist', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses/new')

    await waitForText(wrapper, 'No categories are available')
  })
})

describe('edit course', () => {
  it('pre-fills every field, including the stored category (the old React bug)', async () => {
    const backend = makeCourseBackend({ course: { category: { _id: 'cat-2', name: 'Design' } } })
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/settings', {
      routes: { ...backend.routes, 'GET /api/categories': [category(), category('Design', 'cat-2')] },
    })

    await waitForText(wrapper, 'Course details')

    const texts = wrapper.findAll('input[type="text"]')

    expect(texts[0].element.value).toBe('Intro to Vue')
    expect(texts[1].element.value).toBe('Learn Vue by building')
    expect(wrapper.find('select').element.value).toBe('cat-2')
    expect(wrapper.find('textarea').element.value).toBe('A complete description of the course.')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  })

  it('saves changes without a new thumbnail and without touching the status', async () => {
    const backend = makeCourseBackend({ course: { status: 'published' } })
    const { wrapper, fake } = await openInstructorApp('/instructor/courses/course-1/settings', {
      routes: { ...backend.routes, 'GET /api/categories': [category()], 'PUT /api/courses/:id': {} },
    })

    await waitForText(wrapper, 'Course details')
    await wrapper.findAll('input[type="text"]')[0].setValue('Renamed course')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Course saved.')

    const sent = fake.callsTo('PUT /api/courses/:id')[0]

    expect(sent.url).toBe('/api/courses/course-1')
    expect(sent.form).toMatchObject({ name: 'Renamed course', categoryId: 'cat-1' })
    expect(sent.form).not.toHaveProperty('thumbnail')
    expect(sent.form).not.toHaveProperty('status')
  })

  it('shows backend errors when saving fails', async () => {
    const backend = makeCourseBackend()
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1/settings', {
      routes: {
        ...backend.routes,
        'GET /api/categories': [category()],
        'PUT /api/courses/:id': reply(400, { message: 'Category not found' }),
      },
    })

    await waitForText(wrapper, 'Course details')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Category not found')
  })

  it('deleting from settings returns to the course list after confirmation', async () => {
    const backend = makeCourseBackend()
    const { wrapper, router } = await openInstructorApp('/instructor/courses/course-1/settings', {
      routes: { ...backend.routes, 'GET /api/categories': [category()], 'DELETE /api/courses/:id': {} },
    })

    await waitForText(wrapper, 'Delete this course')
    await click(wrapper, 'Delete course Intro to Vue')
    await click(dialog(wrapper), 'Delete course')
    await waitForRoute(router, R.INSTRUCTOR_COURSES)
  })

  it('shows a not-found state for a course that is not yours', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses/missing', {
      routes: { 'GET /api/courses/:id': reply(404, { message: 'Course not found' }) },
    })

    await waitForText(wrapper, 'Course not found')
    expect(wrapper.find('main a[href="/instructor/courses"]').exists()).toBe(true)
  })
})
