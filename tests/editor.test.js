import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { R } from '@/constants/routes.js'
import { aLesson, aSection, makeCourseBackend } from './data.js'
import { reply } from './fakeApi.js'
import { button, click, dialog, openInstructorApp, waitForGone, waitForRoute, waitForText } from './instructorApp.js'

// The rich-text editor (CKEditor) is replaced by a plain textarea: it needs a real browser. The
// editor is a convenience; the backend sanitizes, and the real editor is exercised in the
// browser smoke run.
vi.mock('@/components/instructor/RichTextEditor.vue', async () => {
  const { h, defineComponent } = await import('vue')

  return {
    __esModule: true,
    default: defineComponent({
      props: { modelValue: { type: String, default: '' }, label: { type: String, default: '' } },
      emits: ['update:modelValue'],
      setup: (props, { emit }) => () =>
        h('textarea', { 'aria-label': props.label, value: props.modelValue, onInput: (e) => emit('update:modelValue', e.target.value) }),
    }),
  }
})

const open = (backend, path = '/instructor/courses/course-1', routes = {}) =>
  openInstructorApp(path, { routes: { ...backend.routes, ...routes } })

const titles = (wrapper, selector) => wrapper.findAll(selector).map((el) => el.text().replace(/^\d+\./, '').trim())
const sectionTitles = (wrapper) => wrapper.findAll('main h2').map((h) => h.text().replace(/^\d+\.\s*/, '').replace(/\d+ lessons?$/, '').trim())

describe('course editor layout', () => {
  it('shows the course name, status, counts and the tabs, each a real route', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One'), aLesson('Two')])] })
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Intro to Vue')

    expect(wrapper.find('h1').text()).toBe('Intro to Vue')
    expect(wrapper.text()).toContain('Draft')
    expect(wrapper.text()).toContain('1 section')
    expect(wrapper.text()).toContain('2 lessons')

    const tabs = wrapper.findAll('nav[aria-label="Course sections"] a')

    expect(tabs.map((t) => t.text())).toEqual(['Content', 'Quiz', 'Learners', 'Progress', 'Settings'])
    expect(tabs.map((t) => t.attributes('href'))).toEqual([
      '/instructor/courses/course-1',
      '/instructor/courses/course-1/quiz',
      '/instructor/courses/course-1/learners',
      '/instructor/courses/course-1/progress',
      '/instructor/courses/course-1/settings',
    ])
    expect(wrapper.findAll('nav[aria-label="Course sections"] a[aria-current="page"]').map((t) => t.text())).toEqual(['Content'])
  })

  it('keeps "Courses" active in the main menu while inside a course', async () => {
    const backend = makeCourseBackend()
    const { wrapper } = await open(backend, '/instructor/courses/course-1/learners', {
      'GET /api/courses/students/:courseId': { _id: 'course-1', name: 'x', students: [] },
    })

    await waitForText(wrapper, 'Intro to Vue')

    expect(wrapper.findAll('nav[aria-label="Main"] a[aria-current="page"]').map((a) => a.text())).toEqual(['Courses'])
  })
})

describe('publish / unpublish from the course header', () => {
  it('cannot publish an empty course: shows guidance, and the badge stays Draft', async () => {
    const backend = makeCourseBackend()
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Intro to Vue')
    await click(wrapper, 'Publish')
    await waitForText(wrapper, 'Add at least one lesson before publishing.')

    expect(wrapper.find('main header').text()).toContain('Draft')
    expect(backend.state.course.status).toBe('draft')
  })

  it('publishes a course that has a lesson and then offers Unpublish', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One')])] })
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Intro to Vue')
    await click(wrapper, 'Publish')
    await waitForText(wrapper, 'Published')

    expect(backend.state.course.status).toBe('published')
    expect(button(wrapper, 'Unpublish')).toBeTruthy()
    expect(button(wrapper, 'Publish')).toBeFalsy()
  })

  it('unpublishing needs confirmation, then the course is a draft again', async () => {
    const backend = makeCourseBackend({ course: { status: 'published' }, sections: [aSection('Basics', [aLesson('One')])] })
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Published')
    await click(wrapper, 'Unpublish')

    expect(dialog(wrapper).text()).toContain('progress is kept')
    expect(backend.state.course.status).toBe('published')

    await click(dialog(wrapper), 'Unpublish')
    await waitForText(wrapper, 'Draft')

    expect(backend.state.course.status).toBe('draft')
  })
})

