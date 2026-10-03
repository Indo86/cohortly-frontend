import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { R } from '@/constants/routes.js'
import { studentRow } from './data.js'
import { reply } from './fakeApi.js'
import { click, dialog, openInstructorApp, waitForGone, waitForRoute, waitForText } from './instructorApp.js'

const avatar = () => new File(['x'], 'me.png', { type: 'image/png' })

const pickFile = async (wrapper, file) => {
  const input = wrapper.find('input[type="file"]')

  Object.defineProperty(input.element, 'files', { value: file ? [file] : [], configurable: true })
  await input.trigger('change')
}

describe('student list', () => {
  const students = () => [
    studentRow({ _id: 's1', name: 'Ada Lovelace', courses: ['c1', 'c2'] }),
    studentRow({ _id: 's2', name: 'Grace Hopper', courses: [] }),
  ]

  it('lists the instructor’s students with real enrollment counts', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students', { routes: { 'GET /api/students': students() } })

    await waitForText(wrapper, 'Grace Hopper')

    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('Enrolled in 2 courses')
    expect(wrapper.text()).toContain('Enrolled in 0 courses')
    expect(wrapper.find('a[aria-label="Edit Ada Lovelace"]').attributes('href')).toBe('/instructor/students/s1/edit')
  })

  it('shows an empty state with the first step', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students')

    await waitForText(wrapper, 'You have no students yet')

    expect(wrapper.find('main a[href="/instructor/students/new"]').exists()).toBe(true)
  })

  it('shows an error state with retry', async () => {
    const { wrapper, fake } = await openInstructorApp('/instructor/students', {
      routes: { 'GET /api/students': reply(500, { message: 'x' }) },
    })

    await waitForText(wrapper, 'The server had a problem')

    fake.set('GET /api/students', students())
    await click(wrapper, 'Try again')
    await waitForText(wrapper, 'Grace Hopper')
  })

  it('deletes only after confirmation that mentions enrollments and progress', async () => {
    let list = students()
    const { wrapper, fake } = await openInstructorApp('/instructor/students', {
      routes: {
        'GET /api/students': () => list,
        'DELETE /api/students/:id': (call) => {
          list = list.filter((s) => s._id !== call.params.id)

          return {}
        },
      },
    })

    await waitForText(wrapper, 'Ada Lovelace')
    await click(wrapper, 'Delete Ada Lovelace')

    expect(dialog(wrapper).text()).toContain('enrollments')
    expect(dialog(wrapper).text()).toContain('progress')
    expect(fake.callsTo('DELETE /api/students/:id')).toHaveLength(0)

    await click(dialog(wrapper), 'Delete student')
    await waitForGone(wrapper, 'Ada Lovelace')

    expect(fake.callsTo('DELETE /api/students/:id')[0].url).toBe('/api/students/s1')
    expect(wrapper.text()).toContain('Grace Hopper')
  })
})

describe('create student', () => {
  const fill = async (wrapper, { withAvatar = true, email = 'new@test.dev' } = {}) => {
    const [name, mail] = wrapper.findAll('input:not([type="file"]):not([type="password"])')

    await name.setValue('New Student')
    await mail.setValue(email)
    await wrapper.find('input[type="password"]').setValue('secret-pass')
    if (withAvatar) await pickFile(wrapper, avatar())
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
  }

  it('sends a multipart body with name, email, password and avatar, then returns to the list', async () => {
    const { wrapper, fake, router } = await openInstructorApp('/instructor/students/new', {
      routes: { 'POST /api/students': {} },
    })

    await waitForText(wrapper, 'Add student')
    await fill(wrapper)
    await waitForRoute(router, R.INSTRUCTOR_STUDENTS)

    const sent = fake.callsTo('POST /api/students')[0]

    expect(sent.body).toBeInstanceOf(FormData)
    expect(sent.form).toMatchObject({ name: 'New Student', email: 'new@test.dev', password: 'secret-pass' })
    expect(sent.form.avatar).toBeInstanceOf(File)
  })

  it('requires an avatar and validates locally', async () => {
    const { wrapper, fake } = await openInstructorApp('/instructor/students/new')

    await waitForText(wrapper, 'Add student')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Enter a name of at least 5 characters.')
    expect(wrapper.text()).toContain('Enter a valid email address.')
    expect(wrapper.text()).toContain('Use a password of 5 to 72 characters.')
    expect(wrapper.text()).toContain('Choose an avatar image.')
    expect(fake.callsTo('POST /api/students')).toHaveLength(0)
  })

  it('rejects an avatar that is not an image or is too large, before uploading', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students/new')

    await waitForText(wrapper, 'Add student')

    await pickFile(wrapper, new File(['x'], 'doc.pdf', { type: 'application/pdf' }))
    expect(wrapper.text()).toContain('Choose a JPEG or PNG image.')

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })

    await pickFile(wrapper, big)
    expect(wrapper.text()).toContain('The image must be 2 MB or smaller.')
  })

  it('shows the duplicate-email conflict on the email field', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students/new', {
      routes: { 'POST /api/students': reply(409, { message: 'Email is already registered', code: 'EMAIL_EXISTS' }) },
    })

    await waitForText(wrapper, 'Add student')
    await fill(wrapper)

    const email = wrapper.findAll('input')[1]

    expect(email.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('A user with this email already exists.')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('shows backend upload / validation errors without exposing internals', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students/new', {
      routes: { 'POST /api/students': reply(400, { message: 'Only JPEG and PNG images are allowed' }) },
    })

    await waitForText(wrapper, 'Add student')
    await fill(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toBe('Only JPEG and PNG images are allowed')
  })
})

