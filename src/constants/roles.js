// Product roles. The backend still persists the instructor role as "manager";
// that raw value is translated here and nowhere else.
export const Roles = Object.freeze({
  INSTRUCTOR: 'INSTRUCTOR',
  STUDENT: 'STUDENT',
})

const FROM_BACKEND = Object.freeze({
  manager: Roles.INSTRUCTOR,
  student: Roles.STUDENT,
})

// Backend role value -> product role, or null for anything unknown (fail closed).
export const normalizeRole = (rawRole) => FROM_BACKEND[rawRole] ?? null

export const ROLE_LABELS = Object.freeze({
  [Roles.INSTRUCTOR]: 'Instructor',
  [Roles.STUDENT]: 'Student',
})
