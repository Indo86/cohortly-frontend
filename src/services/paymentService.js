import { api } from './http.js'

// Starts (or reuses) a hosted payment for one more subscription period. Instructor only.
// Returns { midtrans_payment_url, purpose: 'activation' | 'renewal', reused,
//           accessStatus, accessExpiresAt }.
export const createCheckout = async () => {
  const response = await api.post('/api/payment/checkout')

  return response.data.data
}
