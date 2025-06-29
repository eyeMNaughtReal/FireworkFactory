<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Notification History</h1>
      <div class="header-actions">
        <button 
          class="btn-secondary" 
          @click="markAllAsRead"
          :disabled="isMarkingAllRead || unreadCount === 0"
        >
          {{ isMarkingAllRead ? 'Marking...' : 'Mark All Read' }}
        </button>
        <button class="btn-secondary" @click="refreshNotifications">
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Notification Statistics -->
    <div class="stats-container">
      <div class="stat-card">
        <h3>Total Notifications</h3>
        <div class="stat-value">{{ statistics.totalNotifications || 0 }}</div>
      </div>
      <div class="stat-card">
        <h3>Unread</h3>
        <div class="stat-value unread">{{ statistics.unreadCount || 0 }}</div>
      </div>
      <div class="stat-card">
        <h3>Most Common Type</h3>
        <div class="stat-value">{{ mostCommonType || 'N/A' }}</div>
      </div>
      <div class="stat-card">
        <h3>Today's Notifications</h3>
        <div class="stat-value">{{ todayCount || 0 }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <h2>Filters</h2>
      <div class="filter-grid">
        <div class="filter-group">
          <label for="type-filter">Type:</label>
          <select id="type-filter" v-model="filters.type" @change="applyFilters">
            <option value="">All Types</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="read-filter">Status:</label>
          <select id="read-filter" v-model="filters.unreadOnly" @change="applyFilters">
            <option :value="false">All Notifications</option>
            <option :value="true">Unread Only</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="limit-filter">Limit:</label>
          <select id="limit-filter" v-model="filters.limit" @change="applyFilters">
            <option :value="50">50 notifications</option>
            <option :value="100">100 notifications</option>
            <option :value="200">200 notifications</option>
          </select>
        </div>
        
        <div class="filter-actions">
          <button class="btn-secondary" @click="clearFilters">
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Notifications List -->
    <div class="notifications-section">
      <h2>Recent Notifications</h2>
      
      <div v-if="isLoading" class="loading-state">
        <p>Loading notifications...</p>
      </div>
      
      <div v-else-if="notifications.length === 0" class="empty-state">
        <h3>No Notifications Found</h3>
        <p>No notifications match the current filters, or no notifications have been recorded yet.</p>
      </div>
      
      <div v-else class="notifications-list">
        <div 
          v-for="notification in paginatedNotifications" 
          :key="notification.id"
          class="notification-item"
          :class="[notification.type, { 'unread': !notification.read }]"
        >
          <div class="notification-header">
            <span class="notification-type" :class="notification.type">
              {{ getTypeIcon(notification.type) }}
              {{ notification.type.toUpperCase() }}
            </span>
            <span class="notification-time">
              {{ formatTimestamp(notification.timestamp) }}
            </span>
          </div>
          
          <div class="notification-content">
            <p class="notification-message">{{ notification.message }}</p>
            
            <div v-if="notification.metadata && Object.keys(notification.metadata).length > 0" class="notification-metadata">
              <details>
                <summary>View Details</summary>
                <pre>{{ JSON.stringify(notification.metadata, null, 2) }}</pre>
              </details>
            </div>
          </div>
          
          <div class="notification-actions">
            <button 
              v-if="!notification.read"
              class="btn-small"
              @click="markAsRead(notification.id)"
              :disabled="isMarkingRead"
            >
              Mark Read
            </button>
            <span v-else class="read-indicator">✓ Read</span>
          </div>
        </div>

        <!-- Pagination -->
        <PagePagination
          v-if="notifications.length > itemsPerPage"
          :current-page="currentPage"
          :total-items="notifications.length"
          :per-page="itemsPerPage"
          @update:page="currentPage = $event"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import notificationHistoryService from '@/services/notificationHistoryService'
import PagePagination from '@/components/PagePagination.vue'
import { useToast } from '@/components/Toast.vue'

export default {
  name: 'NotificationHistoryView',
  components: {
    PagePagination
  },
  setup() {
    const toast = useToast()
    
    // State
    const statistics = reactive({})
    const notifications = ref([])
    const isLoading = ref(false)
    const isMarkingRead = ref(false)
    const isMarkingAllRead = ref(false)
    const currentPage = ref(1)
    const itemsPerPage = ref(10)
    
    // Filters
    const filters = reactive({
      type: '',
      unreadOnly: false,
      limit: 100
    })

    // Computed
    const paginatedNotifications = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value
      const endIndex = startIndex + itemsPerPage.value
      return notifications.value.slice(startIndex, endIndex)
    })

    const unreadCount = computed(() => {
      return statistics.unreadCount || 0
    })

    const mostCommonType = computed(() => {
      if (!statistics.typeCounts) return 'N/A'
      const entries = Object.entries(statistics.typeCounts)
      if (entries.length === 0) return 'N/A'
      return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
    })

    const todayCount = computed(() => {
      if (!statistics.notificationsByDay) return 0
      const today = new Date().toDateString()
      return statistics.notificationsByDay[today] || 0
    })

    // Methods
    const loadData = async () => {
      isLoading.value = true
      try {
        const [stats, notificationList] = await Promise.all([
          notificationHistoryService.getNotificationStatistics(),
          notificationHistoryService.getNotificationHistory(filters)
        ])
        
        Object.assign(statistics, stats)
        notifications.value = notificationList
        currentPage.value = 1 // Reset pagination when data changes
      } catch (error) {
        console.error('Error loading notification data:', error)
        toast.error('Failed to load notification history')
      } finally {
        isLoading.value = false
      }
    }

    const refreshNotifications = async () => {
      await loadData()
      toast.success('Notification history refreshed')
    }

    const applyFilters = async () => {
      await loadData()
    }

    const clearFilters = async () => {
      filters.type = ''
      filters.unreadOnly = false
      filters.limit = 100
      await loadData()
    }

    const markAsRead = async (notificationId) => {
      if (isMarkingRead.value) return
      
      isMarkingRead.value = true
      try {
        await notificationHistoryService.markAsRead(notificationId)
        
        // Update local state
        const notification = notifications.value.find(n => n.id === notificationId)
        if (notification) {
          notification.read = true
          notification.readAt = new Date()
        }
        
        // Update statistics
        if (statistics.unreadCount > 0) {
          statistics.unreadCount--
        }
        
        toast.success('Notification marked as read')
      } catch (error) {
        console.error('Error marking notification as read:', error)
        toast.error('Failed to mark notification as read')
      } finally {
        isMarkingRead.value = false
      }
    }

    const markAllAsRead = async () => {
      if (isMarkingAllRead.value || unreadCount.value === 0) return
      
      isMarkingAllRead.value = true
      try {
        await notificationHistoryService.markAllAsRead()
        
        // Update local state
        notifications.value.forEach(notification => {
          if (!notification.read) {
            notification.read = true
            notification.readAt = new Date()
          }
        })
        
        // Update statistics
        statistics.unreadCount = 0
        
        toast.success('All notifications marked as read')
      } catch (error) {
        console.error('Error marking all notifications as read:', error)
        toast.error('Failed to mark all notifications as read')
      } finally {
        isMarkingAllRead.value = false
      }
    }

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return 'N/A'
      const now = new Date()
      const diff = now - timestamp
      
      // Less than 1 minute
      if (diff < 60000) {
        return 'Just now'
      }
      
      // Less than 1 hour
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000)
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      }
      
      // Less than 24 hours
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000)
        return `${hours} hour${hours > 1 ? 's' : ''} ago`
      }
      
      // More than 24 hours
      return timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const getTypeIcon = (type) => {
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      }
      return icons[type] || 'ℹ️'
    }

    // Load data on mount
    onMounted(loadData)

    return {
      // State
      statistics,
      notifications,
      isLoading,
      isMarkingRead,
      isMarkingAllRead,
      currentPage,
      itemsPerPage,
      filters,
      
      // Computed
      paginatedNotifications,
      unreadCount,
      mostCommonType,
      todayCount,
      
      // Methods
      refreshNotifications,
      applyFilters,
      clearFilters,
      markAsRead,
      markAllAsRead,
      formatTimestamp,
      getTypeIcon
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

.stat-value.unread {
  color: #dc2626;
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

.notifications-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.notifications-section h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.notification-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.notification-item.unread {
  border-left: 4px solid #3b82f6;
  background: #f8fafc;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.notification-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.notification-type.success {
  background: #d1fae5;
  color: #065f46;
}

.notification-type.error {
  background: #fee2e2;
  color: #991b1b;
}

.notification-type.warning {
  background: #fef3c7;
  color: #92400e;
}

.notification-type.info {
  background: #dbeafe;
  color: #1e40af;
}

.notification-time {
  font-size: 12px;
  color: #6b7280;
}

.notification-content {
  margin-bottom: 12px;
}

.notification-message {
  margin: 0 0 8px 0;
  color: #374151;
  line-height: 1.5;
}

.notification-metadata details {
  margin-top: 8px;
}

.notification-metadata summary {
  cursor: pointer;
  color: #6b7280;
  font-size: 12px;
}

.notification-metadata pre {
  background: #f3f4f6;
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  margin-top: 4px;
  overflow-x: auto;
}

.notification-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.read-indicator {
  color: #059669;
  font-size: 12px;
  font-weight: 500;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-small:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .notification-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .stats-container {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
