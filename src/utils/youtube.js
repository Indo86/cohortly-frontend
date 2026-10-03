// Video lessons store a YouTube video id. Instructors usually have a link, so a pasted
// watch / short / embed URL is reduced to its id; anything else is returned as typed and
// the backend (which accepts [A-Za-z0-9_-], 4-64 characters) has the final say.
export const parseYoutubeId = (input) => {
  const value = (input ?? '').trim()

  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? ''

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.searchParams.get('v')) return url.searchParams.get('v')

      const [kind, id] = url.pathname.split('/').filter(Boolean)

      if (['embed', 'shorts', 'live'].includes(kind) && id) return id
    }
  } catch {
    // not a URL: treat it as an id
  }

  return value
}
