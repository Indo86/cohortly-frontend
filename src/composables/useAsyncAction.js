import { ref } from 'vue'
import { normalizeError } from '@/services/apiError.js'

// Wraps a user-triggered async action (submit, pay, refresh) with pending and error
// state, so every form handles loading and failure the same way.
//   const { pending, error, run } = useAsyncAction(fn)
//   const result = await run(...args)   -> { ok: true, data } | { ok: false, error }
export const useAsyncAction = (fn) => {
  const pending = ref(false)
  const error = ref(null)

  const run = async (...args) => {
    if (pending.value) return { ok: false, error: null } // ignore double submits

    pending.value = true
    error.value = null

    try {
      return { ok: true, data: await fn(...args) }
    } catch (caught) {
      error.value = normalizeError(caught)

      return { ok: false, error: error.value }
    } finally {
      pending.value = false
    }
  }

  return { pending, error, run }
}
