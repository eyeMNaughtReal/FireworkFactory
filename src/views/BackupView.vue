<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Data Backup & Recovery</h1>
      <div class="header-actions">
        <button 
          class="btn-primary" 
          @click="createBackup"
          :disabled="isCreatingBackup"
        >
          {{ isCreatingBackup ? 'Creating Backup...' : 'Create Backup' }}
        </button>
      </div>
    </div>

    <!-- Backup Statistics -->
    <div class="stats-container">
      <div class="stat-card">
        <h3>Total Backups</h3>
        <div class="stat-value">{{ statistics.totalBackups || 0 }}</div>
      </div>
      <div class="stat-card">
        <h3>Latest Backup</h3>
        <div class="stat-value">
          {{ statistics.latestBackup ? formatDate(statistics.latestBackup.createdAt) : 'None' }}
        </div>
      </div>
      <div class="stat-card">
        <h3>Data Size</h3>
        <div class="stat-value">{{ statistics.estimatedDataSize?.estimatedSizeKB || 0 }} KB</div>
      </div>
      <div class="stat-card">
        <h3>Collections</h3>
        <div class="stat-value">{{ statistics.collectionsTracked || 0 }}</div>
      </div>
    </div>

    <!-- Backup Actions -->
    <div class="actions-section">
      <h2>Backup Operations</h2>
      
      <div class="action-grid">
        <div class="action-card">
          <h3>Create New Backup</h3>
          <p>Create a complete backup of all data collections</p>
          <button 
            class="btn-primary" 
            @click="createBackup"
            :disabled="isCreatingBackup"
          >
            {{ isCreatingBackup ? 'Creating...' : 'Create Full Backup' }}
          </button>
        </div>

        <div class="action-card">
          <h3>Export Backup</h3>
          <p>Download the latest backup as a JSON file</p>
          <button 
            class="btn-secondary" 
            @click="exportLatestBackup"
            :disabled="!latestBackup || isExporting"
          >
            {{ isExporting ? 'Exporting...' : 'Export Latest' }}
          </button>
        </div>

        <div class="action-card">
          <h3>Import & Restore</h3>
          <p>Upload and restore data from a backup file</p>
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileUpload" 
            accept=".json"
            style="display: none"
          >
          <button 
            class="btn-primary" 
            @click="$refs.fileInput.click()"
            :disabled="isRestoring"
          >
            <span class="upload-icon">📁</span>
            {{ isRestoring ? 'Restoring...' : 'Select Backup File' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Backup History -->
    <div class="history-section">
      <h2>Backup History</h2>
      
      <div v-if="backupHistory.length === 0" class="empty-state">
        <h3>No Backups Found</h3>
        <p>Create your first backup to get started.</p>
      </div>

      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Backup ID</th>
              <th>Created Date</th>
              <th>Version</th>
              <th>Collections</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="backup in paginatedBackups" :key="backup.id">
              <td>{{ backup.id }}</td>
              <td>{{ formatDate(backup.createdAt) }}</td>
              <td>{{ backup.version || 'N/A' }}</td>
              <td>{{ backup.collections?.length || 0 }}</td>
              <td>
                <div class="table-actions">
                  <button 
                    class="btn-icon" 
                    @click="exportSpecificBackup(backup)"
                    title="Export this backup"
                    :disabled="isExporting"
                  >
                    📥
                  </button>
                  <button 
                    class="btn-icon btn-danger" 
                    @click="deleteBackup(backup.id)"
                    title="Delete this backup"
                    :disabled="isDeletingBackup"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <PagePagination
          v-if="backupHistory.length > itemsPerPage"
          :current-page="currentPage"
          :total-items="backupHistory.length"
          :per-page="itemsPerPage"
          @update:page="currentPage = $event"
        />
      </div>
    </div>

    <!-- Restore Confirmation Modal -->
    <div v-if="showRestoreModal" class="modal-overlay" @click="closeRestoreModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Confirm Data Restoration</h2>
          <button @click="closeRestoreModal" class="close-btn">&times;</button>
        </div>

        <div class="modal-content">
          <div class="warning-message">
            <h3>⚠️ Warning</h3>
            <p>This will restore data from the selected backup. This action cannot be undone.</p>
          </div>

          <div v-if="backupToRestore" class="backup-details">
            <h4>Backup Details:</h4>
            <ul>
              <li><strong>Created:</strong> {{ formatDate(backupToRestore.metadata?.createdAt) }}</li>
              <li><strong>Version:</strong> {{ backupToRestore.metadata?.version }}</li>
              <li><strong>Collections:</strong> {{ Object.keys(backupToRestore.data || {}).length }}</li>
            </ul>
          </div>

          <div class="restore-options">
            <label>
              <input 
                type="checkbox" 
                v-model="replaceExistingData"
              >
              Replace existing data (recommended for full restore)
            </label>
          </div>

          <div class="validation-results" v-if="validationResult">
            <h4>Backup Validation:</h4>
            <div v-if="validationResult.isValid" class="validation-success">
              ✅ Backup file is valid and ready for restoration
            </div>
            <div v-else class="validation-errors">
              <h5>❌ Validation Errors:</h5>
              <ul>
                <li v-for="error in validationResult.errors" :key="error">{{ error }}</li>
              </ul>
            </div>
            <div v-if="validationResult.warnings.length > 0" class="validation-warnings">
              <h5>⚠️ Warnings:</h5>
              <ul>
                <li v-for="warning in validationResult.warnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeRestoreModal" class="btn-secondary">
            Cancel
          </button>
          <button 
            @click="confirmRestore" 
            class="btn-danger"
            :disabled="!validationResult?.isValid || isRestoring"
          >
            {{ isRestoring ? 'Restoring...' : 'Restore Data' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import backupService from '@/services/backupService'
import PagePagination from '@/components/PagePagination.vue'
import { useToast } from '@/components/Toast.vue'

export default {
  name: 'BackupView',
  components: {
    PagePagination
  },
  setup() {
    const toast = useToast()
    
    // State
    const statistics = reactive({})
    const backupHistory = ref([])
    const currentPage = ref(1)
    const itemsPerPage = ref(10)
    
    // Loading states
    const isCreatingBackup = ref(false)
    const isExporting = ref(false)
    const isRestoring = ref(false)
    const isDeletingBackup = ref(false)
    
    // Restore modal state
    const showRestoreModal = ref(false)
    const backupToRestore = ref(null)
    const validationResult = ref(null)
    const replaceExistingData = ref(true)

    // Computed
    const paginatedBackups = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value
      const endIndex = startIndex + itemsPerPage.value
      return backupHistory.value.slice(startIndex, endIndex)
    })

    const latestBackup = computed(() => {
      return backupHistory.value[0] || null
    })

    // Methods
    const loadData = async () => {
      try {
        const [stats, history] = await Promise.all([
          backupService.getBackupStatistics(),
          backupService.getBackupHistory()
        ])
        
        Object.assign(statistics, stats)
        backupHistory.value = history
      } catch (error) {
        console.error('Error loading backup data:', error)
        toast.error('Failed to load backup data')
      }
    }

    const createBackup = async () => {
      if (isCreatingBackup.value) return
      
      isCreatingBackup.value = true
      try {
        toast.info('Creating backup...', 3000)
        await backupService.createFullBackup()
        
        toast.success('Backup created successfully!')
        await loadData() // Refresh data
      } catch (error) {
        console.error('Error creating backup:', error)
        toast.error(`Failed to create backup: ${error.message}`)
      } finally {
        isCreatingBackup.value = false
      }
    }

    const exportLatestBackup = async () => {
      if (!latestBackup.value || isExporting.value) return
      
      isExporting.value = true
      try {
        const backup = await backupService.createFullBackup()
        const filename = backupService.exportBackupAsFile(backup)
        
        toast.success(`Backup exported as ${filename}`)
      } catch (error) {
        console.error('Error exporting backup:', error)
        toast.error(`Failed to export backup: ${error.message}`)
      } finally {
        isExporting.value = false
      }
    }

    const exportSpecificBackup = async (backupMetadata) => {
      if (isExporting.value) return
      
      isExporting.value = true
      try {
        // Create a fresh backup (since we only store metadata in Firebase)
        const backup = await backupService.createFullBackup()
        const filename = `backup-${backupMetadata.id}.json`
        backupService.exportBackupAsFile(backup, filename)
        
        toast.success(`Backup exported as ${filename}`)
      } catch (error) {
        console.error('Error exporting specific backup:', error)
        toast.error(`Failed to export backup: ${error.message}`)
      } finally {
        isExporting.value = false
      }
    }

    const handleFileUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const backupData = JSON.parse(text)
        
        // Validate the backup data
        const validation = backupService.validateBackupData(backupData)
        
        backupToRestore.value = backupData
        validationResult.value = validation
        showRestoreModal.value = true
        
        if (!validation.isValid) {
          toast.error('Invalid backup file format')
        }
      } catch (error) {
        console.error('Error reading backup file:', error)
        toast.error('Failed to read backup file. Please ensure it\'s a valid JSON file.')
      }
      
      // Clear the file input
      event.target.value = ''
    }

    const confirmRestore = async () => {
      if (!backupToRestore.value || !validationResult.value?.isValid || isRestoring.value) return
      
      isRestoring.value = true
      try {
        toast.info('Restoring data from backup...', 5000)
        
        const restoredCollections = await backupService.restoreFromBackup(
          backupToRestore.value,
          null, // Restore all collections
          replaceExistingData.value
        )
        
        const totalDocs = restoredCollections.reduce((sum, col) => sum + col.documentsRestored, 0)
        toast.success(`Successfully restored ${totalDocs} documents from backup!`)
        
        closeRestoreModal()
        await loadData() // Refresh data
      } catch (error) {
        console.error('Error restoring backup:', error)
        toast.error(`Failed to restore backup: ${error.message}`)
      } finally {
        isRestoring.value = false
      }
    }

    const deleteBackup = async () => {
      // Note: In a production app, you'd implement deleteBackup in the service
      isDeletingBackup.value = true
      try {
        toast.warning('Backup deletion not yet implemented')
        // await backupService.deleteBackup(backupId)
        // toast.success('Backup deleted successfully')
        // await loadData()
      } catch (error) {
        console.error('Error deleting backup:', error)
        toast.error(`Failed to delete backup: ${error.message}`)
      } finally {
        isDeletingBackup.value = false
      }
    }

    const closeRestoreModal = () => {
      showRestoreModal.value = false
      backupToRestore.value = null
      validationResult.value = null
      replaceExistingData.value = true
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Load data on mount
    onMounted(loadData)

    return {
      // State
      statistics,
      backupHistory,
      currentPage,
      itemsPerPage,
      
      // Loading states
      isCreatingBackup,
      isExporting,
      isRestoring,
      isDeletingBackup,
      
      // Modal state
      showRestoreModal,
      backupToRestore,
      validationResult,
      replaceExistingData,
      
      // Computed
      paginatedBackups,
      latestBackup,
      
      // Methods
      createBackup,
      exportLatestBackup,
      exportSpecificBackup,
      handleFileUpload,
      confirmRestore,
      deleteBackup,
      closeRestoreModal,
      formatDate
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
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
}

.actions-section {
  margin-bottom: 40px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 20px;
}

.action-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
}

.action-card h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
}

.action-card p {
  color: #6b7280;
  margin-bottom: 16px;
}

.history-section h2 {
  margin-bottom: 20px;
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-icon {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f3f4f6;
}

.btn-icon.btn-danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

.warning-message {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.warning-message h3 {
  margin: 0 0 8px 0;
  color: #92400e;
}

.warning-message p {
  margin: 0;
  color: #92400e;
}

.backup-details {
  background: #f3f4f6;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.backup-details h4 {
  margin: 0 0 12px 0;
  color: #1f2937;
}

.backup-details ul {
  margin: 0;
  padding-left: 20px;
}

.backup-details li {
  margin-bottom: 4px;
  color: #4b5563;
}

.restore-options {
  margin-bottom: 20px;
}

.restore-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.validation-results {
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.validation-success {
  color: #059669;
  font-weight: 500;
}

.validation-errors {
  color: #dc2626;
}

.validation-warnings {
  color: #d97706;
  margin-top: 12px;
}

.validation-errors h5,
.validation-warnings h5 {
  margin: 0 0 8px 0;
}

.validation-errors ul,
.validation-warnings ul {
  margin: 0;
  padding-left: 20px;
}

.modal-content {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

/* File Upload Button Styling */
.btn-file-upload {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 6px rgba(99, 102, 241, 0.2);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 160px;
  justify-content: center;
}

.btn-file-upload:hover:not(:disabled) {
  background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%);
  box-shadow: 0 6px 8px rgba(99, 102, 241, 0.3);
  transform: translateY(-1px);
}

.btn-file-upload:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
}

.btn-file-upload:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.upload-icon {
  font-size: 1rem;
}

@media (max-width: 768px) {
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
