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
          <button type="button" class="close-btn" @click="closeDetailsModal" title="Close" aria-label="Close">×</button>
        </div>

        <div v-if="selectedLog" class="modal-content">
            <!-- Header Information -->
            <div class="header-info">
              <div class="detail-header">
                <span class="action-badge large" :class="selectedLog.action">
                  {{ selectedLog.action.toUpperCase() }}
                </span>
                <span class="collection-badge">{{ selectedLog.collection }}</span>
                <span class="timestamp-badge">{{ formatTimestamp(selectedLog.timestamp) }}</span>
              </div>
              <div class="document-info">
                <span class="detail-label">Document ID:</span>
                <span class="document-id">{{ selectedLog.documentId || 'N/A' }}</span>
              </div>
            </div>
            
            <!-- Sidebar Information -->
            <div class="sidebar-content">
              <!-- Additional Information -->
              <div v-if="selectedLog.metadata" class="detail-section metadata-section">
                <div class="section-header">
                  <h4>Additional Context</h4>
                </div>
                <div class="metadata-grid">
                  <div class="metadata-item" v-for="(value, key) in selectedLog.metadata" :key="key">
                    <span class="metadata-name">{{ formatFieldName(key) }}</span>
                    <span class="metadata-value">{{ formatValue(value) }}</span>
                  </div>
                </div>
              </div>

              <!-- System Information -->
              <div class="detail-section system-section">
                <div class="section-header">
                  <h4>System Information</h4>
                </div>
                <div class="system-grid">
                  <div class="system-item">
                    <span class="system-label">Browser</span>
                    <span class="system-value">{{ formatUserAgent(selectedLog.userAgent) }}</span>
                  </div>
                  <div class="system-item">
                    <span class="system-label">Location</span>
                    <span class="system-value">{{ selectedLog.url || 'N/A' }}</span>
                  </div>
                  <div class="system-item">
                    <span class="system-label">Log Reference</span>
                    <span class="system-value log-id">{{ selectedLog.id }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Changes Section -->
            <div v-if="selectedLog.data" class="detail-section changes-section">
              <div class="section-header">
                <h4>
                  <span v-if="selectedLog.action === 'create'">New Record Details</span>
                  <span v-else-if="selectedLog.action === 'update'">Changed Fields</span>
                  <span v-else-if="selectedLog.action === 'delete'">Deleted Record Details</span>
                  <span v-else>Record Details</span>
                </h4>
              </div>

              <div class="changes-content">
                <!-- Create Action -->
                <template v-if="selectedLog.action === 'create'">
                  <div class="changes-grid">
                    <div class="change-item" v-for="(value, key) in selectedLog.data" :key="key">
                      <span class="field-name">{{ formatFieldName(key) }}</span>
                      <span class="field-value new">{{ formatValue(value) }}</span>
                    </div>
                  </div>
                </template>
                
                <!-- Update Action -->
                <template v-else-if="selectedLog.action === 'update'">
                  <div class="changes-grid">
                    <div class="change-item" v-for="(value, key) in selectedLog.data" :key="key">
                      <span class="field-name">{{ formatFieldName(key) }}</span>
                      <div class="update-values">
                        <div class="value-row previous" v-if="value.old !== undefined">
                          <span class="value-indicator">Previous</span>
                          <span class="value-content">{{ formatValue(value.old) }}</span>
                        </div>
                        <div class="value-row new" v-if="value.new !== undefined">
                          <span class="value-indicator">New</span>
                          <span class="value-content">{{ formatValue(value.new) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                
                <!-- Delete Action -->
                <template v-else-if="selectedLog.action === 'delete'">
                  <div class="deleted-notice">
                    <span class="warning-icon">⚠️</span>
                    This record was permanently deleted
                  </div>
                  <div class="changes-grid deleted">
                    <div class="change-item" v-for="(value, key) in selectedLog.data" :key="key">
                      <span class="field-name">{{ formatFieldName(key) }}</span>
                      <span class="field-value deleted">{{ formatValue(value) }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Additional Information -->
            <div v-if="selectedLog.metadata" class="detail-section metadata-section">
              <div class="section-header">
                <h4>Additional Context</h4>
              </div>
              <div class="metadata-grid">
                <div class="metadata-item" v-for="(value, key) in selectedLog.metadata" :key="key">
                  <span class="metadata-name">{{ formatFieldName(key) }}</span>
                  <span class="metadata-value">{{ formatValue(value) }}</span>
                </div>
              </div>
            </div>

            <!-- System Information -->
            <div class="detail-section system-section">
              <div class="section-header">
                <h4>System Information</h4>
              </div>
              <div class="system-grid">
                <div class="system-item">
                  <span class="system-label">Browser</span>
                  <span class="system-value">{{ formatUserAgent(selectedLog.userAgent) }}</span>
                </div>
                <div class="system-item">
                  <span class="system-label">Location</span>
                  <span class="system-value">{{ selectedLog.url || 'N/A' }}</span>
                </div>
                <div class="system-item">
                  <span class="system-label">Log Reference</span>
                  <span class="system-value log-id">{{ selectedLog.id }}</span>
                </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" @click="closeDetailsModal" class="btn-secondary">
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

    const formatFieldName = (key) => {
      return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim()
    }

    const formatValue = (value) => {
      if (value === null || value === undefined) return 'N/A'
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      if (Array.isArray(value)) return value.join(', ') || 'Empty List'
      if (typeof value === 'object') {
        if (value instanceof Date) return formatTimestamp(value)
        // Handle nested objects by showing a summary
        return `${Object.keys(value).length} properties`
      }
      return String(value)
    }

    const formatUserAgent = (userAgent) => {
      if (!userAgent) return 'Unknown'
      // Simple user agent formatting - you can make this more sophisticated
      if (userAgent.includes('Firefox')) return 'Firefox Browser'
      if (userAgent.includes('Chrome')) return 'Chrome Browser'
      if (userAgent.includes('Safari')) return 'Safari Browser'
      if (userAgent.includes('Edge')) return 'Edge Browser'
      return 'Other Browser'
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
      getActionClass,
      formatFieldName,
      formatValue,
      formatUserAgent
    }
  }
}
</script>

<style scoped>
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #4b5563;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #1f2937;
  line-height: 1.2;
}

.filters-section {
  background: white;
  padding: 28px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  margin-bottom: 28px;
}

.filters-section h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 18px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.filter-group select {
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #1f2937;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.filter-group select:hover {
  border-color: #d1d5db;
}

.filter-group select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  outline: none;
}

