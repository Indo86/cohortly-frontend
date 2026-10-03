// Leaves the SPA for an external page (the hosted Midtrans payment). Isolated so tests
// can replace it.
export const redirectExternal = (url) => {
  window.location.assign(url)
}

// Only http(s) URLs are ever followed to an external page.
export const isSafeExternalUrl = (value) => {
  try {
    const url = new URL(value)

    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

// A `?redirect=` value is only honoured when it is an in-app path, never another site.
export const safeInternalPath = (value) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null
