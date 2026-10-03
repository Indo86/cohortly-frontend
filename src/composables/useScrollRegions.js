import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

// Wide content (a table in a lesson) scrolls sideways inside its own box. A box that scrolls
// must be reachable by keyboard, otherwise keyboard users cannot read the hidden columns. But
// a tab stop on something that does NOT scroll is noise. So the box becomes a focusable,
// labelled region ONLY while it actually overflows, and goes back to plain content when it
// does not (a wider window, a rotated phone).
export const SCROLL_REGION_LABEL = 'Table, scrollable horizontally'

export const markScrollRegions = (root, selector = 'figure.table') => {
  if (!root) return

  for (const element of root.querySelectorAll(selector)) {
    if (element.scrollWidth > element.clientWidth + 1) {
      element.setAttribute('tabindex', '0')
      element.setAttribute('role', 'region')
      element.setAttribute('aria-label', SCROLL_REGION_LABEL)
    } else {
      element.removeAttribute('tabindex')
      element.removeAttribute('role')
      element.removeAttribute('aria-label')
    }
  }
}

// `rootRef` is the element that holds the HTML; `source` is a getter that changes when that
// HTML is replaced.
export const useScrollRegions = (rootRef, source) => {
  let observer = null

  const update = () => markScrollRegions(rootRef.value)

  onMounted(() => {
    update()

    if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
      observer = new ResizeObserver(update)
      observer.observe(rootRef.value)
    }
  })

  watch(source, async () => {
    await nextTick()
    update()
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { update }
}