describe('sections', () => {
  it('shows a start-here state when the course has no sections yet', async () => {
    const { wrapper } = await open(makeCourseBackend())

    await waitForText(wrapper, 'Start with a section')

    expect(wrapper.text()).toContain('at least one lesson before it can be published')
    expect(wrapper.text()).toContain('New section title')
  })

  it('creates sections in order and shows them after the refetch', async () => {
    const backend = makeCourseBackend()
    const { wrapper, fake } = await open(backend)

    await waitForText(wrapper, 'Start with a section')

    for (const title of ['Section One', 'Section Two']) {
      await wrapper.find('form input').setValue(title)
      await wrapper.find('form').trigger('submit.prevent')
      await waitForText(wrapper, title)
    }

    expect(fake.callsTo('POST /api/courses/:courseId/sections').map((c) => c.body)).toEqual([{ title: 'Section One' }, { title: 'Section Two' }])
    expect(sectionTitles(wrapper)).toEqual(['Section One', 'Section Two'])
    expect(wrapper.text()).not.toContain('Start with a section')
  })

  it('validates the section title and shows backend errors', async () => {
    const backend = makeCourseBackend()
    const { wrapper } = await open(backend, '/instructor/courses/course-1', {
      'POST /api/courses/:courseId/sections': reply(400, { message: 'Validation error', errors: [{ path: 'title', message: 'Too short' }] }),
    })

    await waitForText(wrapper, 'Start with a section')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('Enter a title of at least 3 characters.')

    await wrapper.find('form input').setValue('Okay title')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Too short')
  })

  it('renames a section in place', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Old name')] })
    const { wrapper, fake } = await open(backend)

    await waitForText(wrapper, 'Old name')
    await click(wrapper, 'Rename section Old name')

    const input = wrapper.find('main form input')

    expect(input.element.value).toBe('Old name')

    await input.setValue('New name')
    await wrapper.find('main form').trigger('submit.prevent')
    await waitForText(wrapper, 'New name')

    expect(fake.callsTo('PUT /api/sections/:sectionId')[0].body).toEqual({ title: 'New name' })
    expect(wrapper.text()).not.toContain('Old name')
  })

  it('keeps keyboard focus sensible: into the field when renaming starts, back on the button when it ends', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Focus me')] })
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Focus me')
    await click(wrapper, 'Rename section Focus me')
    await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.find('main form input').element))

    await click(wrapper, 'Cancel')
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Rename section Focus me'))
  })

  it('deletes a section only after a confirmation that names the lessons being removed', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Doomed', [aLesson('L1'), aLesson('L2')]), aSection('Safe')] })
    const { wrapper, fake } = await open(backend)

    await waitForText(wrapper, 'Doomed')
    await click(wrapper, 'Delete section Doomed')

    expect(dialog(wrapper).text()).toContain('2 lessons')
    expect(dialog(wrapper).text()).toContain('progress')
    expect(fake.callsTo('DELETE /api/sections/:sectionId')).toHaveLength(0)

    await click(dialog(wrapper), 'Delete section')
    await waitForGone(wrapper, 'Doomed')

    expect(sectionTitles(wrapper)).toEqual(['Safe'])
  })

  it('reorders sections with Up/Down buttons by sending the COMPLETE id list', async () => {
    const s1 = aSection('First')
    const s2 = aSection('Second')
    const s3 = aSection('Third')
    const backend = makeCourseBackend({ sections: [s1, s2, s3] })
    const { wrapper, fake } = await open(backend)

    await waitForText(wrapper, 'Third')
    await click(wrapper, 'Move section “Third” up')

    expect(fake.callsTo('PATCH /api/courses/:courseId/sections/reorder')[0].body).toEqual({ sectionIds: [s1._id, s3._id, s2._id] })

    await vi.waitFor(() => expect(sectionTitles(wrapper)).toEqual(['First', 'Third', 'Second']))
  })

  it('disables Up on the first and Down on the last item', async () => {
    const backend = makeCourseBackend({ sections: [aSection('First'), aSection('Last')] })
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Last')

    expect(button(wrapper, 'Move section “First” up').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Move section “Last” down').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Move section “First” down').attributes('disabled')).toBeUndefined()
  })

  it('on REORDER_MISMATCH tells the user, refetches the real structure and never overwrites it', async () => {
    const s1 = aSection('First')
    const s2 = aSection('Second')
    const backend = makeCourseBackend({ sections: [s1, s2] })
    const { wrapper, fake } = await open(backend)

    await waitForText(wrapper, 'Second')
    backend.state.rejectNextReorder = true // the server order changed behind our back

    const before = fake.callsTo('GET /api/courses/:id').length

    await click(wrapper, 'Move section “Second” up')
    await waitForText(wrapper, 'The sections changed elsewhere, so the current order was reloaded.')

    // the server's (changed) order is what is shown, and we did not retry with stale ids
    await vi.waitFor(() => expect(fake.callsTo('GET /api/courses/:id').length).toBeGreaterThan(before))
    expect(fake.callsTo('PATCH /api/courses/:courseId/sections/reorder')).toHaveLength(1)
    await vi.waitFor(() => expect(sectionTitles(wrapper)).toEqual(['Second', 'First']))
  })
})

