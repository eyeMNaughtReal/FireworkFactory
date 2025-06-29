import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initializeErrorMonitoring } from './services/errorMonitor'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize global error monitoring
initializeErrorMonitoring(app)

app.mount('#app')
