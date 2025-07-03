<template>
  <div id="app">
    <!-- Hamburger menu for mobile/tablet -->
    <button class="hamburger" @click="toggleSidebar" aria-label="Open navigation" v-if="authStore.isAuthenticated">
      <span></span>
      <span></span>
      <span></span>
    </button>
    <!-- Loading Screen for Auth Initialization -->
    <div v-if="!authStore.isInitialized" class="auth-loading">
      <div class="auth-loading-content">
        <div class="firework-spinner"></div>
        <p>Loading Firework Factory...</p>
      </div>
    </div>

    <!-- Main App Content -->
    <div v-else-if="authStore.isAuthenticated" class="app-content">
      <nav :class="['sidebar', { open: isSidebarOpen }]">
        <div class="sidebar-header">
          <router-link :to="{ name: 'home' }" class="nav-brand" @click="handleNavClick">
            <span class="logo-text">Firework Factory</span>
          </router-link>
        </div>
        
        <!-- User Profile Section -->
        <div class="user-section">
          <div class="user-info" @click="toggleUserMenu">
            <div class="user-avatar">{{ authStore.initials }}</div>
            <div class="user-details">
              <div class="user-name">{{ authStore.displayName }}</div>
              <div class="user-role">{{ authStore.userProfile?.role || 'User' }}</div>
            </div>
            <span class="dropdown-arrow" :class="{ 'expanded': isUserMenuExpanded }">▼</span>
          </div>
          
          <!-- User Menu -->
          <div class="user-menu" :class="{ 'expanded': isUserMenuExpanded }">
            <router-link :to="{ name: 'profile' }" class="user-menu-item" @click="handleNavClick; isUserMenuExpanded = false">
              👤 Profile
            </router-link>
            <div class="user-menu-item theme-toggle-wrapper">
              <ThemeToggle />
            </div>
            <button @click="handleSignOut" class="user-menu-item sign-out">
              🚪 Sign Out
            </button>
          </div>
        </div>
        
        <div class="nav-menu">
          <!-- Dashboard -->
          <div class="nav-section">
            <router-link :to="{ name: 'home' }" class="nav-link" exact @click="handleNavClick">
              <span class="nav-text">Dashboard</span>
            </router-link>
          </div>

          <!-- Core Operations -->
          <div class="nav-section">
            <div class="nav-section-header">Operations</div>
            <router-link :to="{ name: 'products' }" class="nav-link" @click="handleNavClick">
              <span class="nav-text">Products</span>
            </router-link>
            <router-link :to="{ name: 'inventory' }" class="nav-link" @click="handleNavClick">
              <span class="nav-text">Inventory</span>
            </router-link>
            <router-link :to="{ name: 'orders' }" class="nav-link" @click="handleNavClick">
              <span class="nav-text">Orders</span>
            </router-link>
          </div>

          <!-- Management (hide on mobile) -->
          <div class="nav-section management-section">
            <div class="nav-section-header">Management</div>
            <router-link :to="{ name: 'categories' }" class="nav-link" @click="handleNavClick">
              <span class="nav-text">Categories</span>
            </router-link>
            <router-link :to="{ name: 'vendors' }" class="nav-link" @click="handleNavClick">
              <span class="nav-text">Vendors</span>
            </router-link>
            <router-link :to="{ name: 'statistics' }" class="nav-link" @click="handleNavClick">
              <span class="nav-text">Analytics</span>
            </router-link>
          </div>

          <!-- System Tools (Admin/Manager Only, hide on mobile) -->
          <div v-if="authStore.hasPermission('write')" class="nav-section system-section">
            <div 
              class="nav-section-header collapsible-header" 
              @click="toggleSystemSection"
            >
              <span>System</span>
              <span class="collapse-icon" :class="{ 'collapsed': !isSystemSectionExpanded }">▼</span>
            </div>
            <div class="collapsible-content" :class="{ 'collapsed': !isSystemSectionExpanded }">
              <router-link v-if="authStore.isAdmin" :to="{ name: 'backup' }" class="nav-link" @click="handleNavClick">
                <span class="nav-text">Backup</span>
              </router-link>
              <router-link v-if="authStore.isAdmin" :to="{ name: 'audit' }" class="nav-link" @click="handleNavClick">
                <span class="nav-text">Audit Logs</span>
              </router-link>
              <router-link :to="{ name: 'notifications' }" class="nav-link" @click="handleNavClick">
                <span class="nav-text">Notifications</span>
                <span v-if="unreadNotificationCount > 0" class="notification-badge">{{ unreadNotificationCount }}</span>
              </router-link>
            </div>
          </div>

          <!-- Development Tools (hide on mobile) -->
          <div v-if="environment === 'development' && authStore.isAdmin" class="nav-section dev-section">
            <div class="nav-section-header">Development</div>
            <router-link :to="{ name: 'error-monitoring' }" class="nav-link dev-only" @click="handleNavClick">
              <span class="nav-text">Error Monitor</span>
            </router-link>
          </div>
        </div>

        <div class="sidebar-bottom">
          <div class="environment-badge">
            {{ environment }}
          </div>
          <div class="sidebar-version">
            v{{ appVersion }}
          </div>
        </div>
      </nav>
      
      <div class="main-content">
        <router-view />
      </div>
    </div>

    <!-- Auth View for Non-Authenticated Users -->
    <div v-else class="auth-wrapper">
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
import notificationHistoryService from '@/services/notificationHistoryService.js'
import { useAuthStore } from '@/stores/auth.js'
import { useThemeStore } from '@/stores/theme.js'
import { APP_VERSION } from './version.js'

