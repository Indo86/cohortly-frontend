// Dates arrive from the backend as ISO strings (or null).
export const formatDateTime = (value) => {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

// A calendar date such as "3 October 2026" (certificates show the day, not the time).
export const formatDate = (value) => {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date)
}
