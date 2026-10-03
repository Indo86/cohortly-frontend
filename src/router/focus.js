import { nextTick } from 'vue'
import { APP_NAME } from '@/constants/app.js'
import { ROUTE_TITLES } from './titles.js'

// Route-change accessibility. In a single-page app the browser does not announce a new page,
// so after every navigation to a different page:
//   1. document.title is set (screen readers announce it, the tab shows it);
//   2. keyboard focus moves to the page heading ([data-page-heading], else the first <h1>) or,
//      while the page is still loading, to <main> and then to the heading once it appears
//      (only if the user has not moved focus meanwhile).
// Focus is NOT moved:
//   - on the very first load (the skip link must stay the first Tab stop);
//   - when only the query string or hash changes;
//   - between the tabs of a course (the tab list keeps focus);
//   - when a navigation failed or was cancelled.
// Form submissions that stay on the page never navigate, so they never steal focus.
export const documentTitle = (to) => {
  const title = ROUTE_TITLES[to.name]

  return title ? `${title} · ${APP_NAME}` : APP_NAME
}

export const shouldMoveFocus = (to, from, failure) => {
  if (failure) return false
  if (!from?.matched?.length) return false
  if (to.path === from.path) return false
  if (to.meta?.tab && from.meta?.tab && to.params.courseId === from.params.courseId) return false

  return true
}

const WAIT_FOR_HEADING_MS = 4000

const heading = (main) => main.querySelector('[data-page-heading]') ?? main.querySelector('h1')

const focusElement = (element) => {
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1')

  element.focus({ preventScroll: true })
}

export const focusPageStart = (root = document) => {
  const main = root.getElementById('main')

  if (!main) return null

  const found = heading(main)

  if (found) {
    focusElement(found)

    return null
  }

  // still loading: park focus on <main>, then hand it to the heading when it shows up
  focusElement(main)

  if (typeof MutationObserver === 'undefined') return null

  const observer = new MutationObserver(() => {
    const late = heading(main)

    if (!late) return

    observer.disconnect()

    // the user (or the page itself, e.g. the lesson title) already moved focus: leave it
    if (root.activeElement === main) focusElement(late)
  })

  observer.observe(main, { childList: true, subtree: true })
  setTimeout(() => observer.disconnect(), WAIT_FOR_HEADING_MS)

  return observer
}

export const installRouteFocus = (router) =>
  router.afterEach(async (to, from, failure) => {
    document.title = documentTitle(to)

    if (!shouldMoveFocus(to, from, failure)) return

    await nextTick()
    focusPageStart()
  })
