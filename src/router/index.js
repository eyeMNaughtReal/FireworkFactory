import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { requireAuth, requireAdmin, guestOnly } from './guards.js'

const routes = [
  // Public routes
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/AuthView.vue'),
    beforeEnter: guestOnly,
    meta: { requiresGuest: true }
  },
  
  // Protected routes
  {
    path: '/',
    name: 'home',
    component: HomeView,
    beforeEnter: requireAuth
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    beforeEnter: requireAuth
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('@/views/InventoryView.vue'),
    beforeEnter: requireAuth
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('@/views/ProductsView.vue'),
    props: route => ({ id: route.query.id }),
    beforeEnter: requireAuth
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('@/views/CategoriesView.vue'),
    props: route => ({ id: route.query.id }),
    beforeEnter: requireAuth
  },
  {
    path: '/vendors',
    name: 'vendors',
    component: () => import('@/views/VendorsView.vue'),
    props: route => ({ id: route.query.id }),
    beforeEnter: requireAuth
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('@/views/OrdersView.vue'),
    props: route => ({ 
      id: route.query.id,
      productId: route.query.productId,
      vendorId: route.query.vendorId
    }),
    beforeEnter: requireAuth
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: () => import('@/views/StatisticsView.vue'),
    beforeEnter: requireAuth
  },
  {
    path: '/backup',
    name: 'backup',
    component: () => import('@/views/BackupView.vue'),
    beforeEnter: requireAdmin
  },
  {
    path: '/audit',
    name: 'audit',
    component: () => import('@/views/AuditView.vue'),
    beforeEnter: requireAdmin
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('@/views/NotificationHistoryView.vue'),
    beforeEnter: requireAuth
  },
  {
    path: '/error-monitoring',
    name: 'error-monitoring',
    component: () => import('@/views/ErrorMonitoringDemo.vue'),
    beforeEnter: requireAdmin
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