describe('lessons in the editor', () => {
  const withLessons = () =>
    makeCourseBackend({ sections: [aSection('Basics', [aLesson('Lesson one'), aLesson('Lesson two', 'video'), aLesson('Lesson three')])] })

  it('lists lessons with their type and an empty state for a section without lessons', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('Lesson one'), aLesson('Lesson two', 'video')]), aSection('Empty')] })
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Lesson one')

    expect(wrapper.text()).toContain('Video')
    expect(wrapper.text()).toContain('Text')
    expect(wrapper.text()).toContain('No lessons yet. A course needs at least one lesson before it can be published.')
    expect(wrapper.find('a[aria-label="Edit lesson Lesson one"]').exists()).toBe(true)
  })

  it('reorders lessons within their section', async () => {
    const backend = withLessons()
    const [l1, l2, l3] = backend.state.sections[0].lessons
    const { wrapper, fake } = await open(backend)

    await waitForText(wrapper, 'Lesson three')
    await click(wrapper, 'Move lesson “Lesson one” down')

    expect(fake.callsTo('PATCH /api/sections/:sectionId/lessons/reorder')[0].body).toEqual({ lessonIds: [l2._id, l1._id, l3._id] })
    await vi.waitFor(() => expect(titles(wrapper, 'li li span.break-words')).toEqual(['Lesson two', 'Lesson one', 'Lesson three']))
  })

  it('on REORDER_MISMATCH for lessons, informs and reloads', async () => {
    const backend = withLessons()
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Lesson three')
    backend.state.rejectNextReorder = true
    await click(wrapper, 'Move lesson “Lesson one” down')

    await waitForText(wrapper, 'The lessons changed elsewhere, so the current order was reloaded.')
  })

  it('deletes a lesson after a confirmation that mentions student completions', async () => {
    const backend = withLessons()
    const { wrapper } = await open(backend)

    await waitForText(wrapper, 'Lesson two')
    await click(wrapper, 'Delete lesson Lesson two')

    expect(dialog(wrapper).text()).toContain('completion')
    expect(backend.state.sections[0].lessons).toHaveLength(3)

    await click(dialog(wrapper), 'Delete lesson')
    await waitForGone(wrapper, 'Lesson two')

    expect(backend.state.sections[0].lessons).toHaveLength(2)
  })
})

