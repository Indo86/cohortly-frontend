import { reactive } from 'vue'

// Lightweight success feedback ("Course saved"), shown by <ToastRegion> in the app shell. A
// toast is for a CONFIRMATION that needs no action. Errors, warnings and anything the user
// must read stay inline (InlineAlert). Toasts disappear by themselves after a few seconds,
// can be dismissed, and are announced politely to screen readers.
const DURATION_MS = 5000

export const toasts = reactive([])

let nextId = 1

export const dismissToast = (id) => {
  const index = toasts.findIndex((toast) => toast.id === id)

  if (index !== -1) toasts.splice(index, 1)
}

export const notify = (message) => {
  const id = nextId++

  // the same message twice in a row is shown once
  if (toasts.some((toast) => toast.message === message)) return id

  toasts.push({ id, message })
  setTimeout(() => dismissToast(id), DURATION_MS)

  return id
}

export const clearToasts = () => toasts.splice(0, toasts.length)
