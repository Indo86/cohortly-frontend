import { AxiosError } from 'axios'
import { api } from '@/services/http.js'

// An in-memory stand-in for the backend, installed at the Axios adapter level: the real
// services, interceptors, URLs and request bodies all run, only the network is replaced.
//
//   const fake = fakeApi({ 'GET /api/courses': [ ... ], 'POST /api/courses': (call) => ({ _id: 'c1' }) })
//   fake.calls                       every request made (method, url, body, params)
//   fake.set('GET /api/x', value)    change an answer mid-test
//   a handler returns data (sent as { message, data } with 200) or reply(status, body)
const originalAdapter = api.defaults.adapter

export class Reply {
  constructor(status, body) {
    this.status = status
    this.body = body
  }
}

export const reply = (status, body = {}) => new Reply(status, body)

export const emptyBackend = () => ({
  'GET /api/overviews': {
    totalCourses: 0,
    publishedCourses: 0,
    totalStudents: 0,
    totalVideos: 0,
    totalTexts: 0,
    courses: [],
    students: [],
  },
  'GET /api/courses': [],
  'GET /api/students': [],
  'GET /api/categories': [],
  'GET /api/students-courses': [],
  'GET /api/my-certificates': [],
  // AI is optional and OFF unless a test turns it on
  'GET /api/ai/status': { enabled: false, available: false, provider: null },
})

const compile = (pattern) => {
  const [method, path] = pattern.split(' ')
  const names = []
  const source = path.replace(/:[A-Za-z]+/g, (match) => {
    names.push(match.slice(1))

    return '([^/?]+)'
  })

  return { method, regex: new RegExp(`^${source}$`), names }
}

export const formToObject = (form) => (form instanceof FormData ? Object.fromEntries(form.entries()) : form)

export const fakeApi = (routes = {}) => {
  const table = new Map(Object.entries({ ...emptyBackend(), ...routes }))
  const calls = []

  api.defaults.adapter = async (config) => {
    const method = config.method.toUpperCase()
    const url = config.url.split('?')[0]
    let body = config.data

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        // keep the raw string
      }
    }

    const call = { method, url, body, form: formToObject(body), params: config.params, config }

    calls.push(call)

    let answer

    for (const [pattern, handler] of table) {
      const { method: m, regex, names } = compile(pattern)
      const match = m === method && regex.exec(url)

      if (match) {
        call.params = Object.fromEntries(names.map((name, index) => [name, match[index + 1]]))
        answer = typeof handler === 'function' ? await handler(call) : handler

        break
      }
    }

    const result = answer === undefined ? reply(404, { message: `No fake route for ${method} ${url}` }) : answer
    const response = result instanceof Reply ? result : reply(200, { message: 'ok', data: result })

    if (response.status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
        status: response.status,
        data: response.body,
        headers: {},
        config,
        statusText: '',
      })
    }

    return { data: response.body, status: response.status, statusText: 'OK', headers: {}, config }
  }

  return {
    calls,
    set: (pattern, handler) => table.set(pattern, handler),
    callsTo: (pattern) => {
      const { method, regex } = compile(pattern)

      return calls.filter((call) => call.method === method && regex.test(call.url))
    },
  }
}

export const restoreApi = () => {
  api.defaults.adapter = originalAdapter
}
