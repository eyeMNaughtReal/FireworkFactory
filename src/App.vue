<template>
  <div id="app">
    <nav class="sidebar" :class="{ 'open': isSidebarOpen }">
      <div class="sidebar-header">
        <router-link :to="{ name: 'home' }" class="nav-brand">
          <span class="logo-icon">🎆</span>
          <span class="logo-text">Firework Factory</span>
        </router-link>
      </div>
      
      <div class="nav-menu">
        <router-link :to="{ name: 'home' }" class="nav-link" exact>Home</router-link>
        <router-link :to="{ name: 'products' }" class="nav-link">Products</router-link>
        <router-link :to="{ name: 'inventory' }" class="nav-link">Inventory</router-link>
        <router-link :to="{ name: 'orders' }" class="nav-link">Orders</router-link>
        <router-link :to="{ name: 'categories' }" class="nav-link">Categories</router-link>
        <router-link :to="{ name: 'vendors' }" class="nav-link">Vendors</router-link>
        <router-link :to="{ name: 'statistics' }" class="nav-link">Statistics</router-link>
        <router-link :to="{ name: 'backup' }" class="nav-link">Backup</router-link>
        <router-link :to="{ name: 'audit' }" class="nav-link">Audit Logs</router-link>
        <router-link :to="{ name: 'notifications' }" class="nav-link">Notifications</router-link>
        <router-link 
          v-if="environment === 'development'" 
          :to="{ name: 'error-monitoring' }" 
          class="nav-link dev-only">
          🔧 Error Monitor
        </router-link>
      </div>

      <div class="sidebar-bottom">
        <div class="environment-badge">
          {{ environment }}
        </div>
      </div>
    </nav>
    
    <div class="main-content">
      <router-view />
    </div>

    <!-- Firework Loader Overlay -->
    <div id="firework-loader" v-if="isLoading" class="loader-overlay">
      <div class="firework-canvas-container">
        <canvas id="firework-canvas" width="180" height="180"></canvas>
      </div>
    </div>

    <!-- Toast Component -->
    <ToastNotification />
  </div>
</template>

<script>
import ToastNotification from '@/components/Toast.vue'

export default {
  name: 'App',
  components: {
    ToastNotification
  },
  data() {
    return {
      isSidebarOpen: false,
      isLoading: false,
      toasts: [],
      environment: process.env.NODE_ENV
    }
  },
  methods: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
    },
    showToast(message, type = 'info') {
      const id = Date.now()
      this.toasts.push({ id, message, type })
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id)
      }, 4000)
    },
    showLoader() {
      this.isLoading = true
      this.startFireworks()
    },
    hideLoader() {
      this.isLoading = false
      this.stopFireworks()
    },
    startFireworks() {
      // Fireworks animation code will be added here
    },
    stopFireworks() {
      // Fireworks cleanup code will be added here
    }
  },
  created() {
    // Expose toast method globally
    window.showToast = this.showToast
    window.showLoader = this.showLoader
    window.hideLoader = this.hideLoader
  }
}
</script>

<style>
@import './styles/common.css';

/* App Layout */
#app {
  display: flex;
  min-height: 100vh;
}

/* Sidebar Navigation */
.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e5e7eb;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.nav-brand {
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1f36;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.5rem;
}

.nav-menu {
  padding: 1.5rem 1rem;
  flex: 1;
  overflow-y: auto;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: #6b7280;
  text-decoration: none;
  font-weight: 500;
  border-radius: 8px;
  margin-bottom: 0.25rem;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f8f9fe;
  color: #1a1f36;
  font-weight: 500;
}

.nav-link.router-link-active {
  background: #f1f5f9;
  color: #1a1f36;
  font-weight: 600;
}

.nav-link.dev-only {
  color: #f59e0b;
  font-size: 0.875rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
}

.nav-link.dev-only:hover {
  background: #fef3c7;
  color: #d97706;
}

.sidebar-bottom {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.environment-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

/* Main Content Area */
.main-content {
  margin-left: 280px;
  flex: 1;
  padding: 2rem;
  background: #f8f9fe;
  min-height: 100vh;
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toast {
  padding: 1rem 1.5rem;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 300px;
}

.toast.success { background: #10b981; color: white; }
.toast.error { background: #ef4444; color: white; }
.toast.info { background: #0052ff; color: white; }
.toast.warning { background: #f59e0b; color: white; }

/* Loader */
.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.firework-canvas-container {
  width: 180px;
  height: 180px;
}

/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8f9fe;
  color: #1a1f36;
}

/* Toast Animations */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-enter-active {
  animation: slideIn 0.3s ease;
}

.toast-leave-active {
  animation: slideIn 0.3s ease reverse;
}

/* Toast position adjustment for sidebar */
.toast-container {
  margin-left: 280px;
}

/* Button System */
button {
  font-family: inherit;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Primary Button */
.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.btn-primary:hover {
  background: #2563eb;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.btn-primary:active {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

/* Secondary Button */
.btn-secondary {
  background: white;
  color: #64748b;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f8fafc;
  color: #1e293b;
  border-color: #cbd5e1;
}

.btn-secondary:active {
  background: #f1f5f9;
}

.btn-secondary:disabled {
  background: #f8fafc;
  color: #cbd5e1;
  cursor: not-allowed;
}

/* Icon Button */
.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  font-size: 1rem;
}

.btn-icon:hover {
  background: #f8fafc;
  color: #1e293b;
  border-color: #cbd5e1;
}

.btn-icon .icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Button Variations */
.btn-danger {
  color: #ef4444;
  border-color: #fecaca;
}

.btn-danger:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fca5a5;
}

.btn-danger:active {
  background: #fee2e2;
}

/* Button Group */
.btn-group {
  display: flex;
  gap: 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

/* Close Button */
.close-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 1.5rem;
  padding: 0.5rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* Badge Button */
.badge-clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.badge-clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.badge-clickable:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

/* Typography System */
:root {
  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px - Badges, small labels */
  --text-sm: 0.875rem;   /* 14px - Button text, table content, secondary text */
  --text-base: 1rem;     /* 16px - Body text, form inputs */
  --text-lg: 1.125rem;   /* 18px - Section headings */
  --text-xl: 1.25rem;    /* 20px - Page subtitles */
  --text-2xl: 1.5rem;    /* 24px - Page titles */
  --text-3xl: 1.875rem;  /* 30px - Large titles */

  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

/* Base Typography */
body {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
}

/* Headings */
h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
}

/* Page Layout */
.page-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

/* Table Styles */
.table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  background-color: #f8fafc;
  font-weight: var(--font-medium);
  color: #64748b;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  background: white;
  border-radius: 8px;
  margin-top: 2rem;
}

.empty-state h3 {
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: #1e293b;
  margin: 0;
}

/* Form Styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: var(--font-medium);
  color: #1e293b;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: var(--text-base);
  color: #1e293b;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error-message {
  color: #ef4444;
  font-size: var(--text-sm);
  margin-top: 0.5rem;
}

.page-header {
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-header h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  color: #1e293b;
  margin: 0;
  padding: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Standardize Add Buttons */
.header-actions .btn-primary,
.btn-primary {
  min-width: 120px;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  height: 40px;
  background: #3b82f6;
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.content-header {
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.content-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  color: #1e293b;
  margin: 0;
  padding: 0;
}

/* Update existing components to use the typography system */
</style>
