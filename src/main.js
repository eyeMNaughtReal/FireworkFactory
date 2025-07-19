import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
// import { initializeErrorMonitoring } from './services/errorMonitor' // This might need to change
import { useAuthStore } from './stores/auth.js' // This might need to change

// --- NEW IMPORT ---
// Import the pre-initialized Firebase app, db, and auth instances
import { app as firebaseApp, db, auth } from './firebase/config'; // Adjust path if needed!

// Import global styles
import './styles/common.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Now, pass the *initialized* firebaseApp, db, and auth instances to your services/stores
// IMPORTANT: You should NOT call initializeApp again in these functions.
// They should accept and use the already initialized instances.

// Example: Initialize global error monitoring
// If initializeErrorMonitoring needs the Firebase app instance:
// initializeErrorMonitoring(firebaseApp, app); // Pass the firebaseApp
// Or if it needs specific services:
initializeErrorMonitoring(firebaseApp, app); // Pass the main app and the firebaseApp

// Example: Initialize authentication store
const authStore = useAuthStore()
// Pass the already initialized 'auth' instance to your store
authStore.initializeAuth(auth); // Pass the auth instance
// You might also need to pass the db instance to other parts of your app
// For example: app.provide('firestore', db); or pass it to components
// app.config.globalProperties.$db = db; // Vue 2 style, or via provide/inject in Vue 3
// app.config.globalProperties.$auth = auth;

app.mount('#app')
