<template>
  <div class="home">
    <header class="hero">
      <h1>🎆 Firework Factory</h1>
      <p>Professional Firework Inventory Management System</p>
    </header>

    <div class="dashboard">
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Products</h3>
          <div class="stat-number">{{ totalProducts }}</div>
        </div>
        
        <div class="stat-card">
          <h3>Low Stock Items</h3>
          <div class="stat-number warning">{{ lowStockCount }}</div>
        </div>
        
        <div class="stat-card">
          <h3>Pending Orders</h3>
          <div class="stat-number">{{ pendingOrdersCount }}</div>
        </div>
        
        <div class="stat-card">
          <h3>Categories</h3>
          <div class="stat-number">{{ totalCategories }}</div>
        </div>
      </div>

      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="action-buttons">
          <router-link to="/products" class="action-btn primary">
            📦 Manage Products
          </router-link>
          <router-link to="/inventory" class="action-btn">
            📊 View Inventory
          </router-link>
          <router-link to="/orders" class="action-btn">
            🛒 Process Orders
          </router-link>
          <router-link to="/categories" class="action-btn">
            🏷️ Manage Categories
          </router-link>
          <router-link to="/vendors" class="action-btn">
            🏢 Manage Vendors
          </router-link>
        </div>
      </div>

      <div class="recent-activity">
        <h2>Recent Activity</h2>
        <div class="activity-list">
          <div class="activity-item" v-for="order in recentOrders" :key="order.id">
            <div class="activity-icon">📋</div>
            <div class="activity-content">
              <h4>New Order from {{ order.customerName }}</h4>
              <p>Total: ${{ (order.total !== undefined ? order.total : calculateOrderTotal(order)).toFixed(2) }} • {{ formatDate(order.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'

export default {
  name: 'HomeView',
  setup() {
    const store = useInventoryStore()

    onMounted(async () => {
      // Initialize store data from Firebase
      try {
        await store.initializeStore()
      } catch (error) {
        console.error('Failed to initialize store:', error)
      }
    })

    const totalProducts = computed(() => store.products.length)
    const lowStockCount = computed(() => store.getLowStockProducts().length)
    const pendingOrdersCount = computed(() => store.getPendingOrders.length)
    const totalCategories = computed(() => store.categories.length)
    const recentOrders = computed(() => 
      store.orders.slice(-3).reverse()
    )

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    const calculateOrderTotal = (order) => {
      // Fallback function to calculate order total
      if (!order.items || !Array.isArray(order.items)) return 0;
      return order.items.reduce((sum, item) => sum + (item.price || item.unitCost || 0) * (item.quantity || 0), 0);
    }

    return {
      totalProducts,
      lowStockCount,
      pendingOrdersCount,
      totalCategories,
      recentOrders,
      formatDate,
      calculateOrderTotal
    }
  }
}
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.hero {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 10px;
}

.hero p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.dashboard {
  display: grid;
  gap: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  text-align: center;
  border: 1px solid #e1e5e9;
}

.stat-card h3 {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: #1e293b;
}

.stat-number.warning {
  color: #f59e0b;
}

.quick-actions {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.quick-actions h2 {
  margin-bottom: 20px;
  color: #1e293b;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.action-btn {
  display: block;
  padding: 16px 20px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  text-decoration: none;
  color: #475569;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: #667eea;
  background: #f1f5f9;
  transform: translateY(-1px);
}

.action-btn.primary {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.action-btn.primary:hover {
  background: #5a67d8;
  border-color: #5a67d8;
}

.recent-activity {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.recent-activity h2 {
  margin-bottom: 20px;
  color: #1e293b;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.activity-icon {
  font-size: 1.5rem;
  margin-right: 15px;
}

.activity-content h4 {
  margin: 0 0 5px 0;
  color: #1e293b;
}

.activity-content p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