.logs-section {
  background: white;
  padding: 28px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.logs-section h2 {
  margin: 0 0 24px 0;
  color: #1f2937;
  font-size: 18px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.loading-state p {
  color: #6b7280;
  font-size: 15px;
  margin: 0;
}

.empty-state h3 {
  color: #374151;
  font-size: 16px;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.table-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
}

.data-table th {
  background: #f8fafc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #1f2937;
  vertical-align: middle;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover {
  background-color: #f9fafb;
}

/* Action badges in table */
.action-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.action-badge.create {
  background: #ecfdf5;
  color: #059669;
}

.action-badge.update {
  background: #eff6ff;
  color: #3b82f6;
}

.action-badge.delete {
  background: #fef2f2;
  color: #dc2626;
}

.action-badge.view {
  background: #f3f4f6;
  color: #4b5563;
}

/* Row hover styles */
.audit-row-create:hover {
  background-color: #f0fdf4 !important;
}

.audit-row-update:hover {
  background-color: #eff6ff !important;
}

.audit-row-delete:hover {
  background-color: #fef2f2 !important;
}

.audit-row-view:hover {
  background-color: #f3f4f6 !important;
}

/* Modal overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
  overflow-y: auto;
}

.modal {
  width: 95%;
  max-width: 1400px; /* Increased from 1200px */
  max-height: 90vh;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-content {
  padding: 32px;
  overflow-y: auto;
  flex-grow: 1;
  display: grid;
  grid-template-columns: 350px 1fr; /* Split into sidebar and main content */
  gap: 24px;
}

/* Header Information */
.header-info {
  grid-column: 1 / -1; /* Span full width */
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Changes Section */
.detail-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  height: fit-content;
}

.changes-section {
  grid-column: 2; /* Main content area */
}

/* Metadata and System Info Sections */
.metadata-section,
.system-section {
  grid-column: 1; /* Sidebar */
}

/* Changes Grid */
.changes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
  padding: 20px;
}

.change-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
}

/* Update Values */
.update-values {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: white;
}

.value-row {
  padding: 10px 16px;
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 16px;
  align-items: baseline;
}

.value-row.previous {
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.value-row.new {
  background: #f0fdf4;
}

/* Metadata and System Grids */
.metadata-grid,
.system-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.metadata-item,
.system-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.metadata-name,
.system-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.metadata-value,
.system-value {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .modal-content {
    grid-template-columns: 1fr;
  }

  .changes-section,
  .metadata-section,
  .system-section {
    grid-column: 1 / -1;
  }

  .changes-grid {
    grid-template-columns: 1fr;
  }
}

/* Page header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Fix button styles */
.btn-secondary {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
}

.btn-secondary:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.btn-secondary:active {
  background: #e5e7eb;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Fix filter actions alignment */
.filter-actions {
  display: flex;
  align-items: flex-end;
}

/* Ensure consistent spacing */
.page-container {
  padding: 32px;
  max-width: 1600px;
  margin: 0 auto;
}

/* Modal header improvements */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  flex-shrink: 0;
  position: relative;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  flex-grow: 1;
}

.close-btn {
  width: 32px;
  height: 32px;
  min-height: unset;
  padding: 0;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  color: #4b5563;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0;
  position: relative;
  top: 0;
  right: 0;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
}

/* Modal actions positioning */
.modal-actions {
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.modal-actions .btn-secondary {
  min-width: 80px;
  height: 38px;
  margin: 0;
}
</style>
