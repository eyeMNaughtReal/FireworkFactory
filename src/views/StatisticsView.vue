<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Sales Statistics</h1>
      <div class="header-actions">
        <select v-model="selectedCategory" class="form-input" style="width: auto; min-width: 200px;">
          <option value="">All Categories</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
        <select v-model="sortBy" class="form-input" style="width: auto; min-width: 150px;">
          <option value="soldQuantity">Units Sold</option>
          <option value="soldPercentage">Sell-through %</option>
        </select>
        <button @click="refreshData" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Loading...' : 'Refresh Data' }}
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="refreshData" class="btn btn-small">Retry</button>
    </div>

    <!-- Debug Info (temporary) -->
    <div v-if="debug" class="debug-info">
      <p>Data Loading Status:</p>
      <ul>
        <li>Categories: {{ debug.categoriesLoaded ? '✅' : '❌' }}</li>
        <li>Vendors: {{ debug.vendorsLoaded ? '✅' : '❌' }}</li>
        <li>Products: {{ debug.productsLoaded ? '✅' : '❌' }}</li>
        <li>Orders: {{ debug.ordersLoaded ? '✅' : '❌' }}</li>
        <li>Inventory: {{ debug.inventoryLoaded ? '✅' : '❌' }}</li>
      </ul>
    </div>

    <!-- Summary Cards -->
    <div class="stats-summary">
      <div class="stat-card">
        <div class="stat-value">{{ filteredStats.totalProducts }}</div>
        <div class="stat-label">Products Tracked</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(filteredStats.totalOrdered) }}</div>
        <div class="stat-label">Total Units Ordered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(filteredStats.totalSold) }}</div>
        <div class="stat-label">Total Units Sold</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ filteredStats.avgSellThrough }}%</div>
        <div class="stat-label">Avg Sell-through</div>
      </div>
    </div>

    <!-- Statistics Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Category</th>
            <th>Units Ordered</th>
            <th>Units Remaining</th>
            <th>Units Sold</th>
            <th>Sell-through %</th>
            <th>Performance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stat in sortedStats" :key="stat.productId">
            <td>
              <div class="product-info">
                <span class="product-name">{{ stat.productName }}</span>
                <span class="product-vendor">{{ stat.vendorName }}</span>
              </div>
            </td>
            <td>
              <span class="category-badge">{{ stat.categoryName }}</span>
            </td>
            <td class="number">{{ formatNumber(stat.orderedQuantity) }}</td>
            <td class="number">{{ formatNumber(stat.remainingQuantity) }}</td>
            <td class="number highlight">{{ formatNumber(stat.soldQuantity) }}</td>
            <td class="number">
              <span class="percentage" :class="getPerformanceClass(stat.soldPercentage)">
                {{ stat.soldPercentage }}%
              </span>
            </td>
            <td>
              <span class="performance-badge" :class="getPerformanceClass(stat.soldPercentage)">
                {{ getPerformanceLabel(stat.soldPercentage) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="sortedStats.length === 0" class="empty-state">
        <h3>No Sales Data Available</h3>
        <p>Add some orders and inventory data to see sales statistics.</p>
        <button @click="addSampleData" class="btn btn-primary" style="margin-top: 1rem;">
          Add Sample Data
        </button>
      </div>
    </div>

    <!-- Top Performers Section -->
    <div class="top-performers" v-if="topPerformers.length > 0">
      <h2>Top Performers {{ selectedCategoryName ? `in ${selectedCategoryName}` : 'Overall' }}</h2>
      <div class="performer-grid">
        <div 
          v-for="(performer, index) in topPerformers" 
          :key="performer.productId" 
          class="performer-card"
          :class="`rank-${index + 1}`"
        >
          <div class="rank">#{{ index + 1 }}</div>
          <div class="performer-info">
            <h3>{{ performer.productName }}</h3>
            <p class="category">{{ performer.categoryName }}</p>
            <div class="stats">
              <span class="sold">{{ formatNumber(performer.soldQuantity) }} sold</span>
              <span class="percentage">{{ performer.soldPercentage }}% sell-through</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading and Error States -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Loading statistics data...</p>
    </div>
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script>
import { useInventoryStore } from '@/stores/inventory.js'
import { useToast } from '@/components/Toast.vue'

export default {
  name: 'StatisticsView',
  data() {
    return {
      selectedCategory: '',
      sortBy: 'soldQuantity',
      loading: false,
      error: null,
      debug: {
        productsLoaded: false,
        ordersLoaded: false,
        inventoryLoaded: false,
        categoriesLoaded: false,
        vendorsLoaded: false
      }
    }
  },
  computed: {
    store() {
      return useInventoryStore()
    },
    toast() {
      return useToast()
    },
    categories() {
      return this.store.categories
    },
    products() {
      return this.store.products
    },
    orders() {
      return this.store.orders
    },
    inventory() {
      return this.store.inventory
    },
    selectedCategoryName() {
      if (!this.selectedCategory) return ''
      const category = this.categories.find(c => c.id === this.selectedCategory)
      return category ? category.name : ''
    },
    salesStats() {
      return this.products.map(product => {
        // Calculate total ordered quantity from all orders over time
        const orderedQuantity = this.orders
          .filter(order => order.status !== 'cancelled') // Exclude cancelled orders
          .reduce((total, order) => {
            // Look through items array in each order
            const orderItems = order.items || []
            const productItems = orderItems.filter(item => item.productId === product.id)
            return total + productItems.reduce((itemTotal, item) => {
              // Use actualQuantity if available (this is the converted quantity in individual units)
              // Otherwise fall back to quantity (cases/packs) and use unit conversion
              if (item.actualQuantity) {
                return itemTotal + item.actualQuantity
              }
              
              // If no actualQuantity, calculate based on unit and unitConfig
              if (item.unit && product.unitConfig) {
                const config = product.unitConfig
                if (item.unit === 'case') {
                  return itemTotal + (item.quantity * (config.totalItemsPerCase || config.case.conversionRate))
                } else if (item.unit === 'pack') {
                  return itemTotal + (item.quantity * config.package.conversionRate)
                }
              }
              
              // Fallback to raw quantity if no conversion possible
              return itemTotal + (item.quantity || 0)
            }, 0)
          }, 0)

        // Get current inventory
        const inventoryItem = this.inventory.find(inv => inv.productId === product.id)
        const remainingQuantity = inventoryItem ? inventoryItem.quantity : 0

        // Calculate sold quantity (ordered - remaining)
        const soldQuantity = Math.max(0, orderedQuantity - remainingQuantity)
        
        // Calculate sell-through percentage
        const soldPercentage = orderedQuantity > 0 
          ? Math.round((soldQuantity / orderedQuantity) * 100) 
          : 0

        // Get related data
        const category = this.categories.find(c => c.id === product.categoryId)
        const vendor = this.store.getVendorById(product.vendorId)

        return {
          productId: product.id,
          productName: product.name,
          categoryId: product.categoryId,
          categoryName: category ? category.name : 'Unknown',
          vendorName: vendor ? vendor.name : 'Unknown',
          orderedQuantity,
          remainingQuantity,
          soldQuantity,
          soldPercentage
        }
      }).filter(stat => stat.orderedQuantity > 0) // Only show products that had orders
    },
    filteredStats() {
      let stats = this.salesStats
      
      if (this.selectedCategory) {
        stats = stats.filter(stat => stat.categoryId === this.selectedCategory)
      }

      return {
        totalProducts: stats.length,
        totalOrdered: stats.reduce((sum, stat) => sum + stat.orderedQuantity, 0),
        totalSold: stats.reduce((sum, stat) => sum + stat.soldQuantity, 0),
        avgSellThrough: stats.length > 0 
          ? Math.round(stats.reduce((sum, stat) => sum + stat.soldPercentage, 0) / stats.length)
          : 0
      }
    },
    sortedStats() {
      let stats = this.salesStats
      
      if (this.selectedCategory) {
        stats = stats.filter(stat => stat.categoryId === this.selectedCategory)
      }

      return stats.sort((a, b) => {
        switch (this.sortBy) {
          case 'soldQuantity':
            return b.soldQuantity - a.soldQuantity
          case 'soldPercentage':
            return b.soldPercentage - a.soldPercentage
          default:
            return 0
        }
      })
    },
    topPerformers() {
      return this.sortedStats.slice(0, 3)
    }
  },
  methods: {
    formatNumber(num) {
      return new Intl.NumberFormat().format(num)
    },
    formatCurrency(num) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num)
    },
    getPerformanceClass(percentage) {
      if (percentage >= 80) return 'excellent'
      if (percentage >= 60) return 'good'
      if (percentage >= 40) return 'average'
      return 'poor'
    },
    getPerformanceLabel(percentage) {
      if (percentage >= 80) return 'Excellent'
      if (percentage >= 60) return 'Good'
      if (percentage >= 40) return 'Average'
      return 'Poor'
    },
    async loadData() {
      this.loading = true
      this.error = null
      
      try {
        // Load data sequentially to better track what's loaded
        try {
          await this.store.fetchCategories()
          this.debug.categoriesLoaded = true
          console.log('Categories loaded:', this.categories.length, 'categories found')
          this.categories.forEach(c => console.log('Category:', c.id, c.name))
        } catch (e) {
          console.error('Failed to load categories:', e)
          this.error = 'Failed to load categories'
        }

        try {
          await this.store.fetchVendors()
          this.debug.vendorsLoaded = true
          console.log('Vendors loaded:', this.store.vendors.length, 'vendors found')
          this.store.vendors.forEach(v => console.log('Vendor:', v.id, v.name))
        } catch (e) {
          console.error('Failed to load vendors:', e)
          this.error = 'Failed to load vendors'
        }

        try {
          await this.store.fetchProducts()
          this.debug.productsLoaded = true
          console.log('Products loaded:', this.products.length, 'products found')
          this.products.forEach(p => console.log('Product:', p.id, p.name, 'CategoryId:', p.categoryId))
        } catch (e) {
          console.error('Failed to load products:', e)
          this.error = 'Failed to load products'
        }

        try {
          await this.store.fetchOrders()
          this.debug.ordersLoaded = true
          console.log('Orders loaded:', this.orders.length, 'orders found')
          this.orders.forEach(o => {
            console.log('Order:', o.id, 'Items:', o.items?.length || 0)
            o.items?.forEach(item => console.log('- Order Item:', item.productId, 'Quantity:', item.quantity, 'ActualQuantity:', item.actualQuantity))
          })
        } catch (e) {
          console.error('Failed to load orders:', e)
          this.error = 'Failed to load orders'
        }

        try {
          await this.store.fetchInventory()
          this.debug.inventoryLoaded = true
          console.log('Inventory loaded:', this.inventory.length, 'inventory records found')
          this.inventory.forEach(i => console.log('Inventory:', i.productId, 'Quantity:', i.quantity))
        } catch (e) {
          console.error('Failed to load inventory:', e)
          this.error = 'Failed to load inventory'
        }

        // Log computed values
        const stats = this.salesStats
        console.log('Sales stats computed:', stats.length, 'products with orders found')
        stats.forEach(stat => {
          console.log('Product Stats:', {
            name: stat.productName,
            ordered: stat.orderedQuantity,
            remaining: stat.remainingQuantity,
            sold: stat.soldQuantity,
            sellThrough: stat.soldPercentage + '%'
          })
        })

      } catch (error) {
        this.error = 'Failed to load statistics data'
        console.error('Error loading statistics data:', error)
        this.toast.error(this.error)
      } finally {
        this.loading = false
      }
    },
    async refreshData() {
      this.loading = true
      this.error = null
      this.debug = {
        productsLoaded: false,
        ordersLoaded: false,
        inventoryLoaded: false,
        categoriesLoaded: false,
        vendorsLoaded: false
      }

      try {
        await Promise.all([
          this.store.fetchCategories(),
          this.store.fetchVendors(),
          this.store.fetchProducts(),
          this.store.fetchOrders(),
          this.store.fetchInventory()
        ])

        this.debug.categoriesLoaded = true
        this.debug.vendorsLoaded = true
        this.debug.productsLoaded = true
        this.debug.ordersLoaded = true
        this.debug.inventoryLoaded = true

        this.toast.success('Data reloaded successfully')
      } catch (error) {
        this.error = 'Failed to reload data'
        console.error('Error reloading data:', error)
        this.toast.error(this.error)
      } finally {
        this.loading = false
      }
    },
    async addSampleData() {
      try {
        // First add a category
        const categoryData = {
          name: "Test Category",
          description: "Sample category for testing"
        }
        console.log('Adding category:', categoryData)
        const category = await this.store.addCategory(categoryData)
        console.log('Category added:', category)
        
        // Add a vendor
        const vendorData = {
          name: "Test Vendor",
          email: "test@example.com",
          phone: "555-0123"
        }
        console.log('Adding vendor:', vendorData)
        const vendor = await this.store.addVendor(vendorData)
        console.log('Vendor added:', vendor)
        
        // Add products
        const products = [
          {
            name: "Test Firework 1",
            categoryId: category.id,
            vendorId: vendor.id,
            description: "A test firework product",
            unitConfig: {
              structure: "item-package-case",
              case: { conversionRate: 4 },
              package: { conversionRate: 12 },
              totalItemsPerCase: 48
            }
          },
          {
            name: "Test Firework 2",
            categoryId: category.id,
            vendorId: vendor.id,
            description: "Another test firework product",
            unitConfig: {
              structure: "item-package-case",
              case: { conversionRate: 6 },
              package: { conversionRate: 8 },
              totalItemsPerCase: 48
            }
          }
        ]
        
        for (const productData of products) {
          console.log('Adding product:', productData)
          const product = await this.store.addProduct(productData)
          console.log('Product added:', product)
          
          // Add an order for this product
          const orderData = {
            items: [{
              productId: product.id,
              unit: 'case',
              quantity: 10,
              actualQuantity: 480, // Total individual items (48 items per case * 10 cases)
              unitCost: 20
            }],
            status: 'received',
            season: '',
            total: 200, // 10 cases * $20
            orderDate: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
          console.log('Adding order:', orderData)
          await this.store.addOrder(orderData)
          
          // Add inventory - half of the ordered quantity remaining
          const inventoryData = {
            productId: product.id,
            quantity: 240, // Half of the actualQuantity
            lastUpdated: new Date().toISOString()
          }
          console.log('Adding inventory:', inventoryData)
          await this.store.addInventory(inventoryData)
        }
        
        this.toast.success('Sample data added successfully')
        await this.loadData() // Reload the view
        
      } catch (error) {
        console.error('Error adding sample data:', error)
        this.toast.error('Failed to add sample data')
      }
    }
  },
  watch: {
    error(newError) {
      if (newError) {
        this.toast.error(newError)
      }
    }
  },
  async mounted() {
    await this.loadData()
  }
}
</script>

<style scoped>
.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.product-name {
  font-weight: 500;
  color: #1e293b;
}

.product-vendor {
  font-size: 0.75rem;
  color: #64748b;
}

.category-badge {
  background: #f1f5f9;
  color: #475569;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.number.highlight {
  font-weight: 600;
  color: #059669;
}

.percentage.excellent {
  color: #059669;
  font-weight: 600;
}

.percentage.good {
  color: #0284c7;
  font-weight: 500;
}

.percentage.average {
  color: #d97706;
  font-weight: 500;
}

.percentage.poor {
  color: #dc2626;
  font-weight: 500;
}

.performance-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.performance-badge.excellent {
  background: #dcfce7;
  color: #059669;
}

.performance-badge.good {
  background: #dbeafe;
  color: #0284c7;
}

.performance-badge.average {
  background: #fed7aa;
  color: #d97706;
}

.performance-badge.poor {
  background: #fecaca;
  color: #dc2626;
}

.top-performers {
  margin-top: 3rem;
}

.top-performers h2 {
  margin-bottom: 1.5rem;
  color: #1e293b;
}

.performer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.performer-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease;
}

