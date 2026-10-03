// The one vocabulary for status labels, shown through <StatusBadge>. Wording is fixed here so
// the same state is never called two things:
//   course        Draft | Published
//   learning      Not started | In progress | Completed   (a student's progress in a course)
//   subscription  Active | Payment pending | Payment failed | Expired | Not activated  (instructor)
//   workspace     Active | Inactive                      (what a student may know)
import { ACCESS_LABELS, ACCESS_TONES, workspaceLabel, workspaceTone } from './access.js'

export const COURSE_STATUS = Object.freeze({
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Published', tone: 'success' },
})

export const LEARNING_STATUS = Object.freeze({
  empty: { label: 'No lessons yet', tone: 'neutral' },
  'not-started': { label: 'Not started', tone: 'neutral' },
  'in-progress': { label: 'In progress', tone: 'info' },
  'quiz-pending': { label: 'Final quiz pending', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
})

export const statusFor = (kind, value) => {
  if (kind === 'learning') return LEARNING_STATUS[value] ?? LEARNING_STATUS['not-started']
  if (kind === 'subscription') return { label: ACCESS_LABELS[value] ?? ACCESS_LABELS.NONE, tone: ACCESS_TONES[value] ?? 'neutral' }
  if (kind === 'workspace') return { label: workspaceLabel(value), tone: workspaceTone(value) }

  return COURSE_STATUS[value] ?? COURSE_STATUS.draft
}