describe('edit student', () => {
  const routes = (extra = {}) => ({
    'GET /api/students/:id': { _id: 's1', name: 'Ada Lovelace', email: 'ada@test.dev' },
    'GET /api/students': [studentRow({ _id: 's1', name: 'Ada Lovelace', photo_url: 'http://api.test/uploads/students/ada.png' })],
    'PUT /api/students/:id': {},
    ...extra,
  })

  const textInputs = (wrapper) => wrapper.findAll('input:not([type="file"]):not([type="password"])')

  it('pre-fills name and email, shows the current avatar, and explains the password field', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students/s1/edit', { routes: routes() })

    await waitForText(wrapper, 'Edit student')
    await waitForText(wrapper, 'Leave empty to keep the current password.')

    expect(textInputs(wrapper)[0].element.value).toBe('Ada Lovelace')
    expect(textInputs(wrapper)[1].element.value).toBe('ada@test.dev')
    await waitForText(wrapper, 'Leave empty to keep the current avatar.')
    expect(wrapper.find('img[alt="Current image"]').attributes('src')).toContain('ada.png')
  })

  it('OMITS the password when it is left blank (never "undefined" or "null")', async () => {
    const { wrapper, fake, router } = await openInstructorApp('/instructor/students/s1/edit', { routes: routes() })

    await waitForText(wrapper, 'Edit student')
    await textInputs(wrapper)[0].setValue('Ada King')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForRoute(router, R.INSTRUCTOR_STUDENTS)

    const sent = fake.callsTo('PUT /api/students/:id')[0]

    expect(sent.url).toBe('/api/students/s1')
    expect(Object.keys(sent.form).sort()).toEqual(['email', 'name'])
    expect(sent.form).not.toHaveProperty('password')
    expect(sent.form).not.toHaveProperty('avatar')
    expect([...sent.body.values()]).not.toContain('undefined')
    expect([...sent.body.values()]).not.toContain('null')
  })

  it('sends the password only when a new one was typed', async () => {
    const { wrapper, fake, router } = await openInstructorApp('/instructor/students/s1/edit', { routes: routes() })

    await waitForText(wrapper, 'Edit student')
    await wrapper.find('input[type="password"]').setValue('brand-new-pass')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForRoute(router, R.INSTRUCTOR_STUDENTS)

    expect(fake.callsTo('PUT /api/students/:id')[0].form).toMatchObject({ name: 'Ada Lovelace', email: 'ada@test.dev', password: 'brand-new-pass' })
  })

  it('rejects a typed password that is too short instead of silently ignoring it', async () => {
    const { wrapper, fake } = await openInstructorApp('/instructor/students/s1/edit', { routes: routes() })

    await waitForText(wrapper, 'Edit student')
    await wrapper.find('input[type="password"]').setValue('abc')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Use a password of 5 to 72 characters.')
    expect(fake.callsTo('PUT /api/students/:id')).toHaveLength(0)
  })

  it('sends a replacement avatar when one is chosen', async () => {
    const { wrapper, fake, router } = await openInstructorApp('/instructor/students/s1/edit', { routes: routes() })

    await waitForText(wrapper, 'Edit student')
    await pickFile(wrapper, avatar())
    await wrapper.find('form').trigger('submit.prevent')
    await waitForRoute(router, R.INSTRUCTOR_STUDENTS)

    expect(fake.callsTo('PUT /api/students/:id')[0].form.avatar).toBeInstanceOf(File)
  })

  it('shows a duplicate email error on the email field', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students/s1/edit', {
      routes: routes({ 'PUT /api/students/:id': reply(409, { message: 'Email is already registered', code: 'EMAIL_EXISTS' }) }),
    })

    await waitForText(wrapper, 'Edit student')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForText(wrapper, 'A user with this email already exists.')
  })

  it('shows not found for a student that is not yours', async () => {
    const { wrapper } = await openInstructorApp('/instructor/students/nope/edit', {
      routes: routes({ 'GET /api/students/:id': reply(404, { message: 'Student not found' }) }),
    })

    await waitForText(wrapper, 'Not found')
  })
})
