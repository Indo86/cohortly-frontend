import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './style.css'
import App from './App.vue'
import ConfigErrorScreen from '@/components/feedback/ConfigErrorScreen.vue'
import { bindCacheToSession, createQueryClient } from '@/queryClient.js'
import { createAppRouter } from '@/router/index.js'
import { installHttpPolicy } from '@/services/httpPolicy.js'
import { useAuthStore } from '@/stores/auth.js'
import { configProblems } from '@/utils/config.js'

const problems = configProblems()

if (problems.length > 0) {
  // fail clearly instead of mounting an app that cannot work
  createApp(ConfigErrorScreen, { problems }).mount('#app')
} else {
  const app = createApp(App)
  const pinia = createPinia()
  const queryClient = createQueryClient()

  app.use(pinia)
  app.use(VueQueryPlugin, { queryClient })

  const router = createAppRouter()
  const auth = useAuthStore(pinia)

  installHttpPolicy({ auth, router })
  // server state belongs to the session: a different user never sees cached data
  bindCacheToSession(auth, queryClient)

  app.use(router).mount('#app')
}
