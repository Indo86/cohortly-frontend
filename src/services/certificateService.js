import { api } from './http.js'

// Certificates (M8 backend). Two audiences:
//  - the signed-in student: their own certificates. These endpoints have NO active-workspace gate
//    (an issued certificate is history, not learning content), so they keep working while the
//    instructor's subscription is inactive.
//  - anyone: public verification, which returns only what is printed on the certificate.

// [{ certificateNumber, studentName, courseName, instructorName, totalLessons, finalScore, issuedAt, course }]
export const getMyCertificates = async () => (await api.get('/api/my-certificates')).data.data

export const getMyCertificate = async (certificateNumber) =>
  (await api.get(`/api/my-certificates/${encodeURIComponent(certificateNumber)}`)).data.data

// { valid: true, certificateNumber, studentName, courseName, instructorName, issuedAt }; an unknown
// number is a 404 (ApiError kind NOT_FOUND).
export const verifyCertificate = async (certificateNumber) =>
  (await api.get(`/api/certificates/verify/${encodeURIComponent(certificateNumber)}`)).data.data
