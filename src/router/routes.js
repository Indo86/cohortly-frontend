import { R } from '@/constants/routes.js'
import { Roles } from '@/constants/roles.js'
import AuthLayout from '@/layouts/AuthLayout.vue'
import InstructorLayout from '@/layouts/InstructorLayout.vue'
import StudentLayout from '@/layouts/StudentLayout.vue'

// Pages are loaded on demand. Access rules live in `meta` (see router/guards.js), never
// inside pages.
export const routes = [
  // the public landing page has its own full-width layout (it is not an auth card)
  { path: '/', name: R.HOME, component: () => import('@/pages/LandingPage.vue') },
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: 'instructor/sign-in',
        name: R.INSTRUCTOR_SIGN_IN,
        component: () => import('@/pages/auth/SignInPage.vue'),
        props: { role: Roles.INSTRUCTOR },
        meta: { guestOnly: true },
      },
      {
        path: 'student/sign-in',
        name: R.STUDENT_SIGN_IN,
        component: () => import('@/pages/auth/SignInPage.vue'),
        props: { role: Roles.STUDENT },
        meta: { guestOnly: true },
      },
      {
        path: 'register',
        name: R.REGISTER,
        component: () => import('@/pages/auth/RegisterPage.vue'),
        meta: { guestOnly: true },
      },
      // Midtrans sends the browser here after the hosted payment (set by the backend).
      {
        path: 'success-checkout',
        name: R.PAYMENT_RESULT,
        component: () => import('@/pages/access/PaymentResultPage.vue'),
      },
      // PUBLIC: anyone can check a certificate number (no session, no entitlement)
      { path: 'certificates/verify', name: R.CERTIFICATE_LOOKUP, component: () => import('@/pages/access/VerifyLookupPage.vue') },
      {
        path: 'certificates/verify/:certificateNumber',
        name: R.CERTIFICATE_VERIFY,
        component: () => import('@/pages/access/VerifyCertificatePage.vue'),
        props: true,
      },
      { path: 'unavailable', name: R.UNAVAILABLE, component: () => import('@/pages/access/UnavailablePage.vue') },
      { path: 'forbidden', name: R.FORBIDDEN, component: () => import('@/pages/access/ForbiddenPage.vue') },
    ],
  },

  {
    path: '/instructor',
    component: InstructorLayout,
    meta: { requiresAuth: true, role: Roles.INSTRUCTOR },
    children: [
      {
        path: '',
        name: R.INSTRUCTOR_DASHBOARD,
        component: () => import('@/pages/instructor/DashboardPage.vue'),
        meta: { requiresActiveAccess: true },
      },
      {
        path: 'courses',
        name: R.INSTRUCTOR_COURSES,
        component: () => import('@/pages/instructor/CoursesPage.vue'),
        meta: { requiresActiveAccess: true },
      },
      {
        path: 'courses/new',
        name: R.INSTRUCTOR_COURSE_NEW,
        component: () => import('@/pages/instructor/course/CourseCreatePage.vue'),
        meta: { requiresActiveAccess: true },
      },
      // One course, split into sub-pages under a shared header (name, status, publish, tabs)
      {
        path: 'courses/:courseId',
        component: () => import('@/pages/instructor/course/CourseLayout.vue'),
        props: true,
        meta: { requiresActiveAccess: true },
        children: [
          {
            path: '',
            name: R.INSTRUCTOR_COURSE,
            meta: { tab: true }, // the course tabs: switching them keeps focus on the tab list
            component: () => import('@/pages/instructor/course/CourseContentPage.vue'),
          },
          {
            path: 'settings',
            name: R.INSTRUCTOR_COURSE_SETTINGS,
            meta: { tab: true }, // the course tabs: switching them keeps focus on the tab list
            component: () => import('@/pages/instructor/course/CourseSettingsPage.vue'),
          },
          {
            path: 'quiz',
            name: R.INSTRUCTOR_COURSE_QUIZ,
            meta: { tab: true }, // a course tab
            component: () => import('@/pages/instructor/course/CourseQuizPage.vue'),
          },
          {
            path: 'learners',
            name: R.INSTRUCTOR_COURSE_LEARNERS,
            meta: { tab: true }, // the course tabs: switching them keeps focus on the tab list
            component: () => import('@/pages/instructor/course/CourseLearnersPage.vue'),
          },
          {
            path: 'progress',
            name: R.INSTRUCTOR_COURSE_PROGRESS,
            meta: { tab: true }, // the course tabs: switching them keeps focus on the tab list
            component: () => import('@/pages/instructor/course/CourseProgressPage.vue'),
          },
          {
            path: 'sections/:sectionId/lessons/new',
            name: R.INSTRUCTOR_LESSON_NEW,
            component: () => import('@/pages/instructor/course/LessonFormPage.vue'),
          },
          {
            path: 'lessons/:lessonId/edit',
            name: R.INSTRUCTOR_LESSON_EDIT,
            component: () => import('@/pages/instructor/course/LessonFormPage.vue'),
          },
        ],
      },
      {
        path: 'students',
        name: R.INSTRUCTOR_STUDENTS,
        component: () => import('@/pages/instructor/StudentsPage.vue'),
        meta: { requiresActiveAccess: true },
      },
      {
        path: 'students/new',
        name: R.INSTRUCTOR_STUDENT_NEW,
        component: () => import('@/pages/instructor/StudentFormPage.vue'),
        meta: { requiresActiveAccess: true },
      },
      {
        path: 'students/:studentId/edit',
        name: R.INSTRUCTOR_STUDENT_EDIT,
        component: () => import('@/pages/instructor/StudentFormPage.vue'),
        props: true,
        meta: { requiresActiveAccess: true },
      },
      // payment recovery: reachable in every access state
      {
        path: 'billing',
        name: R.INSTRUCTOR_BILLING,
        component: () => import('@/pages/access/BillingPage.vue'),
      },
      {
        path: 'profile',
        name: R.INSTRUCTOR_PROFILE,
        component: () => import('@/pages/instructor/ProfilePage.vue'),
      },
    ],
  },

  {
    path: '/student',
    component: StudentLayout,
    meta: { requiresAuth: true, role: Roles.STUDENT },
    children: [
      {
        path: '',
        name: R.STUDENT_DASHBOARD,
        component: () => import('@/pages/student/DashboardPage.vue'),
        meta: { requiresActiveAccess: true },
      },
      {
        path: 'courses',
        name: R.STUDENT_COURSES,
        component: () => import('@/pages/student/MyCoursesPage.vue'),
        meta: { requiresActiveAccess: true },
      },
      {
        path: 'courses/:courseId',
        name: R.STUDENT_COURSE,
        component: () => import('@/pages/student/CoursePage.vue'),
        props: true,
        meta: { requiresActiveAccess: true },
      },
      {
        path: 'courses/:courseId/lessons/:lessonId',
        name: R.STUDENT_LESSON,
        component: () => import('@/pages/student/LessonPage.vue'),
        props: true,
        meta: { requiresActiveAccess: true },
      },
      {
        path: 'courses/:courseId/quiz',
        name: R.STUDENT_QUIZ,
        component: () => import('@/pages/student/QuizPage.vue'),
        props: true,
        meta: { requiresActiveAccess: true },
      },
      // An issued certificate is a historical record, not learning content: these two pages (and
      // their API) deliberately have NO requiresActiveAccess, so a student can open them while the
      // instructor's subscription is inactive.
      {
        path: 'certificates',
        name: R.STUDENT_CERTIFICATES,
        component: () => import('@/pages/student/CertificatesPage.vue'),
      },
      {
        path: 'certificates/:certificateNumber',
        name: R.STUDENT_CERTIFICATE,
        component: () => import('@/pages/student/CertificatePage.vue'),
        props: true,
      },
      {
        path: 'workspace-inactive',
        name: R.STUDENT_WORKSPACE_INACTIVE,
        component: () => import('@/pages/access/WorkspaceInactivePage.vue'),
        meta: { onlyWhenInactive: true },
      },
      {
        path: 'profile',
        name: R.STUDENT_PROFILE,
        component: () => import('@/pages/student/ProfilePage.vue'),
      },
    ],
  },

  // unknown addresses get the same frame as the other public pages (landmarks, skip link, brand)
  {
    path: '/:pathMatch(.*)*',
    component: AuthLayout,
    children: [{ path: '', name: R.NOT_FOUND, component: () => import('@/pages/access/NotFoundPage.vue') }],
  },
]
