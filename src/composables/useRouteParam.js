import { computed } from 'vue'
import { useRoute } from 'vue-router'

// A route parameter as a reactive value (so queries and mutations follow navigation).
export const useRouteParam = (name) => {
  const route = useRoute()

  return computed(() => route.params[name])
}
