<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Dashboard Overview</h1>
      <div class="header-actions">
        <button class="btn-primary" @click="navigateToAddOrder">
          Quick Add Order
        </button>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Low Stock Products Table -->
      <div class="dashboard-card">
        <div class="card-header">
          <h2 class="card-title">Low Stock Products</h2>
          <router-link to="/inventory" class="view-all-link">View All</router-link>
        </div>
        <div class="table-container">
          <table class="data-table" v-if="lowStockProducts.length > 0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in lowStockProducts.slice(0, 10)" :key="product.id">
                <td>
                  <div class="product-info">
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-category">{{ getCategoryName(product.categoryId) }}</div>
                  </div>
                </td>
                <td>
                  <span class="stock-quantity">{{ getProductStock(product.id) }}</span>
                </td>
                <td>
                  <span class="threshold-value">{{ getProductThreshold(product) }}</span>
                </td>
                <td>
                  <span class="status-badge" :class="getProductStock(product.id) === 0 ? 'status-offline' : 'status-low'">
                    {{ getProductStock(product.id) === 0 ? 'Out of Stock' : 'Low Stock' }}
                  </span>
                </td>
                <td>
                  <button class="btn-small btn-primary" @click="createOrderForProduct(product)">
                    Order Now
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <p>No low stock products - everything looks good! 🎉</p>
          </div>
        </div>
      </div>

      <!-- Ordered Status Orders Table -->
      <div class="dashboard-card">
        <div class="card-header">
          <h2 class="card-title">Pending Orders</h2>
          <router-link to="/orders?status=ordered" class="view-all-link">View All</router-link>
        </div>
        <div class="table-container">
          <table class="data-table" v-if="orderedStatusOrders.length > 0">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Order Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orderedStatusOrders.slice(0, 10)" :key="order.id">
                <td>
                  <span class="order-number">{{ order.orderNumber || order.id.slice(-6) }}</span>
                </td>
                <td>
                  <span class="order-date">{{ formatDate(order.orderDate || order.createdAt) }}</span>
                </td>
                <td>
                  <span class="item-count">{{ order.items?.length || 0 }} items</span>
                </td>
                <td>
                  <span class="order-total">${{ (order.total || calculateOrderTotal(order)).toFixed(2) }}</span>
                </td>
                <td>
                  <button class="btn-small btn-success" @click="markOrderReceived(order)">
                    Mark Received
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <p>No pending orders - all caught up! ✅</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useRouter } from 'vue-router'

