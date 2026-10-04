// Presentation only. Completion and the next lesson remain backend-authoritative.
export const learningStations = (course, currentId) => (course?.sections ?? []).flatMap((section) =>
  (section.lessons ?? []).map((lesson) => ({
    state: lesson.completed ? 'done' : lesson._id === (currentId ?? course.nextLesson?._id) ? 'current' : 'upcoming',
  }))
)