export default {
  name: 'App',
  components: {
    ToastNotification
  },
  data() {
    return {
      isLoading: false,
      toasts: [],
      environment: process.env.NODE_ENV,
      isSystemSectionExpanded: false, // Collapsed by default
      isUserMenuExpanded: false,
      isSidebarOpen: false, // For mobile/tablet
      unreadNotificationCount: 0,
      notificationService: notificationHistoryService,
      appVersion: APP_VERSION
    }
  },
  computed: {
    authStore() {
      return useAuthStore()
    }
  },
  async mounted() {
    // Initialize authentication
    await this.authStore.initializeAuth()
    
    // System section preferences are loaded in created() hook

    // Set up notification updates if authenticated
    if (this.authStore.isAuthenticated) {
      this.fetchUnreadNotificationCount()
      this.startNotificationPolling()
    }

    // Close user menu when clicking outside
    document.addEventListener('click', this.handleClickOutside)
    
    // Listen for route changes to update notification count
    this.$router.afterEach(() => {
      // Slight delay to allow for any notification updates from the new page
      setTimeout(() => {
        this.fetchUnreadNotificationCount()
      }, 500)
    })
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
    if (this.notificationPollingInterval) {
      clearInterval(this.notificationPollingInterval)
    }
    // Cleanup auth store
    this.authStore.cleanup()
    this.stopNotificationPolling()
  },
  methods: {
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
    },
    toggleSystemSection() {
      this.isSystemSectionExpanded = !this.isSystemSectionExpanded
      // Force a CSS reflow to ensure the transition works correctly
      // This helps with the visual glitch when toggling
      window.requestAnimationFrame(() => {
        const content = document.querySelector('.collapsible-content')
        if (content) {
          // Force reflow with getComputedStyle to ensure smooth transitions
          window.getComputedStyle(content).opacity
          // Apply additional style adjustments if needed
          if (this.isSystemSectionExpanded) {
            content.style.pointerEvents = 'auto'
          } else {
            // Small delay to ensure animation completes before disabling pointer events
            setTimeout(() => {
              if (!this.isSystemSectionExpanded) {
                content.style.pointerEvents = 'none'
              }
            }, 300)
          }
        }
      })
    },
    toggleUserMenu() {
      this.isUserMenuExpanded = !this.isUserMenuExpanded
    },
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
      // Prevent background scroll when sidebar is open on mobile
      if (this.isSidebarOpen && window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    },
    handleClickOutside(event) {
      // Close user menu if clicking outside
      if (!event.target.closest('.user-section')) {
        this.isUserMenuExpanded = false
      }
      // Close sidebar if clicking outside on mobile
      if (this.isSidebarOpen && window.innerWidth <= 768 && !event.target.closest('.sidebar') && !event.target.closest('.hamburger')) {
        this.isSidebarOpen = false
        document.body.style.overflow = ''
      }
    },
    async handleSignOut() {
      try {
        this.isUserMenuExpanded = false
        await this.authStore.signOut()
        this.$router.push({ name: 'auth' })
      } catch (error) {
        console.error('Sign out error:', error)
        this.showToast('Error signing out', 'error')
      }
    },
    async fetchUnreadNotificationCount() {
      if (!this.authStore.isAuthenticated) return
      
      try {
        const stats = await this.notificationService.getNotificationStatistics()
        this.unreadNotificationCount = stats.unreadCount || 0
      } catch (error) {
        console.warn('Failed to fetch unread notification count:', error)
        this.unreadNotificationCount = 0
      }
    },
    startNotificationPolling() {
      // Fetch immediately
      this.fetchUnreadNotificationCount()
      
      // Then poll every 30 seconds
      this.notificationPollingInterval = setInterval(() => {
        this.fetchUnreadNotificationCount()
      }, 30000)
    },
    stopNotificationPolling() {
      if (this.notificationPollingInterval) {
        clearInterval(this.notificationPollingInterval)
        this.notificationPollingInterval = null
      }
    },
    handleNavClick() {
      // Close sidebar on mobile after navigation
      if (window.innerWidth <= 768) {
        this.isSidebarOpen = false;
        document.body.style.overflow = '';
      }
    },
  },
  created() {
    // Expose toast method globally
    window.showToast = this.showToast
    window.showLoader = this.showLoader
    window.hideLoader = this.hideLoader
    
    // Development helper: expose notification testing function
    if (this.environment === 'development') {
      window.testNotifications = () => {
        this.showToast('Test success notification', 'success')
        setTimeout(() => this.showToast('Test error notification', 'error'), 500)
        setTimeout(() => this.showToast('Test warning notification', 'warning'), 1000)
        setTimeout(() => this.showToast('Test info notification', 'info'), 1500)
      }
    }
    // Always default to collapsed; no localStorage
    this.isSystemSectionExpanded = false
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
  transition: transform 0.3s ease;
  transform: translateX(0);
}

