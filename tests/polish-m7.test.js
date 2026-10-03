import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import axe from 'axe-core'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindConfig from '../tailwind.config.js'
import { APP_NAME, APP_TAGLINE } from '@/constants/app.js'
import { R } from '@/constants/routes.js'
import { markScrollRegions, SCROLL_REGION_LABEL } from '@/composables/useScrollRegions.js'
import { dismissToast, notify, toasts } from '@/composables/useToast.js'
import { documentTitle, shouldMoveFocus } from '@/router/focus.js'
import LessonContent from '@/components/student/LessonContent.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { aLesson, aSection, courseRow, makeCourseBackend } from './data.js'
import { deferred, instructor, student } from './helpers.js'
import { reply } from './fakeApi.js'
import { click, openInstructorApp, waitForRoute, waitForText } from './instructorApp.js'
import { makeLearningBackend, sectionOf, standardCourse, textLesson } from './learningBackend.js'
import { openStudentApp } from './studentApp.js'

// The rich-text editor needs a real browser; a textarea stands in (as in the editor tests).
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

// the stylesheet is read as plain text (vitest does not hand CSS to tests)
const styles = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')

const audit = async (wrapper) => {
  const result = await axe.run({ include: [wrapper.element.parentElement ?? document.body], exclude: [['iframe']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })

  return result.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.html.slice(0, 90)).join(' | ')}`)
}

const focused = () => document.activeElement

describe('global route focus management', () => {
  it('does not move focus on the first load: the skip link stays the first Tab stop', async () => {
    await openInstructorApp('/instructor', { routes: { 'GET /api/overviews': { totalCourses: 1, publishedCourses: 0, totalStudents: 0, totalVideos: 0, totalTexts: 0, courses: [courseRow()], students: [] } } })

    expect(focused()).toBe(document.body)
    expect(document.querySelector('a[href="#main"]')).not.toBeNull()
    expect(document.querySelector('main#main').getAttribute('tabindex')).toBe('-1')
  })

  it('moves focus to the new page heading and sets the document title after navigating', async () => {
    const { router, wrapper } = await openInstructorApp('/instructor', {})

    await router.push('/instructor/courses')
    await waitForText(wrapper, 'Build courses from sections')
    await vi.waitFor(() => expect(focused()).toBe(wrapper.find('main h1').element))

    expect(focused().textContent).toBe('Courses')
    expect(document.title).toBe(`Courses · ${APP_NAME}`)

    await router.push('/instructor/students')
    await vi.waitFor(() => expect(focused().textContent).toBe('Students'))
    expect(document.title).toBe(`Students · ${APP_NAME}`)
  })

  it('works for the student area too, and waits for a heading that appears after loading', async () => {
    const { backend, sections } = standardCourse()
    const gate = deferred()
    const original = backend.routes['GET /api/students-courses/:courseId/lessons/:lessonId']
    const { router, wrapper } = await openStudentApp('/student', {
      routes: { ...backend.routes, 'GET /api/students-courses/:courseId/lessons/:lessonId': async (call) => { await gate.promise; return original(call) } },
    })

    await waitForText(wrapper, 'Welcome')
    await router.push(`/student/courses/course-1/lessons/${sections[0].lessons[0]._id}`)

    // still loading: focus waits on <main>
    await vi.waitFor(() => expect(focused()).toBe(wrapper.find('main').element))

    gate.resolve()
    await vi.waitFor(() => expect(focused()).toBe(wrapper.find('main h1').element))
    expect(focused().textContent).toContain('What is Vue')
  })

  it('does not move focus when only the query string changes', async () => {
    const { router, wrapper } = await openInstructorApp('/instructor/courses', {})

    await waitForText(wrapper, 'Build courses from sections')
    const link = wrapper.find('nav[aria-label="Main"] a').element

    link.focus()
    await router.push({ path: '/instructor/courses', query: { page: '2' } })
    await flushPromises()

    expect(focused()).toBe(link)
  })

  it('keeps focus on the tab list when switching between the tabs of a course', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One')])] })
    const { router, wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: { ...backend.routes, 'GET /api/courses/students/:id': { students: [] } } })

    await waitForText(wrapper, 'Basics')

    const tab = wrapper.find('nav[aria-label="Course sections"] a').element

    tab.focus()
    await router.push({ name: R.INSTRUCTOR_COURSE_LEARNERS, params: { courseId: 'course-1' } })
    await flushPromises()

    expect(focused()).toBe(tab)
  })

  it('a form that fails validation does not steal focus', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students/new', {})

    await waitForText(wrapper, 'Create an account for a student')
    const name = wrapper.find('input').element

    name.focus()
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Enter a name of at least 5 characters.')
    expect(focused()).toBe(name)
  })

  it('the rules in one place: no move on failure, first load, same path, or between course tabs', () => {
    const page = (name, path, meta = {}, params = {}) => ({ name, path, meta, params, matched: [{}] })
    const first = { matched: [] }

    expect(shouldMoveFocus(page('a', '/a'), page('b', '/b'))).toBe(true)
    expect(shouldMoveFocus(page('a', '/a'), page('b', '/b'), new Error('cancelled'))).toBe(false)
    expect(shouldMoveFocus(page('a', '/a'), first)).toBe(false)
    expect(shouldMoveFocus(page('a', '/a'), page('a', '/a'))).toBe(false)
    expect(shouldMoveFocus(page('t1', '/c/1', { tab: true }, { courseId: '1' }), page('t2', '/c/1/x', { tab: true }, { courseId: '1' }))).toBe(false)
    expect(shouldMoveFocus(page('t1', '/c/2', { tab: true }, { courseId: '2' }), page('t2', '/c/1/x', { tab: true }, { courseId: '1' }))).toBe(true)
    expect(documentTitle({ name: 'nope' })).toBe(APP_NAME)
  })
})

describe('horizontally scrollable lesson content', () => {
  const TABLE = '<figure class="table"><table><tbody><tr><td>A very wide cell</td><td>Another</td></tr></tbody></table></figure>'

  const stubLayout = (scrollWidth, clientWidth) => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth)
  }

  it('makes an overflowing table a labelled, keyboard-focusable region', async () => {
    stubLayout(900, 300)

    const wrapper = mount(LessonContent, { attachTo: document.body, props: { lesson: { _id: 'l', title: 'T', type: 'text', text: TABLE } } })
    const region = wrapper.find('figure.table')

    expect(region.attributes('tabindex')).toBe('0')
    expect(region.attributes('role')).toBe('region')
    expect(region.attributes('aria-label')).toBe(SCROLL_REGION_LABEL)

    region.element.focus()
    expect(document.activeElement).toBe(region.element)
    expect(await audit(wrapper)).toEqual([])
  })

  it('adds no tab stop when the table fits', () => {
    stubLayout(300, 300)

    const wrapper = mount(LessonContent, { attachTo: document.body, props: { lesson: { _id: 'l', title: 'T', type: 'text', text: TABLE } } })
    const region = wrapper.find('figure.table')

    expect(region.attributes('tabindex')).toBeUndefined()
    expect(region.attributes('role')).toBeUndefined()
    expect(region.attributes('aria-label')).toBeUndefined()
  })

  it('updates when the width changes (a rotated phone) and when the lesson changes', async () => {
    stubLayout(300, 300)

    const wrapper = mount(LessonContent, { attachTo: document.body, props: { lesson: { _id: 'l', title: 'T', type: 'text', text: TABLE } } })
    const root = wrapper.find('.lesson-prose').element

    expect(root.querySelector('figure.table').hasAttribute('tabindex')).toBe(false)

    vi.restoreAllMocks()
    stubLayout(900, 300)
    markScrollRegions(root)
    expect(root.querySelector('figure.table').getAttribute('tabindex')).toBe('0')

    vi.restoreAllMocks()
    stubLayout(300, 300)
    markScrollRegions(root)
    expect(root.querySelector('figure.table').hasAttribute('tabindex')).toBe(false)

    await wrapper.setProps({ lesson: { _id: 'm', title: 'T2', type: 'text', text: `<p>No table</p>${TABLE}` } })
    await flushPromises()
    expect(wrapper.find('figure.table').exists()).toBe(true)
  })

  it('does not break a lesson page that has no table', () => {
    const wrapper = mount(LessonContent, { props: { lesson: { _id: 'l', title: 'T', type: 'text', text: '<p>Only text</p>' } } })

    expect(wrapper.text()).toBe('Only text')
  })
})

describe('success feedback (toasts)', () => {
  it('confirms a saved change in a polite live region and can be dismissed', async () => {
    const backend = makeCourseBackend()
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes })

    await waitForText(wrapper, 'Start with a section')
    await wrapper.find('form input').setValue('Section One')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Section added.')

    const region = wrapper.find('[data-testid="toast-region"]')

    expect(region.attributes('role')).toBe('status')
    expect(region.attributes('aria-live')).toBe('polite')
    expect(region.text()).toContain('Section added.')

    await region.find('button[aria-label="Dismiss notification"]').trigger('click')
    expect(region.text()).not.toContain('Section added.')
  })

  it('errors stay inline: a refused publish shows an alert, not a toast', async () => {
    const backend = makeCourseBackend()
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes })

    await waitForText(wrapper, 'Start with a section')
    await click(wrapper, 'Publish')
    await waitForText(wrapper, 'Add at least one lesson before publishing.')

    expect(wrapper.find('[data-testid="toast-region"]').text()).toBe('')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('shows one toast for a repeated message and removes it when dismissed', () => {
    const first = notify('Same message.')

    notify('Same message.')
    expect(toasts.filter((toast) => toast.message === 'Same message.')).toHaveLength(1)

    dismissToast(first)
    expect(toasts).toHaveLength(0)
  })

  it('a successful publish confirms with a toast and the badge', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One')])] })
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes })

    await waitForText(wrapper, 'Basics')
    await click(wrapper, 'Publish')
    await waitForText(wrapper, 'Course published.')
    expect(wrapper.find('main header').text()).toContain('Published')
  })
})

describe('shared patterns', () => {
  it('uses one status vocabulary', () => {
    const label = (kind, status) => mount(StatusBadge, { props: { kind, status } }).text()

    expect(label('course', 'draft')).toBe('Draft')
    expect(label('course', 'published')).toBe('Published')
    expect(['not-started', 'in-progress', 'completed'].map((s) => label('learning', s))).toEqual(['Not started', 'In progress', 'Completed'])
    expect(['ACTIVE', 'PENDING', 'FAILED', 'EXPIRED', 'NONE'].map((s) => label('subscription', s))).toEqual(['Active', 'Payment pending', 'Payment failed', 'Expired', 'Not activated'])
    expect(label('workspace', 'ACTIVE')).toBe('Active')
    expect(label('workspace', 'EXPIRED')).toBe('Inactive')
  })

  it('every link and button on representative pages has an accessible name', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One'), aLesson('Two', 'video')])] })
    const pages = [
      await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes }),
      await openInstructorApp('/instructor/courses', { routes: { 'GET /api/courses': [courseRow({ _id: 'c1', name: 'Alpha', status: 'published' }), courseRow({ _id: 'c2', name: 'Beta' })] } }),
      await openStudentApp('/student/courses/course-1', { routes: standardCourse().backend.routes }),
    ]

    for (const { wrapper } of pages) {
      await flushPromises()
      await vi.waitFor(() => expect(wrapper.find('main h1').exists()).toBe(true))

      const unnamed = wrapper
        .findAll('a, button')
        .filter((el) => !(el.attributes('aria-label') || el.text().trim()))
        .map((el) => el.html().slice(0, 80))

      expect(unnamed).toEqual([])
    }
  })

  it('reorder controls form a labelled group with named buttons', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One'), aLesson('Two')])] })
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes })

    await waitForText(wrapper, 'Basics')

    const groups = wrapper.findAll('[role="group"][aria-label^="Reorder"]')

    expect(groups.map((g) => g.attributes('aria-label'))).toEqual(['Reorder section “Basics”', 'Reorder lesson “One”', 'Reorder lesson “Two”'])
    expect(wrapper.find('button[aria-label="Move lesson “One” up"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[aria-label="Move lesson “Two” down"]').attributes('disabled')).toBeDefined()
  })

  it('destructive dialogs share one shape: title, consequence, Cancel then the confirm action', async () => {
    const backend = makeCourseBackend({ sections: [aSection('Basics', [aLesson('One')])] })
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes })

    await waitForText(wrapper, 'Basics')

    for (const [trigger, confirm] of [['Delete section Basics', 'Delete section'], ['Delete lesson One', 'Delete lesson']]) {
      await click(wrapper, trigger)

      const dialog = wrapper.find('[role="dialog"]')

      expect(dialog.find('h2').text()).toContain(trigger.includes('section') ? 'Delete section' : 'Delete lesson')
      expect(dialog.find('[id$="-body"]').text().length).toBeGreaterThan(20)
      expect(dialog.findAll('button').map((b) => b.text())).toEqual(['Cancel', confirm])
      expect(document.activeElement.textContent.trim()).toBe('Cancel')
      expect(await audit(wrapper)).toEqual([])

      await dialog.findAll('button')[0].trigger('click')
    }
  })
})

describe('product identity', () => {
  it('shows the product name and tagline on public pages and sets the title', async () => {
    const { wrapper } = await openInstructorApp('/instructor', {})

    expect(wrapper.text()).toContain(APP_NAME)
    expect(APP_NAME).not.toBe('Lernly')
    expect(APP_TAGLINE.length).toBeGreaterThan(10)
  })

  it('has no leftover course-project footprint or placeholder text in the source', () => {
    const sources = import.meta.glob('/src/**/*.{vue,js,css}', { query: '?raw', import: 'default', eager: true })
    const banned = [/BWA|BuildWithAngga|Build With Angga/i, /lorem ipsum/i, /\bLernly\b/, /href="#"/, /Import from/i, /\bRewards\b/]
    const hits = []

    for (const [path, text] of Object.entries(sources)) {
      for (const pattern of banned) if (pattern.test(text)) hits.push(`${path}: ${pattern}`)
    }

    expect(hits).toEqual([])
  })

  it('users see "Instructor" and "Student", never the internal "manager" role', async () => {
    const instructorApp = await openInstructorApp('/instructor', { user: instructor('ACTIVE') })

    expect(instructorApp.wrapper.text()).toContain('Instructor')
    expect(instructorApp.wrapper.text().toLowerCase()).not.toContain('manager')

    const studentApp = await openStudentApp('/student', { user: student('ACTIVE') })

    expect(studentApp.wrapper.text()).toContain('Student')
    expect(studentApp.wrapper.text().toLowerCase()).not.toContain('manager')
  })
})

describe('design tokens and motion', () => {
  it('exposes the semantic tokens through Tailwind and defines their values once', () => {
    const colors = tailwindConfig.theme.extend.colors

    for (const name of ['primary', 'canvas', 'surface', 'line', 'ink', 'success', 'warning', 'danger', 'info']) expect(colors[name], name).toBeDefined()

    for (const variable of ['--c-primary', '--c-surface', '--c-surface-muted', '--c-line', '--c-ink', '--c-ink-muted', '--c-success', '--c-warning', '--c-danger']) {
      expect(styles).toContain(`${variable}:`)
    }

    expect(Object.keys(tailwindConfig.theme.extend.borderRadius)).toEqual(['control', 'card', 'overlay'])
    expect(Object.keys(tailwindConfig.theme.extend.boxShadow)).toEqual(['card', 'overlay'])
  })

  it('honours prefers-reduced-motion by removing animation and transition time', () => {
    const block = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'))

    expect(block).toContain('animation-duration: 0.01ms')
    expect(block).toContain('transition-duration: 0.01ms')
    expect(block).toContain('scroll-behavior: auto')
  })

  it('uses no arbitrary pixel widths or offsets in components', () => {
    const sources = import.meta.glob('/src/**/*.vue', { query: '?raw', import: 'default', eager: true })
    const hits = Object.entries(sources).flatMap(([path, text]) => (text.match(/\b(?:w|h|mt|mb|ml|mr|p[xytblr]?|rounded)-\[\d+px\]/g) ?? []).map((m) => `${path}: ${m}`))

    expect(hits).toEqual([])
  })
})

describe('accessibility of polished pages (axe, structural rules)', () => {
  it('billing in each subscription state', async () => {
    for (const status of ['NONE', 'PENDING', 'FAILED', 'EXPIRED', 'ACTIVE']) {
      const { wrapper } = await openInstructorApp('/instructor/billing', { user: instructor(status) })

      await waitForText(wrapper, 'Plan & Billing')
      expect(await audit(wrapper), status).toEqual([])
    }
  })

  it('profile pages and the payment result page', async () => {
    const a = await openInstructorApp('/instructor/profile', {})

    await waitForText(a.wrapper, 'Account details cannot be changed here yet.')
    expect(await audit(a.wrapper)).toEqual([])

    const b = await openStudentApp('/student/profile', {})

    await waitForText(b.wrapper, 'Account details cannot be changed here yet.')
    expect(await audit(b.wrapper)).toEqual([])
  })

  it('a visible toast does not introduce violations', async () => {
    const backend = makeCourseBackend()
    const { wrapper } = await openInstructorApp('/instructor/courses/course-1', { routes: backend.routes })

    await waitForText(wrapper, 'Start with a section')
    await wrapper.find('form input').setValue('Section One')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'Section added.')
    expect(await audit(wrapper)).toEqual([])
  })

  it('student pages with an error, an unavailable course and a completed lesson', async () => {
    const failing = await openStudentApp('/student/courses', { routes: { 'GET /api/students-courses': reply(500, { message: 'Broken' }) } })

    await waitForText(failing.wrapper, 'We could not load your courses')
    expect(failing.wrapper.text()).toContain('The server had a problem')
    expect(await audit(failing.wrapper)).toEqual([])

    const sections = [sectionOf('Basics', [textLesson('One'), textLesson('Two')])]
    const backend = makeLearningBackend({ sections, completed: [sections[0].lessons[0]._id] })
    const done = await openStudentApp(`/student/courses/course-1/lessons/${sections[0].lessons[0]._id}`, { routes: backend.routes })

    await waitForText(done.wrapper, 'Mark as incomplete')
    expect(await audit(done.wrapper)).toEqual([])
    await waitForRoute(done.router, R.STUDENT_LESSON)
  })
})