.performer-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.performer-card.rank-1 {
  border-left: 4px solid #fbbf24;
}

.performer-card.rank-2 {
  border-left: 4px solid #9ca3af;
}

.performer-card.rank-3 {
  border-left: 4px solid #cd7c2f;
}

.rank {
  font-size: 1.5rem;
  font-weight: 700;
  color: #64748b;
  min-width: 2.5rem;
  text-align: center;
}

.performer-card.rank-1 .rank {
  color: #fbbf24;
}

.performer-card.rank-2 .rank {
  color: #9ca3af;
}

.performer-card.rank-3 .rank {
  color: #cd7c2f;
}

.performer-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  color: #1e293b;
}

.performer-info .category {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #64748b;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stats .sold {
  font-weight: 600;
  color: #059669;
  font-size: 0.875rem;
}

.stats .percentage {
  font-size: 0.75rem;
  color: #64748b;
}

/* Add loading and error states */
.loading {
  opacity: 0.6;
  pointer-events: none;
}

.error-message {
  color: #dc2626;
  padding: 1rem;
  margin: 1rem 0;
  background: #fee2e2;
  border-radius: 8px;
  text-align: center;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.debug-info {
  margin: 1rem 0;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.debug-info ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
}

.debug-info li {
  margin: 0.25rem 0;
  font-family: monospace;
}
</style>
