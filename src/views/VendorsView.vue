<template>
  <div class="vendors">
    <div class="page-header">
      <h1>🏢 Vendors Management</h1>
      <button @click="showAddForm = true" class="btn-primary">
        ➕ Add Vendor
      </button>
    </div>

    <!-- Add Vendor Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click="showAddForm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Add New Vendor</h2>
          <button @click="showAddForm = false" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="addVendor" class="vendor-form">
          <div class="form-group">
            <label>Vendor Name*</label>
            <input v-model="newVendor.name" type="text" required>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showAddForm = false" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="loading.vendors">
              {{ loading.vendors ? 'Adding...' : 'Add Vendor' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="vendors-grid">
      <div v-for="vendor in vendors" :key="vendor.id" class="vendor-card">
        <div class="vendor-header">
          <h3>{{ vendor.name }}</h3>
          <div class="vendor-stats">
            {{ getProductCount(vendor.id) }} products
          </div>
        </div>
        
        <div class="vendor-content">
          <div class="vendor-info">
            <strong>Vendor ID:</strong> {{ vendor.id }}
          </div>
        </div>
        
        <div class="vendor-actions">
          <button @click="editVendor(vendor)" class="btn-edit">✏️ Edit</button>
          <button @click="deleteVendor(vendor.id)" class="btn-delete">🗑️ Delete</button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading.vendors" class="loading">
      Loading vendors...
    </div>

    <!-- Error state -->
    <div v-if="errors.fetchVendors" class="error">
      Error loading vendors: {{ errors.fetchVendors }}
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'

export default {
  name: 'VendorsView',
  setup() {
    const store = useInventoryStore()
    const showAddForm = ref(false)
    
    const newVendor = reactive({
      name: ''
    })

    onMounted(async () => {
      // Fetch vendors from Firebase if not already loaded
      if (store.vendors.length === 0) {
        try {
          await store.fetchVendors()
        } catch (error) {
          console.error('Failed to fetch vendors:', error)
        }
      }
    })

    const vendors = computed(() => store.vendors)
    const loading = computed(() => store.loading)
    const errors = computed(() => store.errors)

    const getProductCount = (vendorId) => {
      return store.products.filter(p => p.vendorId === vendorId).length
    }

    const addVendor = async () => {
      if (!newVendor.name.trim()) return
      
      try {
        await store.addVendor({ ...newVendor })
        
        // Reset form
        newVendor.name = ''
        showAddForm.value = false
      } catch (error) {
        console.error('Failed to add vendor:', error)
        alert('Failed to add vendor. Please try again.')
      }
    }

    const editVendor = (vendor) => {
      console.log('Edit vendor:', vendor)
      // TODO: Implement edit functionality
    }

    const deleteVendor = async (vendorId) => {
      if (confirm('Are you sure you want to delete this vendor?')) {
        try {
          await store.deleteVendor(vendorId)
        } catch (error) {
          console.error('Failed to delete vendor:', error)
          alert('Failed to delete vendor. Please try again.')
        }
      }
    }

    return {
      showAddForm,
      newVendor,
      vendors,
      loading,
      errors,
      getProductCount,
      addVendor,
      editVendor,
      deleteVendor
    }
  }
}
</script>

<style scoped>
.vendors {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #1e293b;
  margin: 0;
}

.vendors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.vendor-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
}

.vendor-card:hover {
  transform: translateY(-2px);
}

.vendor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.vendor-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
}

.vendor-stats {
  background: #eef2ff;
  color: #667eea;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.vendor-content {
  margin-bottom: 20px;
}

.vendor-info {
  margin-bottom: 12px;
  color: #64748b;
}

.vendor-info strong {
  color: #374151;
}

.vendor-info a {
  color: #667eea;
  text-decoration: none;
}

.vendor-info a:hover {
  text-decoration: underline;
}

.vendor-actions {
  display: flex;
  gap: 8px;
}

.btn-edit {
  background: #f1f5f9;
  color: #475569;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  flex: 1;
}

.btn-delete {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  flex: 1;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
}

.vendor-form {
  padding: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn-secondary {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 768px) {
  .vendors-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