describe('lesson form', () => {
  const newLessonPath = (backend) => `/instructor/courses/course-1/sections/${backend.state.sections[0]._id}/lessons/new`
  const setup = () => makeCourseBackend({ sections: [aSection('Basics')] })

  it('creates a TEXT lesson and returns to the content tab', async () => {
    const backend = setup()
    const { wrapper, fake, router } = await open(backend, newLessonPath(backend))

    await waitForText(wrapper, 'New lesson')
    expect(wrapper.text()).toContain('Adding to section “Basics”')

    await wrapper.find('input[type="text"]').setValue('A text lesson')
    await vi.waitFor(() => expect(wrapper.find('textarea').exists()).toBe(true)) // the (lazy) editor
    await wrapper.find('textarea').setValue('<p>Lesson body</p>')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForRoute(router, R.INSTRUCTOR_COURSE)

    const sent = fake.callsTo('POST /api/sections/:sectionId/lessons')[0]

    expect(sent.params.sectionId).toBe(backend.state.sections[0]._id)
    expect(sent.body).toEqual({ title: 'A text lesson', type: 'text', text: '<p>Lesson body</p>' }) // no youtubeId
    await waitForText(wrapper, 'A text lesson')
  })

  it('creates a VIDEO lesson from a pasted YouTube link and sends only the id', async () => {
    const backend = setup()
    const { wrapper, fake, router } = await open(backend, newLessonPath(backend))

    await waitForText(wrapper, 'New lesson')
    await wrapper.find('input[type="text"]').setValue('A video lesson')
    await wrapper.find('select').setValue('video')

    expect(wrapper.find('textarea').exists()).toBe(false) // type-specific fields
    expect(wrapper.text()).toContain('YouTube video')

    const inputs = wrapper.findAll('input[type="text"]')

    await inputs[1].setValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForRoute(router, R.INSTRUCTOR_COURSE)

    expect(fake.callsTo('POST /api/sections/:sectionId/lessons')[0].body).toEqual({ title: 'A video lesson', type: 'video', youtubeId: 'dQw4w9WgXcQ' })
  })

  it('validates before sending: title, content and video id', async () => {
    const backend = setup()
    const { wrapper, fake } = await open(backend, newLessonPath(backend))

    await waitForText(wrapper, 'New lesson')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Enter a title of at least 5 characters.')
    expect(wrapper.text()).toContain('Write some lesson content.')

    await wrapper.find('select').setValue('video')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Enter a YouTube video id or link.')
    expect(fake.callsTo('POST /api/sections/:sectionId/lessons')).toHaveLength(0)
  })

  it('shows backend validation errors on the right field', async () => {
    const backend = setup()
    const { wrapper } = await open(backend, newLessonPath(backend), {
      'POST /api/sections/:sectionId/lessons': reply(400, {
        message: 'Validation error',
        errors: [{ path: 'youtubeId', message: 'Youtube ID is required' }],
      }),
    })

    await waitForText(wrapper, 'New lesson')
    await wrapper.find('input[type="text"]').setValue('A video lesson')
    await wrapper.find('select').setValue('video')
    await wrapper.findAll('input[type="text"]')[1].setValue('abcd1234')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Youtube ID is required')

    expect(wrapper.findAll('input[type="text"]')[1].attributes('aria-invalid')).toBe('true')
  })

  it('shows a general backend error when it is not about a field', async () => {
    const backend = setup()
    const { wrapper } = await open(backend, newLessonPath(backend), {
      'POST /api/sections/:sectionId/lessons': reply(500, { message: 'Internal server error' }),
    })

    await waitForText(wrapper, 'New lesson')
    await wrapper.find('input[type="text"]').setValue('A text lesson')
    await vi.waitFor(() => expect(wrapper.find('textarea').exists()).toBe(true))
    await wrapper.find('textarea').setValue('<p>Body text</p>')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Internal server error')
  })

  it('edits an existing lesson, pre-filled from the server, and can switch its type', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('Original title', 'text', { text: '<p>Original body</p>' })])] })
    const lessonId = backend.state.sections[0].lessons[0]._id
    const { wrapper, fake, router } = await open(backend, `/instructor/courses/course-1/lessons/${lessonId}/edit`)

    await waitForText(wrapper, 'Edit lesson')
    await vi.waitFor(() => expect(wrapper.find('textarea').exists()).toBe(true))

    expect(wrapper.find('input[type="text"]').element.value).toBe('Original title')
    expect(wrapper.find('textarea').element.value).toBe('<p>Original body</p>')
    expect(wrapper.text()).toContain('In section “Basics”')

    await wrapper.find('input[type="text"]').setValue('Renamed lesson')
    await wrapper.find('select').setValue('video')
    await wrapper.findAll('input[type="text"]')[1].setValue('abcdefghijk')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForRoute(router, R.INSTRUCTOR_COURSE)

    expect(fake.callsTo('PUT /api/lessons/:lessonId')[0].body).toEqual({ title: 'Renamed lesson', type: 'video', youtubeId: 'abcdefghijk' })
    await waitForText(wrapper, 'Renamed lesson')
  })

  it('has no control that moves a lesson to another section or course', async () => {
    const backend = makeCourseBackend({ sections: [aSection('A', [aLesson('Lesson one')]), aSection('B')] })
    const lessonId = backend.state.sections[0].lessons[0]._id
    const { wrapper } = await open(backend, `/instructor/courses/course-1/lessons/${lessonId}/edit`)

    await waitForText(wrapper, 'Edit lesson')

    expect(wrapper.findAll('select')).toHaveLength(1) // only the lesson type
    expect(wrapper.text()).not.toMatch(/move to|section:/i)
  })
})
