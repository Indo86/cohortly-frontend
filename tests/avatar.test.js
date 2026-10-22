import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { openInstructorApp, waitForText } from './instructorApp.js'
import { openStudentApp } from './studentApp.js'

// The signed-in user's own profile photo (PUT /api/me/avatar), for both roles.
const PHOTO = 'http://api.test/uploads/students/avatar-1.png'

const pickFile = async (wrapper, file) => {
  const input = wrapper.find('input[type="file"]')

  Object.defineProperty(input.element, 'files', { value: file ? [file] : [], configurable: true })
  await input.trigger('change')
}

const openProfile = (as) =>
  as === 'student'
    ? openStudentApp('/student/profile', { routes: { 'PUT /api/me/avatar': { photo_url: PHOTO } } })
    : openInstructorApp('/instructor/profile', { routes: { 'PUT /api/me/avatar': { photo_url: PHOTO } } })

describe.each(['instructor', 'student'])('profile photo (%s)', (as) => {
  it('offers no save button until a file is chosen, then uploads it and shows it', async () => {
    const { wrapper, fake, auth } = await openProfile(as)

    await waitForText(wrapper, 'Profile photo')
    expect(wrapper.text()).not.toContain('Save photo')

    await pickFile(wrapper, new File(['x'], 'me.png', { type: 'image/png' }))
    await waitForText(wrapper, 'Save photo')

    await wrapper.findAll('form')[0].trigger('submit.prevent')
    await flushPromises()

    const sent = fake.callsTo('PUT /api/me/avatar')[0]

    expect(sent.body).toBeInstanceOf(FormData)
    expect(sent.form.avatar).toBeInstanceOf(File)
    expect(auth.user.photoUrl).toBe(PHOTO)
    await waitForText(wrapper, 'Profile photo updated.')
  })

  it('refuses a file that is not a JPEG or PNG before uploading', async () => {
    const { wrapper, fake } = await openProfile(as)

    await waitForText(wrapper, 'Profile photo')
    await pickFile(wrapper, new File(['x'], 'doc.pdf', { type: 'application/pdf' }))

    expect(wrapper.text()).toContain('Choose a JPEG or PNG image.')
    expect(fake.callsTo('PUT /api/me/avatar')).toHaveLength(0)
  })
})