.sidebar.open {
  transform: translateX(0);
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1f36;
  display: flex;
  align-items: center;
}

.nav-menu {
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 1.5rem;
  transition: margin-bottom 0.3s ease;
}

.nav-section:last-child {
  margin-bottom: 0;
}

/* When System section is collapsed, reduce bottom margin */
.nav-section:has(.collapsible-content.collapsed) {
  margin-bottom: 0.75rem;
}

.nav-section-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
  margin-bottom: 0.5rem;
  padding: 0 1rem;
}

/* Collapsible System Section */
.collapsible-header {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: color 0.2s ease;
  user-select: none;
}

.collapsible-header:hover {
  color: #6b7280;
}

.collapse-icon {
  font-size: 0.625rem;
  transition: transform 0.2s ease;
  margin-right: 0.25rem;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.collapsible-content {
  max-height: 500px;
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.2s ease, margin-bottom 0.3s ease;
  opacity: 1;
  margin-bottom: 0.5rem;
  will-change: max-height, opacity; /* Optimize for animations */
}

.collapsible-content.collapsed {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
  pointer-events: none; /* Prevent clicks on hidden items */
  visibility: hidden; /* Further ensure no interaction with collapsed items */
  transition: max-height 0.3s ease, opacity 0.2s ease, margin-bottom 0.3s ease, visibility 0s linear 0.3s;
}

/* Notification Badge */
.notification-badge {
  background: #10b981;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  min-width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  animation: subtle-pulse 2s infinite;
}

@keyframes subtle-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
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

.nav-text {
  flex: 1;
}

.nav-link:hover {
  background: #f8f9fe;
  color: #1a1f36;
  font-weight: 500;
  transform: translateX(2px);
}

.nav-link.router-link-active {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #1a1f36;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.dev-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
  margin-top: 1rem;
}

.nav-link.dev-only {
  color: #f59e0b;
  font-size: 0.875rem;
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

.sidebar-version {
  margin-top: 0.5rem;
  color: #9ca3af;
  font-size: 0.8rem;
  text-align: center;
  letter-spacing: 0.05em;
  font-weight: 500;
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

html {
  width: 100%;
  height: 100%;
}

#app {
  width: 100%;
  min-height: 100vh;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8f9fe;
  color: #1a1f36;
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
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

/* Authentication Loading Screen */
.auth-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.auth-loading-content {
  text-align: center;
}

.firework-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-loading p {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
}

/* Auth Wrapper for Login/Register */
.auth-wrapper {
  width: 100%;
  min-height: 100vh;
}

/* User Section in Sidebar */
.user-section {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  user-select: none;
}

.user-info:hover {
  background-color: #f9fafb;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0; /* Allow text to truncate */
}

.user-name {
  font-weight: 600;
  color: #1a1f36;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.75rem;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-top: 2px;
}

.dropdown-arrow {
  font-size: 0.75rem;
  color: #9ca3af;
  transition: transform 0.2s ease;
  margin-left: 8px;
}

.dropdown-arrow.expanded {
  transform: rotate(180deg);
}

/* User Menu Dropdown */
.user-menu {
  position: absolute;
  top: 100%;
  left: 1rem;
  right: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 50;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.2s ease;
  opacity: 0;
}

.user-menu.expanded {
  max-height: 200px;
  opacity: 1;
}

.user-menu-item {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  color: #374151;
  text-decoration: none;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #e5e7eb;
}

.user-menu-item:last-child {
  border-bottom: none;
}

.user-menu-item:hover {
  background-color: #f9fafb;
}

.user-menu-item.sign-out {
  color: #dc2626;
}

.user-menu-item.sign-out:hover {
  background-color: #fef2f2;
}

/* App Content Layout */
.app-content {
  display: flex;
  width: 100%;
}

/* Adjust main content for auth layout */
.main-content {
  flex: 1;
  margin-left: 280px;
  padding: 2rem 2rem calc(4rem + 20px) 2rem; /* Added padding at bottom for footer */
  background: #f9fafb;
  min-height: 100vh;
}

/* When not authenticated, main content takes full width */
.auth-wrapper .main-content {
  margin-left: 0;
  padding: 0;
}

/* Remove the footer styles and add sidebar-version styles */
.app-footer {
  display: none !important;
}
.sidebar-version {
  margin-top: 0.5rem;
  color: #9ca3af;
  font-size: 0.8rem;
  text-align: center;
  letter-spacing: 0.05em;
  font-weight: 500;
}
@media (max-width: 1024px) {
  .sidebar {
    width: 220px;
  }
  .main-content {
    margin-left: 220px;
    padding: 1.5rem 1rem 4rem 1rem;
  }
  .toast-container {
    margin-left: 220px;
  }
}
</style>
