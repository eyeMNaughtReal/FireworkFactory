import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initializeErrorMonitoring } from './services/errorMonitor'
import { useAuthStore } from './stores/auth.js'
import { useThemeStore } from './stores/theme.js'

// Import global styles
import './styles/theme.css'
import './styles/common.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize global error monitoring
initializeErrorMonitoring(app)

// Initialize authentication store
const authStore = useAuthStore()
authStore.initializeAuth()

app.mount('#app')
