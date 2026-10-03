import { describe, expect, it } from 'vitest'
import { studentForm } from '@/services/studentService.js'
import { lessonPayload } from '@/services/lessonService.js'
import { queryKeys } from '@/services/queryKeys.js'
import { parseYoutubeId } from '@/utils/youtube.js'

describe('parseYoutubeId', () => {
  it.each([
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('%s -> %s', (input, id) => {
    expect(parseYoutubeId(input)).toBe(id)
  })

  it('leaves other input untouched for the backend to judge', () => {
    expect(parseYoutubeId('not a url or id!')).toBe('not a url or id!')
    expect(parseYoutubeId('https://example.com/watch?v=abc')).toBe('https://example.com/watch?v=abc')
    expect(parseYoutubeId('')).toBe('')
    expect(parseYoutubeId(undefined)).toBe('')
  })
})

describe('studentForm (the multipart body)', () => {
  const entries = (form) => Object.fromEntries(form.entries())

  it('leaves the password out when it is empty, so the backend keeps the current one', () => {
    const body = entries(studentForm({ name: 'Ada Lovelace', email: 'ada@test.dev', password: '', avatar: null }))

    expect(Object.keys(body).sort()).toEqual(['email', 'name'])
  })

  it.each([undefined, null, ''])('never sends "undefined" or "null" strings (password = %s)', (password) => {
    const values = [...studentForm({ name: 'Ada Lovelace', email: 'ada@test.dev', password, avatar: undefined }).values()]

    expect(values).toEqual(['Ada Lovelace', 'ada@test.dev'])
  })

  it('includes the password and avatar only when given', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const body = entries(studentForm({ name: 'Ada Lovelace', email: 'ada@test.dev', password: 'secret1', avatar: file }))

    expect(body.password).toBe('secret1')
    expect(body.avatar).toBeInstanceOf(File)
  })
})

describe('lessonPayload', () => {
  it('sends only the field of the chosen type', () => {
    expect(lessonPayload({ title: 'T', type: 'text', text: '<p>x</p>', youtubeId: 'leftover' })).toEqual({ title: 'T', type: 'text', text: '<p>x</p>' })
    expect(lessonPayload({ title: 'T', type: 'video', text: 'leftover', youtubeId: 'abcd1234' })).toEqual({ title: 'T', type: 'video', youtubeId: 'abcd1234' })
  })
})

describe('query keys', () => {
  it('are hierarchical so a course key covers its learners and progress', () => {
    expect(queryKeys.courseProgress('c1').slice(0, 3)).toEqual(queryKeys.course('c1'))
    expect(queryKeys.courseStudents('c1').slice(0, 3)).toEqual(queryKeys.course('c1'))
  })

  it('keep the course list separate from a single course', () => {
    expect(queryKeys.courses).not.toEqual(queryKeys.course('x').slice(0, 2))
  })

  it('are distinct per course', () => {
    expect(queryKeys.course('a')).not.toEqual(queryKeys.course('b'))
  })
})
