import { R } from './routes.js'

// Sidebar items. Only pages that exist are listed. `requiresActive` items are hidden
// while the workspace is not ACTIVE (the router would send the user to the
// billing / inactive page anyway), so nothing in the menu is a dead end.
// `exact` marks entries whose path is a prefix of the other pages of the area.
export const instructorNav = Object.freeze([
  { label: 'Dashboard', icon: 'dashboard', to: { name: R.INSTRUCTOR_DASHBOARD }, requiresActive: true, exact: true },
  { label: 'Courses', icon: 'courses', to: { name: R.INSTRUCTOR_COURSES }, requiresActive: true },
  { label: 'Students', icon: 'students', to: { name: R.INSTRUCTOR_STUDENTS }, requiresActive: true },
  { label: 'Plan & Billing', icon: 'billing', to: { name: R.INSTRUCTOR_BILLING }, requiresActive: false },
  { label: 'Profile', icon: 'profile', to: { name: R.INSTRUCTOR_PROFILE }, requiresActive: false },
])

export const studentNav = Object.freeze([
  { label: 'Dashboard', icon: 'dashboard', to: { name: R.STUDENT_DASHBOARD }, requiresActive: true, exact: true },
  { label: 'My Courses', icon: 'courses', to: { name: R.STUDENT_COURSES }, requiresActive: true },
  // issued certificates are history, so this entry stays visible while the workspace is inactive
  { label: 'Certificates', icon: 'certificate', to: { name: R.STUDENT_CERTIFICATES }, requiresActive: false },
  { label: 'Profile', icon: 'profile', to: { name: R.STUDENT_PROFILE }, requiresActive: false },
])
