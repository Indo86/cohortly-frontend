// Required frontend configuration. Returns a list of problems (empty = fine); main.js
// shows them on screen instead of mounting a broken app.
export const configProblems = (env = import.meta.env) => {
  const problems = []
  const apiUrl = env.VITE_API_URL

  if (!apiUrl) {
    problems.push('VITE_API_URL is not set. Copy .env.example to .env and set the backend URL.')
  } else {
    try {
      const url = new URL(apiUrl)

      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol')
    } catch {
      problems.push('VITE_API_URL must be a full http(s) URL such as http://localhost:3000.')
    }
  }

  return problems
}
