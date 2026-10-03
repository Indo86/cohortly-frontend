import { describe, expect, it, vi } from 'vitest'
import axe from 'axe-core'
import { APP_NAME } from '@/constants/app.js'
import { aLesson, aSection, courseRow, category, learner, makeCourseBackend, overview, progressPayload, studentRow } from './data.js'
import { click, openInstructorApp, waitForText } from './instructorApp.js'

// Automated accessibility checks (axe-core, WCAG 2.0/2.1 A and AA rules) on representative
// instructor pages. jsdom has no layout engine, so colour contrast cannot be measured here and
// is left to manual review. These checks catch structural problems: missing labels, names,
// roles, duplicate ids, invalid ARIA.
vi.mock('@/components/instructor/RichTextEditor.vue', async () => {
  const { h, defineComponent } = await import('vue')

  return {
    __esModule: true,
    default: defineComponent({
      props: { modelValue: { type: String, default: '' }, label: { type: String, default: '' } },
      emits: ['update:modelValue'],
      setup: (props) => () => h('textarea', { 'aria-label': props.label, value: props.modelValue }),
    }),
  }
})

const audit = async (wrapper) => {
  const result = await axe.run(wrapper.element.parentElement ?? document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })

  return result.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.html.slice(0, 90)).join(' | ')}`)
}

const backendWithContent = () =>
  makeCourseBackend({ sections: [aSection('Basics', [aLesson('Lesson one'), aLesson('Lesson two', 'video')]), aSection('Empty section')] })

const students = [studentRow({ _id: 's1', name: 'Ada Lovelace', courses: ['c1'] }), studentRow({ _id: 's2', name: 'Grace Hopper' })]

describe('the audit itself', () => {
  it('actually detects problems (an unlabelled field and an unnamed button)', async () => {
    const holder = document.createElement('div')

    holder.innerHTML = '<main><input type="text"><button></button></main>'
    document.body.appendChild(holder)

    const result = await axe.run(holder, { runOnly: { type: 'tag', values: ['wcag2a'] } })

    holder.remove()

    expect(result.violations.map((v) => v.id)).toEqual(expect.arrayContaining(['label', 'button-name']))
  })
})

describe('accessibility (axe, structural rules)', () => {
  it('dashboard', async () => {
    const { wrapper } = await openInstructorApp('/instructor', { routes: { 'GET /api/overviews': overview() } })

    await waitForText(wrapper, 'Video lessons')
    expect(await audit(wrapper)).toEqual([])
  })

  it('course list', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses', {
      routes: { 'GET /api/courses': [courseRow({ _id: 'c1', name: 'One' }), courseRow({ _id: 'c2', name: 'Two', status: 'published' })] },
    })

    await waitForText(wrapper, 'Two')
    expect(await audit(wrapper)).toEqual([])
  })

  it('create course form', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses/new', { routes: { 'GET /api/categories': [category()] } })

    await waitForText(wrapper, 'Course name')
    expect(await audit(wrapper)).toEqual([])
  })

  it('create course form with validation errors', async () => {
    const { wrapper } = await openInstructorApp('/instructor/courses/new', { routes: { 'GET /api/categories': [category()] } })

    await waitForText(wrapper, 'Course name')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Choose a category.')
    expect(await audit(wrapper)).toEqual([])
  })

  it('course editor with sections, lessons and reorder controls', async () => {
    const backend = backendWithContent()
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes })

    await waitForText(wrapper, 'Lesson two')
    expect(await audit(wrapper)).toEqual([])
  })

  it('a confirmation dialog', async () => {
    const backend = backendWithContent()
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes })

    await waitForText(wrapper, 'Lesson two')
    await click(wrapper, 'Delete section Basics')

    expect(wrapper.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(await audit(wrapper)).toEqual([])
  })

  it('lesson form (text and video)', async () => {
    const backend = backendWithContent()
    const sectionId = backend.state.sections[0]._id
    const { wrapper } = await openInstructorApp(`/instructor/courses/course-1/sections/${sectionId}/lessons/new`, { routes: backend.routes })

    await waitForText(wrapper, 'New lesson')
    expect(await audit(wrapper)).toEqual([])

    await wrapper.find('select').setValue('video')
    expect(await audit(wrapper)).toEqual([])
  })

  it('students list and student form', async () => {
    const list = await openInstructorApp('/instructor/students', { routes: { 'GET /api/students': students } })

    await waitForText(list.wrapper, 'Grace Hopper')
    expect(await audit(list.wrapper)).toEqual([])

    const form = await openInstructorApp('/instructor/students/new')

    await waitForText(form.wrapper, 'Add student')
    expect(await audit(form.wrapper)).toEqual([])
  })

  it('learners page and progress page', async () => {
    const backend = makeCourseBackend()
    const learners = await openInstructorApp('/instructor/courses/course-1/learners', {
      routes: {
        ...backend.routes,
        'GET /api/students': students,
        'GET /api/courses/students/:courseId': { _id: 'course-1', name: 'x', students: [{ _id: 's1', name: 'Ada Lovelace', email: 'ada@test.dev', photo_url: '' }] },
      },
    })

    await waitForText(learners.wrapper, 'Enrolled learners (1)')
    expect(await audit(learners.wrapper)).toEqual([])

    const progress = await openInstructorApp('/instructor/courses/course-1/progress', {
      routes: { ...backend.routes, 'GET /api/courses/:courseId/progress': progressPayload({ students: [learner(), learner({ name: 'Alan Turing', progress: { completedLessons: 5, totalLessons: 5, percent: 100, completed: true }, nextLesson: null })] }) },
    })

    await waitForText(progress.wrapper, 'Alan Turing')
    expect(await audit(progress.wrapper)).toEqual([])
  })
})

describe('no dead or unnamed controls', () => {
  const PAGES = [
    ['/instructor', { 'GET /api/overviews': overview() }],
    ['/instructor/courses', { 'GET /api/courses': [courseRow({ _id: 'c1', name: 'One' })] }],
    ['/instructor/courses/course-1', backendWithContent().routes],
    ['/instructor/students', { 'GET /api/students': students }],
  ]

  it.each(PAGES)('%s has no "#" links and every button and link has a name', async (path, routes) => {
    const { wrapper } = await openInstructorApp(path, { routes })

    await waitForText(wrapper, APP_NAME)
    await new Promise((resolve) => setTimeout(resolve, 50))

    for (const a of wrapper.findAll('a')) {
      expect(a.attributes('href'), a.html()).toBeTruthy()
      expect(a.attributes('href')).not.toBe('#')
      expect((a.text() || a.attributes('aria-label') || '').trim(), a.html()).not.toBe('')
    }

    for (const b of wrapper.findAll('button')) {
      expect((b.text() || b.attributes('aria-label') || '').trim(), b.html()).not.toBe('')
    }
  })
})
