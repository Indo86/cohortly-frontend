import { api } from './http.js'

// Sign-in answers 200 with a token even when the workspace is inactive. The response
// carries the identity, the raw backend role and the entitlement fields.
// A 401 here means wrong credentials, so it must not trigger the global session policy.
export const signIn = async ({ email, password }) => {
  const response = await api.post('/api/sign-in', { email, password }, { skipAuthHandling: true })

  return response.data.data
}

// Instructor registration. Returns { midtrans_payment_url }: the hosted Midtrans page.
export const signUp = async ({ name, email, password }) => {
  const response = await api.post('/api/sign-up', { name, email, password }, { skipAuthHandling: true })

  return response.data.data
}

// The current identity and entitlement. The backend is authoritative.
export const fetchMe = async () => {
  const response = await api.get('/api/me')

  return response.data.data
}

// The signed-in user's own password. The account is the one of the current token (no user id is sent).
// On success every existing token stops working, including the current one: the caller signs out.
export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await api.put('/api/me/password', { currentPassword, newPassword })

  return response.data
}
