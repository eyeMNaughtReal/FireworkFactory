import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('@/views/InventoryView.vue')
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('@/views/ProductsView.vue'),
    props: route => ({ id: route.query.id })
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('@/views/CategoriesView.vue'),
    props: route => ({ id: route.query.id })
  },
  {
    path: '/vendors',
    name: 'vendors',
    component: () => import('@/views/VendorsView.vue'),
    props: route => ({ id: route.query.id })
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('@/views/OrdersView.vue'),
    props: route => ({ 
      id: route.query.id,
      productId: route.query.productId,
      vendorId: route.query.vendorId
    })
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
