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
          <option value="revenue">Est. Revenue</option>
        </select>
      </div>
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
            <th>Est. Revenue</th>
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
            <td class="number">${{ formatCurrency(stat.estimatedRevenue) }}</td>
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
      loading: false
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
        // Calculate total ordered quantity from orders
        const productOrders = this.orders.filter(order => order.productId === product.id)
        const orderedQuantity = productOrders.reduce((total, order) => {
          return total + (order.quantity || 0)
        }, 0)

        // Get current inventory
        const inventoryItem = this.inventory.find(inv => inv.productId === product.id)
        const remainingQuantity = inventoryItem ? inventoryItem.quantity : 0

        // Calculate sold quantity
        const soldQuantity = Math.max(0, orderedQuantity - remainingQuantity)
        
        // Calculate sell-through percentage
        const soldPercentage = orderedQuantity > 0 
          ? Math.round((soldQuantity / orderedQuantity) * 100) 
          : 0

        // Estimate revenue (assuming average price of $2 per unit - could be made configurable)
        const estimatedUnitPrice = 2.00
        const estimatedRevenue = soldQuantity * estimatedUnitPrice

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
          soldPercentage,
          estimatedRevenue
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
          case 'revenue':
            return b.estimatedRevenue - a.estimatedRevenue
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
      try {
        await Promise.all([
          this.store.fetchProducts(),
          this.store.fetchCategories(),
          this.store.fetchVendors(),
          this.store.fetchOrders(),
          this.store.fetchInventory()
        ])
      } catch (error) {
        this.toast.error('Failed to load statistics data')
        console.error('Error loading statistics data:', error)
      } finally {
        this.loading = false
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
</style>
