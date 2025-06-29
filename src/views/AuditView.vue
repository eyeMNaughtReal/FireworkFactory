<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Audit Logs</h1>
      <div class="header-actions">
        <button class="btn-secondary" @click="refreshLogs">
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Audit Statistics -->
    <div class="stats-container">
      <div class="stat-card">
        <h3>Total Logs</h3>
        <div class="stat-value">{{ statistics.totalLogs || 0 }}</div>
      </div>
      <div class="stat-card">
        <h3>Today's Activity</h3>
        <div class="stat-value">{{ todayActivity || 0 }}</div>
      </div>
      <div class="stat-card">
        <h3>Most Active Collection</h3>
        <div class="stat-value">{{ mostActiveCollection || 'N/A' }}</div>
      </div>
      <div class="stat-card">
        <h3>Most Common Action</h3>
        <div class="stat-value">{{ mostCommonAction || 'N/A' }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <h2>Filters</h2>
      <div class="filter-grid">
        <div class="filter-group">
          <label for="collection-filter">Collection:</label>
          <select id="collection-filter" v-model="filters.collection" @change="applyFilters">
            <option value="">All Collections</option>
            <option value="products">Products</option>
            <option value="categories">Categories</option>
            <option value="vendors">Vendors</option>
            <option value="orders">Orders</option>
            <option value="inventory">Inventory</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="action-filter">Action:</label>
          <select id="action-filter" v-model="filters.action" @change="applyFilters">
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="view">View</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="limit-filter">Limit:</label>
          <select id="limit-filter" v-model="filters.limit" @change="applyFilters">
            <option :value="50">50 logs</option>
            <option :value="100">100 logs</option>
            <option :value="200">200 logs</option>
            <option :value="500">500 logs</option>
          </select>
        </div>
        
        <div class="filter-actions">
          <button class="btn-secondary" @click="clearFilters">
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Audit Logs Table -->
    <div class="logs-section">
      <h2>Activity Log</h2>
      
      <div v-if="isLoading" class="loading-state">
        <p>Loading audit logs...</p>
      </div>
      
      <div v-else-if="auditLogs.length === 0" class="empty-state">
        <h3>No Audit Logs Found</h3>
        <p>No logs match the current filters, or no activity has been recorded yet.</p>
      </div>
      
      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Collection</th>
              <th>Document ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" :class="getActionClass(log.action)">
              <td>{{ formatTimestamp(log.timestamp) }}</td>
              <td>
                <span class="action-badge" :class="log.action">
                  {{ log.action.toUpperCase() }}
                </span>
              </td>
              <td>{{ log.collection }}</td>
              <td>{{ log.documentId || 'N/A' }}</td>
              <td>
                <button 
                  class="btn-icon" 
                  @click="showLogDetails(log)"
                  title="View details"
                >
                  👁️
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <PagePagination
          v-if="auditLogs.length > itemsPerPage"
          :current-page="currentPage"
          :total-items="auditLogs.length"
          :per-page="itemsPerPage"
          @update:page="currentPage = $event"
        />
      </div>
    </div>

    <!-- Log Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Audit Log Details</h2>
          <button @click="closeDetailsModal" class="close-btn">&times;</button>
        </div>

        <div class="modal-content">
          <div v-if="selectedLog" class="log-details">
            <div class="detail-section">
              <h4>Basic Information</h4>
              <div class="detail-grid">
                <div><strong>Action:</strong> {{ selectedLog.action.toUpperCase() }}</div>
                <div><strong>Collection:</strong> {{ selectedLog.collection }}</div>
                <div><strong>Document ID:</strong> {{ selectedLog.documentId || 'N/A' }}</div>
                <div><strong>Timestamp:</strong> {{ formatTimestamp(selectedLog.timestamp) }}</div>
              </div>
            </div>

            <div v-if="selectedLog.data" class="detail-section">
              <h4>Data Involved</h4>
              <pre class="data-preview">{{ JSON.stringify(selectedLog.data, null, 2) }}</pre>
            </div>

            <div v-if="selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0" class="detail-section">
              <h4>Metadata</h4>
              <pre class="data-preview">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
            </div>

            <div class="detail-section">
              <h4>Technical Details</h4>
              <div class="detail-grid">
                <div><strong>User Agent:</strong> {{ selectedLog.userAgent || 'N/A' }}</div>
                <div><strong>URL:</strong> {{ selectedLog.url || 'N/A' }}</div>
                <div><strong>Log ID:</strong> {{ selectedLog.id }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeDetailsModal" class="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import auditService from '@/services/auditService'
import PagePagination from '@/components/PagePagination.vue'
import { useToast } from '@/components/Toast.vue'

export default {
  name: 'AuditView',
  components: {
    PagePagination
  },
  setup() {
    const toast = useToast()
    
    // State
    const statistics = reactive({})
    const auditLogs = ref([])
    const isLoading = ref(false)
    const currentPage = ref(1)
    const itemsPerPage = ref(25)
    
    // Filters
    const filters = reactive({
      collection: '',
      action: '',
      limit: 100
    })
    
    // Modal state
    const showDetailsModal = ref(false)
    const selectedLog = ref(null)

    // Computed
    const paginatedLogs = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value
      const endIndex = startIndex + itemsPerPage.value
      return auditLogs.value.slice(startIndex, endIndex)
    })

    const todayActivity = computed(() => {
      if (!statistics.activityByDay) return 0
      const today = new Date().toDateString()
      return statistics.activityByDay[today] || 0
    })

    const mostActiveCollection = computed(() => {
      if (!statistics.collectionCounts) return 'N/A'
      const entries = Object.entries(statistics.collectionCounts)
      if (entries.length === 0) return 'N/A'
      return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
    })

    const mostCommonAction = computed(() => {
      if (!statistics.actionCounts) return 'N/A'
      const entries = Object.entries(statistics.actionCounts)
      if (entries.length === 0) return 'N/A'
      return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
    })

    // Methods
    const loadData = async () => {
      isLoading.value = true
      try {
        const [stats, logs] = await Promise.all([
          auditService.getAuditStatistics(),
          auditService.getAuditLogs(filters)
        ])
        
        Object.assign(statistics, stats)
        auditLogs.value = logs
        currentPage.value = 1 // Reset pagination when data changes
      } catch (error) {
        console.error('Error loading audit data:', error)
        toast.error('Failed to load audit logs')
      } finally {
        isLoading.value = false
      }
    }

    const refreshLogs = async () => {
      await loadData()
      toast.success('Audit logs refreshed')
    }

    const applyFilters = async () => {
      await loadData()
    }

    const clearFilters = async () => {
      filters.collection = ''
      filters.action = ''
      filters.limit = 100
      await loadData()
    }

    const showLogDetails = (log) => {
      selectedLog.value = log
      showDetailsModal.value = true
    }

    const closeDetailsModal = () => {
      showDetailsModal.value = false
      selectedLog.value = null
    }

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return 'N/A'
      return timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    const getActionClass = (action) => {
      return `audit-row-${action}`
    }

    // Load data on mount
    onMounted(loadData)

    return {
      // State
      statistics,
      auditLogs,
      isLoading,
      currentPage,
      itemsPerPage,
      filters,
      
      // Modal
      showDetailsModal,
      selectedLog,
      
      // Computed
      paginatedLogs,
      todayActivity,
      mostActiveCollection,
      mostCommonAction,
      
      // Methods
      refreshLogs,
      applyFilters,
      clearFilters,
      showLogDetails,
      closeDetailsModal,
      formatTimestamp,
      getActionClass
    }
  }
}
</script>

<style scoped>
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
}

.filters-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.filters-section h2 {
  margin: 0 0 16px 0;
  color: #1f2937;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 16px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: #374151;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
}

.logs-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.logs-section h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
}

.action-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.action-badge.create {
  background: #d1fae5;
  color: #065f46;
}

.action-badge.update {
  background: #dbeafe;
  color: #1e40af;
}

.action-badge.delete {
  background: #fee2e2;
  color: #991b1b;
}

.action-badge.view {
  background: #f3f4f6;
  color: #374151;
}

.audit-row-create {
  background-color: #f0fdf4;
}

.audit-row-update {
  background-color: #eff6ff;
}

.audit-row-delete {
  background-color: #fef2f2;
}

.audit-row-view {
  background-color: #f9fafb;
}

.log-details {
  max-height: 500px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.data-preview {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-container {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