export default {
  name: 'HomeView',
  setup() {
    const store = useInventoryStore()
    const router = useRouter()

    onMounted(async () => {
      try {
        await Promise.all([
          store.products.length === 0 ? store.fetchProducts() : Promise.resolve(),
          store.categories.length === 0 ? store.fetchCategories() : Promise.resolve(),
          store.vendors.length === 0 ? store.fetchVendors() : Promise.resolve(),
          store.orders.length === 0 ? store.fetchOrders() : Promise.resolve(),
          store.inventory.length === 0 ? store.fetchInventory() : Promise.resolve()
        ])
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      }
    })

    // Get low stock products based on inventory
    const lowStockProducts = computed(() => {
      // Show both low and out of stock products
      return store.products.filter(product => {
        const stock = getProductStock(product.id)
        const threshold = getProductThreshold(product)
        // Show if at or below threshold, including zero
        return stock <= threshold
      })
    })

    // Get orders with pending/ordered status (not received or cancelled)
    const orderedStatusOrders = computed(() => {
      return store.orders.filter(order => 
        order.status && 
        order.status !== 'received' && 
        order.status !== 'cancelled'
      ).sort((a, b) => new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt))
    })

    const getCategoryName = (categoryId) => {
      const category = store.categories.find(c => c.id === categoryId)
      return category ? category.name : 'Unknown'
    }

    const getProductStock = (productId) => {
      const inventoryItem = store.inventory.find(inv => inv.productId === productId)
      // Always return a number
      return Number(inventoryItem ? inventoryItem.quantity : 0)
    }

    const getProductThreshold = (product) => {
      return product.thresholdInItems || product.lowInventoryThreshold || 0
    }

    const formatDate = (dateValue) => {
      if (!dateValue) return 'N/A'
      
      // Handle Firestore timestamps
      if (typeof dateValue === 'object') {
        if (typeof dateValue.toDate === 'function') {
          return dateValue.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
        if ('seconds' in dateValue) {
          return new Date(dateValue.seconds * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
      }
      
      return new Date(dateValue).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const calculateOrderTotal = (order) => {
      if (!order.items || !Array.isArray(order.items)) return 0
      return order.items.reduce((sum, item) => 
        sum + (item.unitCost || 0) * (item.quantity || 0), 0)
    }

    const navigateToAddOrder = () => {
      router.push('/orders?action=add')
    }

    const createOrderForProduct = (product) => {
      // Navigate to orders page with product pre-selected
      router.push(`/orders?action=add&productId=${product.id}`)
    }

    const markOrderReceived = async (order) => {
      try {
        await store.updateOrder(order.id, { 
          status: 'received',
          receivedDate: new Date().toISOString()
        })
        
        // Update inventory for received order
        await store.fetchInventory()
        
        await Promise.all(order.items.map(async (item) => {
          const inventoryItem = store.getInventoryByProduct(item.productId)
          const currentQuantity = inventoryItem ? inventoryItem.quantity : 0
          
          // Calculate items to add based on unit configuration
          const product = store.products.find(p => p.id === item.productId)
          let itemsToAdd = item.quantity
          
          if (product && product.unitConfig) {
            switch (item.unit) {
              case 'case':
                if (product.unitConfig.structure === 'item-package-case') {
                  itemsToAdd = item.quantity * product.unitConfig.totalItemsPerCase
                } else {
                  itemsToAdd = item.quantity * product.unitConfig.case.conversionRate
                }
                break
              case 'pack':
                if (product.unitConfig.structure === 'item-package-case') {
                  itemsToAdd = item.quantity * product.unitConfig.package.conversionRate
                }
                break
              case 'item':
                itemsToAdd = item.quantity
                break
            }
          }
          
          const newQuantity = currentQuantity + itemsToAdd
          
          // Always use numeric value for consistency
          if (!inventoryItem) {
            await store.updateInventory(item.productId, itemsToAdd)
          } else {
            await store.updateInventory(item.productId, newQuantity)
          }
        }))
        
      } catch (error) {
        console.error('Failed to mark order as received:', error)
      }
    }

    return {
      lowStockProducts,
      orderedStatusOrders,
      getCategoryName,
      getProductStock,
      getProductThreshold,
      formatDate,
      calculateOrderTotal,
      navigateToAddOrder,
      createOrderForProduct,
      markOrderReceived
    }
  }
}
</script>

<style scoped>
.page-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

.dashboard-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0 24px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.view-all-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.view-all-link:hover {
  color: #2563eb;
}

.table-container {
  padding: 0 24px 24px 24px;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.875rem;
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #374151;
}

.data-table tbody tr:hover {
  background: #f8fafc;
}

.product-info {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.product-category {
  font-size: 0.875rem;
  color: #64748b;
}

.stock-quantity {
  font-weight: 600;
  color: #dc2626;
}

.threshold-value {
  color: #374151;
}

.order-number {
  font-weight: 600;
  color: #1e293b;
}

.order-date {
  color: #64748b;
}

.item-count {
  color: #374151;
}

.order-total {
  font-weight: 600;
  color: #059669;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-low {
  background: #fef3c7;
  color: #92400e;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-offline {
  background: #fee2e2;
  color: #991b1b;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.875rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #64748b;
}

.empty-state p {
  font-size: 1.125rem;
  margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .table-container {
    padding: 0 16px 16px 16px;
  }
  
  .data-table {
    font-size: 0.875rem;
  }
  
  .data-table th,
  .data-table td {
    padding: 8px 12px;
  }
}
</style>
