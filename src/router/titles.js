import { R } from '@/constants/routes.js'

// The document title per route (shown in the browser tab and announced by screen readers when
// the page changes). Pages whose real title depends on data (a course name) keep the generic
// title here: the visible <h1> carries the specific one.
export const ROUTE_TITLES = Object.freeze({
  [R.HOME]: 'Welcome',
  [R.INSTRUCTOR_SIGN_IN]: 'Instructor sign in',
  [R.STUDENT_SIGN_IN]: 'Student sign in',
  [R.REGISTER]: 'Register your organization',
  [R.PAYMENT_RESULT]: 'Payment confirmation',
  [R.UNAVAILABLE]: 'Cannot reach the server',
  [R.FORBIDDEN]: 'No access',
  [R.NOT_FOUND]: 'Page not found',
  [R.CERTIFICATE_VERIFY]: 'Certificate verification',
  [R.CERTIFICATE_LOOKUP]: 'Verify a certificate',

  [R.INSTRUCTOR_DASHBOARD]: 'Dashboard',
  [R.INSTRUCTOR_COURSES]: 'Courses',
  [R.INSTRUCTOR_COURSE_NEW]: 'New course',
  [R.INSTRUCTOR_COURSE]: 'Course content',
  [R.INSTRUCTOR_COURSE_SETTINGS]: 'Course settings',
  [R.INSTRUCTOR_COURSE_QUIZ]: 'Final quiz',
  [R.INSTRUCTOR_COURSE_LEARNERS]: 'Course learners',
  [R.INSTRUCTOR_COURSE_PROGRESS]: 'Learner progress',
  [R.INSTRUCTOR_LESSON_NEW]: 'New lesson',
  [R.INSTRUCTOR_LESSON_EDIT]: 'Edit lesson',
  [R.INSTRUCTOR_STUDENTS]: 'Students',
  [R.INSTRUCTOR_STUDENT_NEW]: 'Add student',
  [R.INSTRUCTOR_STUDENT_EDIT]: 'Edit student',
  [R.INSTRUCTOR_BILLING]: 'Plan & Billing',
  [R.INSTRUCTOR_PROFILE]: 'Profile',

  [R.STUDENT_DASHBOARD]: 'Dashboard',
  [R.STUDENT_COURSES]: 'My Courses',
  [R.STUDENT_COURSE]: 'Course',
  [R.STUDENT_LESSON]: 'Lesson',
  [R.STUDENT_QUIZ]: 'Final quiz',
  [R.STUDENT_CERTIFICATES]: 'Certificates',
  [R.STUDENT_CERTIFICATE]: 'Certificate',
  [R.STUDENT_WORKSPACE_INACTIVE]: 'Learning is paused',
  [R.STUDENT_PROFILE]: 'Profile',
})
