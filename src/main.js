// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// --- RE-ADD THIS IMPORT! This resolves the 'initializeErrorMonitoring is not defined' error. ---
import { initializeErrorMonitoring } from './services/errorMonitor'

import { useAuthStore } from './stores/auth.js'

// Import the pre-initialized Firebase app, db, and auth instances from your generated config.
// We rename 'app' to 'firebaseApp' to avoid conflicts with Vue's 'app' instance.
import { app as firebaseApp, db, auth } from './firebase/config';

// Import global styles
import './styles/common.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// --- Make Firebase instances available globally to your Vue components via `app.provide` ---
// This resolves the 'db is defined but never used' error, as it's now explicitly 'used'
// by being provided to the app context. Components can then `inject('firestore')` etc.
app.provide('firebaseApp', firebaseApp); // The main Firebase app instance
app.provide('firestore', db);            // Your Firestore instance
app.provide('auth', auth);              // Your Authentication instance

// Initialize global error monitoring.
// The `initializeErrorMonitoring` function from errorMonitor.js accepts the Vue app instance.
initializeErrorMonitoring(app)

// Initialize authentication store
const authStore = useAuthStore()
// Pass the already initialized 'auth' instance to your store's initialization method.
// Your auth.js is correctly set up to receive this.
authStore.initializeAuth(auth)

app.mount('#app')
