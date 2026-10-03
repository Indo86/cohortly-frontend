// Route names are the only way application code refers to a route.
export const R = Object.freeze({
  HOME: 'home',
  INSTRUCTOR_SIGN_IN: 'instructor-sign-in',
  STUDENT_SIGN_IN: 'student-sign-in',
  REGISTER: 'register',
  PAYMENT_RESULT: 'payment-result',
  UNAVAILABLE: 'unavailable',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not-found',
  CERTIFICATE_VERIFY: 'certificate-verify', // public: /certificates/verify/:certificateNumber
  CERTIFICATE_LOOKUP: 'certificate-lookup', // public: /certificates/verify

  INSTRUCTOR_DASHBOARD: 'instructor-dashboard',
  INSTRUCTOR_COURSES: 'instructor-courses',
  INSTRUCTOR_COURSE_NEW: 'instructor-course-new',
  INSTRUCTOR_COURSE: 'instructor-course', // content: sections and lessons
  INSTRUCTOR_COURSE_SETTINGS: 'instructor-course-settings',
  INSTRUCTOR_COURSE_QUIZ: 'instructor-course-quiz',
  INSTRUCTOR_COURSE_LEARNERS: 'instructor-course-learners',
  INSTRUCTOR_COURSE_PROGRESS: 'instructor-course-progress',
  INSTRUCTOR_LESSON_NEW: 'instructor-lesson-new',
  INSTRUCTOR_LESSON_EDIT: 'instructor-lesson-edit',
  INSTRUCTOR_STUDENTS: 'instructor-students',
  INSTRUCTOR_STUDENT_NEW: 'instructor-student-new',
  INSTRUCTOR_STUDENT_EDIT: 'instructor-student-edit',
  INSTRUCTOR_BILLING: 'instructor-billing',
  INSTRUCTOR_PROFILE: 'instructor-profile',

  STUDENT_DASHBOARD: 'student-dashboard',
  STUDENT_COURSES: 'student-courses',
  STUDENT_WORKSPACE_INACTIVE: 'student-workspace-inactive',
  STUDENT_COURSE: 'student-course',
  STUDENT_LESSON: 'student-lesson',
  STUDENT_QUIZ: 'student-quiz',
  STUDENT_CERTIFICATES: 'student-certificates',
  STUDENT_CERTIFICATE: 'student-certificate',
  STUDENT_PROFILE: 'student-profile',
})
