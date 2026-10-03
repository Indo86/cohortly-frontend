// Every query key in one place, so invalidation is deliberate and greppable.
// Hierarchy: ['instructor', <resource>, ...params]. Invalidating a key also invalidates
// everything below it, which is used on purpose (e.g. all of one course's data).
const root = ['instructor']
// Student learning state lives in its own branch: a student session never touches the
// instructor keys. Lesson keys sit below their course, so invalidating a course key (without
// `exact`) also covers its lessons.
const studentRoot = ['student']

export const queryKeys = {
  overview: [...root, 'overview'],
  categories: [...root, 'categories'],

  courses: [...root, 'courses'],
  course: (courseId) => [...root, 'course', courseId],
  courseStudents: (courseId) => [...root, 'course', courseId, 'students'],
  courseProgress: (courseId) => [...root, 'course', courseId, 'progress'],
  lesson: (lessonId) => [...root, 'lesson', lessonId],
  // the course's single final quiz as the instructor edits it (answers included)
  courseQuiz: (courseId) => [...root, 'course', courseId, 'quiz'],

  students: [...root, 'students'],
  student: (studentId) => [...root, 'student', studentId],

  studentCourses: [...studentRoot, 'courses'],
  studentCourse: (courseId) => [...studentRoot, 'course', courseId],
  studentLesson: (courseId, lessonId) => [...studentRoot, 'course', courseId, 'lesson', lessonId],
  // the quiz to answer (no answer key) and the student's own attempts of it
  studentQuiz: (courseId) => [...studentRoot, 'course', courseId, 'quiz'],
  quizAttempts: (courseId) => [...studentRoot, 'course', courseId, 'quiz-attempts'],
  studentCertificates: [...studentRoot, 'certificates'],
  studentCertificate: (number) => [...studentRoot, 'certificate', number],

  // optional AI tools (M9): only the configuration state is a query; every generation is a mutation
  aiStatus: ['ai', 'status'],

  // public: anyone can verify a certificate number
  certificateVerification: (number) => ['public', 'certificate', number],
}
