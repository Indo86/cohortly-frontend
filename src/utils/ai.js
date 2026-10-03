import { ErrorKind, fieldErrors } from '@/services/apiError.js'

// What the user is told when an AI tool fails. The backend answers with a stable `code` and a safe
// message; the wording here is the product's. Provider names, quota details and raw errors are never shown.
export const AI_COPY = Object.freeze({
  AI_DISABLED: 'AI study tools are turned off.',
  AI_NOT_CONFIGURED: 'AI study tools are temporarily unavailable.',
  AI_PROVIDER_UNAVAILABLE: 'AI study tools are temporarily unavailable.',
  AI_RATE_LIMITED: 'AI study tools have reached their current usage limit. Try again later.',
  AI_RESPONSE_INVALID: 'The AI could not produce a usable result this time. Please try again.',
  AI_CONTEXT_TOO_LARGE: 'This content is too large for AI study tools.',
})

export const aiErrorMessage = (error) => {
  if (error?.code === 'AI_NO_TEXT_CONTEXT') return error.message // the backend says exactly what is missing

  if (AI_COPY[error?.code]) return AI_COPY[error.code]

  if (error?.kind === ErrorKind.VALIDATION) {
    const first = Object.values(fieldErrors(error))[0]

    return first ?? error.message
  }

  if (error?.kind === ErrorKind.NETWORK) return error.message

  return 'AI study tools could not be used right now. Please try again later.'
}
