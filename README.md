# Cohortly: LMS frontend (Vue 3 + JavaScript)

Frontend of the B2B learning platform. Instructors register an organization, pay for a monthly workspace and run
courses for their students; students learn inside that workspace. This is the Vue 3 rebuild of the original React
app (`../lms-project-frontend`, kept untouched as a reference). The backend (`../lms-project-backend`) is the
source of truth for every rule shown here.

**Status: M8 — optional final quizzes, assessment-aware course completion and certificates, on top of a polished, accessible LMS.** An instructor
can create and manage learning (M5). A student can sign in, see a real dashboard, continue from the next lesson, open
courses and lessons (text and video), mark lessons complete or incomplete, track progress, finish a course and resume
later (M6), all against the real backend. M7 changed how it looks and feels, not what it does. M8 adds an optional
final quiz per course, completion that can also require passing it, and certificates (see
[Final quiz and certificates](#final-quiz-and-certificates), [Product identity and design system](#product-identity-and-design-system),
[Accessibility](#accessibility) and [Scope](#scope-of-this-milestone)).

## Stack

| Package | Why it is here |
|---|---|
| `vue` 3 (Composition API, `<script setup>`, JavaScript) | UI framework |
| `vue-router` | routes, nested layouts, guards |
| `pinia` | the session / entitlement store (the only global client state) |
| `@tanstack/vue-query` | **server state**: every list and detail, with caching and targeted invalidation (M5) |
| `axios` | the single HTTP client (interceptors for token + error normalization) |
| `ckeditor5`, `@ckeditor/ckeditor5-vue` | rich-text lesson editor (GPL build), loaded on demand only on the lesson form (M5) |
| `tailwindcss` 3, `postcss`, `autoprefixer` | styling; one brand colour, utility classes inside a small set of components |
| `vite`, `@vitejs/plugin-vue` | dev server and build |
| `vitest`, `@vue/test-utils`, `jsdom` | unit and component tests |
| `axe-core` (dev) | automated structural accessibility checks in the tests (M5) |
| `eslint`, `@eslint/js`, `eslint-plugin-vue`, `globals` | linting |

No TypeScript.

## Run it

```bash
cp .env.example .env     # set VITE_API_URL to the backend
npm install
npm run dev              # http://localhost:5173
```

| Script | |
|---|---|
| `npm run dev` | Vite dev server on port **5173** (strict) |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the build on 5173 |
| `npm run lint` | ESLint (must report nothing) |
| `npm test` | Vitest (no test talks to a real server) |

### Environment

| Variable | |
|---|---|
| `VITE_API_URL` | **required.** Backend base URL, e.g. `http://localhost:3000`. If it is missing or not an http(s) URL the app shows a configuration screen instead of starting. |

Everything prefixed `VITE_` ends up in the public bundle: never put secrets in it.

### Backend dependency

The backend must be running and must allow this app's origin: its `FRONTEND_URL` has to be the address you open in
the browser (default `http://localhost:5173`, which is why the dev server uses a strict port). To try the app locally
without Midtrans, `npm run seed:demo` in the backend creates a demo workspace: `demo.instructor@cohortly.local` and
three students `demo.student1..3@cohortly.local` (password `CohortlyDemo123!`) with courses, progress and certificates
(see the backend README, "Demo data", and `docs/demo-scenarios.md` there).

## Roles and entitlement

The backend persists the instructor role as `manager`. `src/constants/roles.js` maps `manager` → `INSTRUCTOR` and
`student` → `STUDENT` (anything else is rejected) and is the only place that knows the raw values.

**Authentication and entitlement are separate.** Valid credentials always sign in. What the user may see then depends
on `accessStatus`, reported by the backend on sign-in and on `GET /api/me`:

| accessStatus | Meaning |
|---|---|
| `ACTIVE` | the only state that unlocks product pages |
| `NONE`, `PENDING`, `FAILED`, `EXPIRED` | not active |

| User | ACTIVE | Not active |
|---|---|---|
| Instructor | dashboard, courses, students (+ billing, profile) | only **Plan & Billing** (payment recovery) and Profile; everything else redirects to billing |
| Student (their instructor's workspace decides) | dashboard, my courses (+ profile) | **workspace-inactive** page; no payment controls anywhere |

Students see neutral wording ("Workspace inactive"); payment wording is only shown to instructors.

### HTTP error policy (`src/services/http.js`, `httpPolicy.js`)

| Backend answer | Frontend behaviour |
|---|---|
| 401 | session is not valid: clear it, go to the sign-in page of that area (remembering the target) |
| 403 `ACCESS_NOT_ACTIVE` / `WORKSPACE_ACCESS_INACTIVE` | **keep the session**, store the reported state, move to billing / the inactive page |
| any other 403 | authorization error shown by the page; no logout |
| 400 / 422 | validation or business error with the backend's `message` / `errors`; no logout |
| 404, 409 | shown by the page; backend `code` preserved |
| 5xx (incl. payment provider 502/503) | recoverable error state |
| network failure | "cannot reach the server" state; the session is **never** discarded |

Every failure reaches the code as an `ApiError` with `kind`, `status`, `code`, `message`, `errors`, `accessStatus`,
`accessExpiresAt`.

### Session

Only the JWT is stored (`localStorage`, key `lms.token`). On every page load the app asks `GET /api/me`: a valid
answer restores role and entitlement, a 401 clears the token, and a network/server failure keeps the token and shows an
"unavailable" page with a retry. Identity is never trusted from storage. `localStorage` is readable by scripts on this
origin, so an XSS bug would expose the token; there is deliberately no fake client-side encryption. There is no server
logout: tokens are stateless and expire after a day, so "Sign out" forgets the token locally.

## Structure

```
src/
  constants/    app (name, tagline), roles, access states, status vocabulary, route names, navigation
  services/     http client + policy, apiError, session storage, API services (auth, payment, overview, course,
                section, lesson, student, learning, quiz, certificate), queryKeys
  queryClient.js  Vue Query defaults; cache dropped when the session ends
  stores/       auth.js (session + entitlement)
  router/       routes.js (meta), guards.js (pure rules), index.js (hydration before every navigation),
                focus.js + titles.js (page title and focus after every navigation)
  layouts/      AppShell (responsive), InstructorLayout, StudentLayout, AuthLayout
  components/   ui/ (AppButton, AppBadge, StatusBadge, AppCard, AppIcon, BrandMark, PageHeader, SectionHeader,
                PageContainer, SkipLink, AppInput, AppSelect, AppTextarea, ImageField, ConfirmDialog, ProgressBar,
                MoveButtons, StatCard, UserAvatar),
                feedback/ (DataState, LoadingState, EmptyState, ErrorState, InlineAlert, ToastRegion, ConfigErrorScreen),
                navigation/ (NavItem), account/ (ProfileSummary), instructor/ (CourseForm, SectionCard, LessonRow,
                RichTextEditor, LearnerProgressCard, CourseStatusAction, ...), student/ (StudentCourseCard,
                CourseOutline, LessonContent, StudentQueryState, StudentQuizCard, CertificateDocument),
                quiz/ (QuestionEditor, QuizQuestionCard)
  composables/  instructorQueries, instructorMutations, studentQueries, studentMutations (lessons + quiz attempts), useToast,
                useScrollRegions, useAsyncAction, useRouteParam
  pages/        auth/ (sign-in, register), access/ (billing, workspace-inactive, payment result, unavailable, ...),
                instructor/ (dashboard, courses, students, course/ editor tabs + lesson form),
                student/ (dashboard, my courses, course, lesson, quiz, certificates, profile)
  utils/        config check, date, safe redirects, YouTube id parsing, studentCourse (state words and actions)
tests/          25 files; fakeApi.js is an in-memory backend at the Axios adapter level (real services run)
```

Route access is declared in route `meta` (`requiresAuth`, `role`, `requiresActiveAccess`, `guestOnly`,
`onlyWhenInactive`) and decided in one pure function (`router/guards.js`), so pages contain no role checks.

### Server state (decided in M5: TanStack Vue Query)

M4 postponed this; M5 adopted it because the instructor area is lists, details and many mutations that must refresh each
other, and a hand-written cache would have re-implemented loading/error/stale handling in every page. The split:

- **Pinia** holds the session only (token, identity, role, entitlement). It never holds courses, students or progress.
- **Vue Query** owns all server data. `services/queryKeys.js` lists every key (`['instructor', <resource>, ...]`, so a
  course key also covers its learners and progress); `composables/instructorQueries.js` are the reads and
  `composables/instructorMutations.js` the writes. The student keys live in a separate `['student', ...]` branch.
- **Invalidation is targeted and deliberate**, e.g. creating a lesson refreshes that course's detail, its progress and
  the overview, nothing else. A mutation returns the invalidation promise, so it stays "pending" until the screen shows
  fresh data. Nothing is updated optimistically: the backend stays authoritative, and a failed reorder simply refetches.
- Defaults (`queryClient.js`): retry once and only for network/5xx failures, 30 s freshness, no refetch on window focus.
- The whole cache is **dropped when the session ends** (sign-out, 401), so a different user never sees old data.

## Product identity and design system

**Cohortly** is the product name, with the tagline *Structured learning for your organization.* Both live in
`src/constants/app.js` (name, tagline, description); no template contains the name. The mark is a small indigo rounded
square with a "C" monogram (`BrandMark.vue`, also the favicon). The tone is a restrained B2B tool: one brand colour, a
neutral scale, four semantic colours, no gradients, no gamification.

User-facing words: **Instructor**, **Student**, **Course**, **Section**, **Lesson**, **Learner** (a student seen from a
course), **Progress**, **Plan & Billing**, **My Courses**. The backend's raw `manager` role is translated once in
`constants/roles.js` and never shown.

**Tokens** are defined once as CSS variables (`src/style.css`) and named in `tailwind.config.js`. Components use the
semantic names, not palette steps:

| Token | Use |
|---|---|
| `canvas`, `surface`, `surface-muted` | page background, panels, subtle fills (table heads, section headers) |
| `line`, `line-control` | decorative dividers and card borders; borders of controls (inputs, buttons: 3.9:1) |
| `ink`, `ink-soft`, `ink-muted` | primary, body and secondary text |
| `primary` (+ `hover`, `soft`, `faint`, `strong`) | actions, links, focus ring, active navigation |
| `success`, `warning`, `danger` (+ `soft`, `strong`) | status badges, alerts, completed state, errors |

Radius scale: `rounded-control` (inputs, buttons), `rounded-card` (panels, list items), `rounded-overlay` (dialogs).
Shadow scale: `shadow-card` (barely lifted) and `shadow-overlay` (dialogs, toasts). Layout tokens: sidebar `16rem`,
mobile header `3.5rem`, content width `max-w-content` (72rem), forms `max-w-form` (42rem), lesson text `max-w-reading`
(44rem). No arbitrary pixel widths or offsets are used (a test scans for them).

**Type scale** (classes in `style.css`): `type-page-title`, `type-section-title`, `type-card-title`, `type-body`,
`type-meta`, `type-label`, `type-help`, `type-error`, `type-eyebrow`, `type-link`; lesson reading text is the separate
`.lesson-prose` (larger size, 2rem line height, 44rem measure).

**Shared building blocks.** `PageHeader` (title, description, back link, actions) and `SectionHeader` sit on every page;
`PageContainer` limits width; `AppShell` wraps the content in it. `AppButton` has one height (44px tap target), radius and
focus style with five variants: `primary`, `secondary`, `ghost`, `danger` (only the confirm button of a destructive
dialog), `danger-quiet` (Delete/Remove triggers next to other actions) and `danger-outline` (a lone destructive trigger).
Form fields share `.field-control` (validation state comes from `aria-invalid`). `StatusBadge` is the only way a status is
shown, with one vocabulary (`constants/status.js`): course **Draft / Published**; learning **Not started / In progress /
Completed**; subscription **Active / Payment pending / Payment failed / Expired / Not activated**; workspace (what a
student may know) **Active / Inactive**. The word always carries the meaning.

**Feedback.** Loading, empty and error states share one look. Errors say what could not be loaded and what to do next
(`DataState subject="your courses"`). *Success* is a short toast ("Course saved.", "Lesson created.") shown by the mutation
composables in a polite live region; errors, warnings and anything the user must read or act on stay inline. Skeleton loaders
were evaluated and not adopted: the pages are short lists and forms of different shapes, so skeletons would mean one duplicated
template per page for a wait that is usually under a second; a fixed-height spinner with a specific label avoids layout jumps.
Destructive dialogs all have the same shape: title, consequence, Cancel, confirm.

Motion is limited to short colour transitions and a 300 ms progress-bar width change; with `prefers-reduced-motion` all
animation and transition time is removed.

### Responsive behaviour

Below `lg` (1024px) the sidebar becomes a top bar with a Menu button (`aria-expanded`, Escape closes it and restores focus);
from `lg` it is a sticky 16rem column. Lists become stacked cards on phones (thumbnails shrink, actions wrap below, reorder
buttons are 44px and become compact from `sm`); the course tabs scroll horizontally if needed; wide lesson tables scroll
inside their own box. Checked in Chromium at 360, 768 and 1280px on every public, instructor and student page: no page-level
horizontal overflow, tap targets of buttons and navigation >= 40px at 360px.

### Accessibility

- **Landmarks and skip link.** Every page (also the public ones and "not found") has a skip link as its first Tab stop and a
  `<main id="main">`. Page-level states such as "Page not found" are the page's `<h1>`.
- **Route changes.** After every navigation to a different page the title is set (`Courses · Cohortly`) and focus moves to the
  page heading (`[data-page-heading]`, else the first `<h1>`); while the page is still loading focus waits on `<main>` and moves
  to the heading when it appears (only if the user has not moved it). Focus is **not** moved on the first load, on query/hash-only
  changes, between the tabs of a course, or by a form that stays on the page (rules in one tested function,
  `router/focus.js`). The lesson page additionally moves focus to the lesson title when moving between lessons.
- **Scrollable lesson tables.** A table that overflows becomes a focusable region (`tabindex="0"`, `role="region"`, label
  "Table, scrollable horizontally") that scrolls with the arrow keys; a table that fits has no tab stop. It follows resizing.
- **Forms and controls.** Labels, hints and errors are tied with `aria-describedby`; invalid fields have `aria-invalid`; reorder
  buttons are a labelled group with the item's name; dialogs trap focus, start on Cancel, close with Escape and return focus;
  status is never colour alone (text plus icon); the video iframe has a title; the progress bar is an ARIA `progressbar`.
- **Automated.** axe-core (WCAG 2.0/2.1 A and AA, structural rules) runs on representative instructor and student pages,
  billing in every subscription state, profile pages, an open dialog, a visible toast, error and unavailable states.

**Contrast.** jsdom cannot measure contrast, so it was reviewed two ways. (1) Every foreground/background token pair was
computed (WCAG formula): body text on surface 17.9:1, secondary text 7.6:1 (7.2 on the page background), primary links 7.9:1,
white on the primary button 6.3:1, badges 8.1-8.6:1, error/success/warning text 6.5 / 5.5 / 5.0:1, control borders 3.9:1,
progress fill vs track 5.1:1 (primary) and 4.5:1 (success), focus ring 6.3:1. (2) In real Chromium the computed text colour
and alpha-composited background of every visible text element were measured on all public, instructor and student pages
(including badges, alerts, the completed course, billing when expired and the inactive page): all met
4.5:1 (3:1 for large text). Disabled controls are exempt by WCAG and are shown at 60% opacity.

## Instructor area

| Route | Page |
|---|---|
| `/instructor` | dashboard: real numbers from `GET /api/overviews` (courses, published, students, video and text lessons) |
| `/instructor/courses` | course list: status, category, students; publish / unpublish; delete; client-side filter by name |
| `/instructor/courses/new` | create a course (always a draft) |
| `/instructor/courses/:id` | **Content**: sections and lessons, create / rename / delete / reorder |
| `.../sections/:sectionId/lessons/new`, `.../lessons/:lessonId/edit` | lesson form (TEXT with rich text, VIDEO with a YouTube link or id) |
| `.../learners` | enrollment: enroll a student, remove a learner |
| `.../progress` | learner progress, exactly as the backend reports it |
| `.../settings` | edit course details; delete the course |
| `/instructor/students`, `/new`, `/:id/edit` | student list, create, edit, delete |
| `/instructor/billing`, `/instructor/profile` | from M4 (profile is read-only: the backend has no profile-update endpoint) |

Behaviour worth knowing:

- **Draft / published.** New courses are drafts. Publishing needs at least one lesson (`COURSE_NOT_PUBLISHABLE` is shown as
  "Add at least one lesson before publishing."). Unpublishing asks first: students lose access at once, progress is kept.
- **Ordering** uses Up/Down buttons (keyboard and screen-reader friendly, no drag-and-drop dependency). Each move sends the
  complete id list; on `REORDER_MISMATCH` the user is told, the real structure is refetched and nothing is retried
  with stale ids. Lessons only move within their section: the backend has no cross-section move.
- **Rich text.** CKEditor offers only what the backend sanitizer keeps (paragraphs, h2-h4, bold, italic, links, lists,
  quotes, tables). The backend sanitizes on save and is the authority. The instructor editor never renders lesson HTML
  with `v-html`; the only `v-html` in the app is the student lesson body (see [Student area](#student-area)).
  The editor chunk (~0.8 MB) loads only when a lesson form opens.
- **Students.** Create needs name, email, password and an avatar. On edit, an empty password is simply not sent (the
  backend keeps the current one); the old `"undefined"` workaround is gone.
- **Enrollment.** Only not-yet-enrolled students are offered. Removing a learner warns that their progress in that course
  is deleted and that re-enrolling starts from zero.
- **Progress.** Counts, percent, completed flag, next lesson and last activity are the backend's values and are only laid
  out here (a test proves a disagreeing percent is shown unchanged).
- **Losing the subscription mid-session.** A refused request (`ACCESS_NOT_ACTIVE`) keeps the session and moves the
  instructor to Plan & Billing; the menu shrinks to Billing and Profile.
- Every list has loading, empty and error (with retry) states; every destructive action has a confirmation dialog;
  every form shows the backend's field errors.

## Student area

A student only reaches this area while the instructor workspace is `ACTIVE` (the backend refuses learning requests
otherwise). Everything shown comes from the Student learning API of the backend (M3B); the frontend never recomputes
`percent`, `completed`, `nextLesson` or `lastActivityAt`.

| Route | Page | Backend |
|---|---|---|
| `/student` | **Dashboard**: Continue learning, completion summary, all courses | `GET /api/students-courses` |
| `/student/courses` | **My Courses**: thumbnail, category / tagline, progress, state, Start / Continue / Review | `GET /api/students-courses` |
| `/student/courses/:courseId` | **Course**: progress, last activity, ordered sections and lessons (outline) | `GET /api/students-courses/:courseId` |
| `/student/courses/:courseId/lessons/:lessonId` | **Lesson**: content, previous / next, complete / undo | `GET .../lessons/:lessonId`, `PUT` / `DELETE /api/lessons/:lessonId/completion` |
| `/student/profile` | read-only account (the backend has no student profile update, so there is no save button) | `GET /api/me` |
| `/student/workspace-inactive` | "Learning is paused" with **Check again**; no payment controls | `GET /api/me` |

The menu is Dashboard, My Courses, Certificates, Profile. Course outline and lesson navigation live inside the learning flow.

- **Continue learning** = the first course, in the backend order, that has a `nextActivity` (the next lesson, or the final quiz when only the quiz is left; `nextLesson` is the fallback). No ranking or scoring. If every
  course is complete the dashboard says so; with no courses it says the student is not enrolled in any.
- **Start / Continue / Review.** `completedLessons = 0` gives Start course; incomplete gives Continue learning; `completed`
  gives Review course. Start and Continue open the backend `nextLesson`; Review opens the outline. No "current lesson"
  state is kept in the browser: the position is always the backend `nextLesson`.
- **Outline.** Sections and lessons keep the backend order. Each lesson is a real link with an icon *and* the words
  "Completed" / "Not completed", its type, and an "Up next" marker on `nextLesson`. Sections are stacked lists (no
  collapsing) so a phone reads the course top to bottom.
- **Lesson page.** TEXT shows the backend-sanitized HTML; VIDEO shows a YouTube iframe. Previous / Next use the backend
  `previousLessonId` / `nextLessonId` (they cross sections as the backend defines) and are disabled when `null`.
  After moving to another lesson, focus goes to the lesson title.
- **Completion.** *Complete and continue* and *Mark as complete* call `PUT .../completion`; *Mark as incomplete* calls
  `DELETE`. Nothing changes before the backend answers (no optimistic update), the buttons are locked while the request
  runs (a double click sends one request), and a failure shows a message and leaves the lesson as it was. *Complete and
  continue* navigates only after success, to the returned `nextLesson`, or to the course page when it is `null` (the
  completed state). Both calls are idempotent on the backend.
- **Cache strategy.** After a completion the lesson entry (`completed`, `completedAt`) and the course `progress` and
  `nextLesson` are set from the backend answer, then the course (outline, last activity) is refetched and the course list
  invalidated. Other lessons and every instructor key are untouched. Student queries have `staleTime: 0`, so every visit
  re-reads the backend: nothing is stored in `localStorage`, and a course the instructor reopened by adding a lesson shows
  the new progress and `nextLesson` on the next visit.
- **Course completed.** Shown when the backend says `progress.completed` (banner, "All N lessons are completed", every
  lesson still reachable for review). No certificate or score yet.
- **Availability.** A `404` (draft, unpublished, unenrolled, removed lesson; the backend deliberately does not say which)
  becomes "This course is no longer available" with a link to My Courses. The session is never touched, nothing about
  drafts or enrollment is revealed, and republishing brings the student progress back. Unenrolling deletes that course
  progress (backend behavior).
- **Entitlement.** A `403 WORKSPACE_ACCESS_INACTIVE` on any learning request (dashboard, course, lesson, completion, undo)
  keeps the student signed in and moves them to `/student/workspace-inactive`, which has no payment UI. *Check again*
  reloads the entitlement; once ACTIVE, the learning pages work again with progress intact.
- **Lesson text and the `v-html` trust boundary.** `components/student/LessonContent.vue` is the only place that uses
  `v-html`. It renders the lesson `text` returned by the lesson endpoint, which the backend has run through its
  allow-list sanitizer (`sanitizeRichText`: a few tags, `href` / `rel` / `target`, indent margins, `http(s)` / `mailto`
  only). The browser never sends that HTML back, nothing is re-enabled, and titles, names and every other field use text
  interpolation. Styling is `.lesson-prose` in `style.css`; wide tables scroll inside their figure.
- **Video.** The iframe URL is built only from the backend `youtubeId` after checking it is `[A-Za-z0-9_-]{4,64}`
  (`https://www.youtube.com/embed/<id>`); anything else shows "This video cannot be shown right now". The iframe has a
  title ("Video: <lesson>"), `allowfullscreen`, and sits in a 16:9 responsive frame.
- **Progress display.** The shared `ProgressBar` (ARIA `progressbar`, label, value text) shows the backend `percent` with
  the textual "x of y lessons" and a "Completed" label. A test proves a `percent` or `completed` that contradicts the
  counts is shown unchanged.
- Every student page has loading, empty / unavailable and error (with retry) states.

## Final quiz and certificates

Optional per course, evaluated entirely by the backend. **The frontend never calculates a score, a pass/fail, a completion flag or a
certificate**: it sends choices and shows what comes back.

**Instructor: the Quiz tab** (`/instructor/courses/:courseId/quiz`, between Content and Learners).
- *No quiz:* explains that a final quiz is optional (without one students complete the course by finishing every lesson; with one they must also pass it) and offers a form (title, passing score 1-100, default 70).
- *With a quiz:* a readiness banner (what is missing, in the backend's words, or "The quiz is ready"), settings, and the questions. A question has text, 2 to 8 options and one radio that marks the correct option;
  options keep their stable id when edited, questions can be added, edited, deleted (with a confirmation) and reordered with Up/Down buttons. Deleting the quiz states the consequences.
- Publishing a course whose quiz is unfinished is refused by the backend (`QUIZ_NOT_READY`); the course page says so and points to the Quiz tab.
- The learner progress page shows each learner's quiz status (Not started / Not passed yet / Passed), attempts, best and latest score and whether a certificate was issued, **next to** the lesson progress, never merged with it.

**Student.**
- The course page shows a *Final quiz* card with the backend's state: **Locked** ("Complete all lessons to unlock the final quiz."), **Not available yet**, **Ready** (Take final quiz), **Not passed yet** (Retry final quiz, with the latest score) or **Passed**.
  The lesson percent stays 100 while the course is not complete ("Final quiz pending"). Dashboard and My Courses follow the backend `nextActivity`: Start / Continue learning, *Take final quiz*, *Retry final quiz*, *Review course* and *View certificate*.
- The quiz page (`/student/courses/:courseId/quiz`): every question is a labelled radio group; every question must be answered (an error summary lists what is missing and takes focus); submit is disabled while pending (no double submit);
  if the request fails the choices are kept. The result is neutral: score, passing score, correct count, right/wrong per question (never the correct option), then *Retry quiz* or *View certificate*; the attempt history is listed below.
  Answer keys never reach the browser before submitting (the student quiz payload has no correctness field at all).
- **Certificates** (`/student/certificates`, `/student/certificates/:certificateNumber`): a printable certificate (Cohortly, Certificate of Completion, holder, course, issue date, instructor, certificate ID; no score, points or signature image).
  *Print / Save as PDF* uses the browser's print: the shell, header and buttons are `print:hidden` and the sheet has its own A4 landscape page (`@page certificate`), so only the certificate prints (checked: one page, 842x595 pt).
- **Verification** is public: `/certificates/verify/:certificateNumber` (and a lookup form at `/certificates/verify`) shows "Valid certificate" with the printed details only, or a calm "Certificate not found". The home page links to it.
- **Entitlement.** Quiz routes require an ACTIVE workspace (a 403 `WORKSPACE_ACCESS_INACTIVE` keeps the session and goes to the inactive page, no billing UI). The certificate routes, their API and the **Certificates** menu entry deliberately do **not**:
  an issued certificate stays viewable while the workspace is inactive. Public verification never needs a session.

Cache: instructor quiz mutations store the quiz the backend answers with (`['instructor','course',id,'quiz']`) and refresh the progress page; a quiz attempt merges the backend's `progress`, `nextActivity`, `quiz` and `certificate` into the cached course and refetches the course,
the course list and the attempt history (`['student', 'course', id, 'quiz-attempts']`); certificates live under `['student','certificates']`; verification under `['public','certificate',number]`.

## Scope of this milestone

**Done (M8):** optional final quiz per course (instructor editor, student quiz, attempt history), completion that is lessons plus a passed quiz when the course has one, certificates (page, print, public verification), and the instructor progress extension. The backend gained the quiz, attempt and certificate domain (see the backend README); M2-M7 behaviour is unchanged.

**Done (M7):** product identity (Cohortly), design tokens and type scale, a polished shell and navigation, one button, form,
card, badge and dialog system, success toasts, global route focus and page titles, focusable scrollable tables, a measured
contrast review, and layout polish of every page, with the Course -> Section -> Lesson hierarchy made visible in the editor.
No business rule, query, entitlement or progress behaviour changed, and the backend was untouched (M7 found no backend defect).

**Done earlier:** M6 (Student area), M5 (instructor experience), M4 (auth, entitlement, routing, layouts, billing).

**Still to come:**

- **Known limits of M7:** the lesson outline is not collapsible (it reads top to bottom, which is the simpler and more
  accessible choice for courses of this size); there is no dark theme; the status label "Payment pending / failed" keeps its
  longer wording on purpose (an instructor needs to know it is about payment); CKEditor (about 0.8 MB) is loaded only when a
  lesson form opens and was kept; lists have no server-side search or pagination (the backend has none).
- **Not in M8 by design:** per-lesson or per-section quizzes, several quizzes, question banks, random order, timers, essays or manual grading, attempt limits, weighted questions, certificate templates or signatures, e-mailing certificates. Rate limiting of the public verification endpoint is not implemented.
- **M9 - AI features.** Not started.
- A committed end-to-end suite (the M6 smoke test against a real backend and browser was run by hand).

**Intentionally not carried over from the React app:** the fixed 290px sidebar, hover-only menus, `href="#"` links,
Rewards / Settings / Categories / "Import from BWA" entries, `react-secure-storage`, logging out on HTTP 400,
discarding errors, and its copy of the old API contract.

## Tests

`npm test` runs Vitest with jsdom: 25 files, no test talks to a real server. `tests/fakeApi.js` is an in-memory backend at
the Axios adapter level (real services, interceptors and URLs run). `tests/learningBackend.js` is a small stateful
stand-in for the Student learning API that behaves like the real controllers (progress rounded down, `nextLesson`,
previous / next ids across sections, 404 when unavailable); `tests/studentApp.js` opens the real app as a student with the
real HTTP policy installed. Student coverage: dashboard, my courses, course and lesson pages, text and video, previous /
next, mark / undo / complete and continue, cache refresh, backend-authoritative progress, entitlement loss on every kind
of request, 404 availability, route access, and axe-core audits of representative pages. M7 added tests for route focus, scrollable tables, toasts, shared
patterns (status vocabulary, accessible names, reorder groups, dialog shape), product identity (no leftover course-project
footprint), design tokens, reduced motion and more axe pages. M8 added `quiz-instructor`, `quiz-student`, `certificate-ui` and `m8-accessibility` (stateful fakes of the quiz and certificate API in `tests/quizBackend.js`). jsdom has no layout, so contrast, overflow and tap targets
were checked in real Chromium at 360, 768 and 1280 px (see Accessibility and Responsive behaviour).

```
npm run lint
npm test
npm run build
```

## Billing flow

Registration (`/register`) → backend creates the account and a pending payment and returns the hosted Midtrans URL →
the browser is sent there. **No card data is handled here.** Midtrans returns the browser to `/success-checkout`, which
never claims success (confirmation reaches the backend separately); it reloads the real state. Instructors can start or
renew a payment from Plan & Billing at any time (`POST /api/payment/checkout`). Nothing is ever marked active locally.
If the provider is down the backend rolls a failed sign-up back, so retrying is always safe.

## AI study tools (M9, optional)

The frontend never talks to an AI provider and holds no key. It only asks the backend `GET /api/ai/status` and, when AI is enabled and available, shows:
- **Lesson assistant** (student lesson page): a collapsed "AI study tools" entry under the lesson with Summarize, Practice questions and Ask about this lesson. Results are labelled "AI-generated" and "Based on this lesson". Practice questions are answered locally, explained after checking, and never affect progress, the course quiz or certificates. Video lessons show a short note instead.
- **Generate with AI** (instructor quiz page): drafts questions that the instructor reviews, edits, removes or deselects. Nothing is saved until "Add N selected questions to quiz", which uses the existing quiz endpoints one question at a time.

When AI is off nothing is rendered; when it is unavailable or fails, a calm message appears inside the panel and the lesson, completion, quiz and certificates are unaffected. Code: `src/composables/aiQueries.js`, `src/services/aiService.js`, `src/utils/ai.js`, `src/components/student/LessonAssistant.vue`, `PracticeQuestions.vue`, `src/components/quiz/QuizAiDraft.vue`. Tests mock every AI endpoint (`tests/aiBackend.js`); no provider quota is used.
