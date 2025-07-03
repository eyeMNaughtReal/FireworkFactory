<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Vendors Management</h1>
      <div class="header-actions">
        <button @click="showAddForm = true" class="btn-primary">
          Add Vendor
        </button>
      </div>
    </div>

    <div class="filters-container">
      <select v-model="selectedVendorId" class="filter-select">
        <option value="">All Vendors</option>
        <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
          {{ vendor.name }}
        </option>
      </select>
    </div>

    <!-- Vendors Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Vendor Name</th>
            <th>Products</th>
            <th>Orders</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="vendor in filteredPaginatedVendors" :key="vendor.id">
            <td>{{ vendor.name }}</td>
            <td>
              <button 
                class="badge badge-success badge-clickable" 
                @click="navigateToProducts(vendor.id)"
                :disabled="!getVendorProductCount(vendor.id)"
              >
                {{ getVendorProductCount(vendor.id) }} Products
              </button>
            </td>
            <td>
              <button 
                class="badge badge-info badge-clickable" 
                @click="navigateToOrders(vendor.id)"
                :disabled="!getOrdersCount(vendor.id)"
              >
                {{ getOrdersCount(vendor.id) }} Orders
              </button>
            </td>
            <td>
              <div class="dropdown" :class="{ 'dropdown-open': openDropdown === vendor.id }">
                <button class="dropdown-toggle" @click="toggleDropdown(vendor.id)">
                  Actions ▾
                </button>
                <div class="dropdown-menu">
                  <button @click="editVendor(vendor); closeDropdown()" class="dropdown-item">
                    Edit
                  </button>
                  <button @click="deleteVendor(vendor); closeDropdown()" class="dropdown-item delete-action">
                    Delete
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="vendors.length === 0" class="empty-state">
        <h3>No vendors yet</h3>
        <p>Click the "Add Vendor" button to create your first vendor.</p>
      </div>
      
      <!-- Pagination -->
      <PagePagination
        v-if="vendors.length > 0"
        :current-page="currentPage"
        :total-items="vendors.length"
        :per-page="itemsPerPage"
        @update:page="currentPage = $event"
      />
    </div>

    <!-- Add/Edit Vendor Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingVendor ? 'Edit Vendor' : 'Add New Vendor' }}</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveVendor" class="form">
          <div class="form-group">
            <label>Vendor Name*</label>
            <input 
              v-model="formData.name" 
              type="text" 
              required 
              placeholder="Enter vendor name"
              class="form-input"
            >
          </div>

          <div v-if="errorMsg" class="error-message">
            {{ errorMsg }}
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? 'Saving...' : (editingVendor ? 'Update' : 'Add') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      :is-visible="showDeleteModal"
      title="Confirm Vendor Deletion"
      :message="itemToDelete && itemToDelete.value && getVendorProductCount.value(itemToDelete.value.id) > 0 
        ? 'This vendor has associated products and cannot be deleted. Please reassign or delete these products first.' 
        : 'Are you sure you want to delete this vendor? This action cannot be undone.'"
      confirm-text="Delete Vendor"
      cancel-text="Cancel"
      :item-details="itemToDelete && itemToDelete.value ? {
        'Name': itemToDelete.value.name,
        'Email': itemToDelete.value.email || 'N/A',
        'Phone': itemToDelete.value.phone || 'N/A',
        'Products': getVendorProductCount.value(itemToDelete.value.id) + ' products assigned'
      } : null"
      @confirm="confirmDeleteVendor"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted, watch, onUnmounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useRouter } from 'vue-router'
import PagePagination from '@/components/PagePagination.vue'
import { useToast } from '@/components/Toast.vue'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal.vue'
import useDeleteConfirmation from '@/composables/useDeleteConfirmation'

export default {
  components: {
    PagePagination,
    DeleteConfirmationModal
  },
  name: 'VendorsView',
  setup() {
    const store = useInventoryStore()
    const router = useRouter()
    const toast = useToast()
    const showAddForm = ref(false)
    const submitting = ref(false)
    const errorMsg = ref('')
    const editingVendor = ref(null)
    const openDropdown = ref(null)
    const selectedVendorId = ref('');
    
    // Pagination variables
    const currentPage = ref(1)
    const itemsPerPage = ref(10)

    // Handle cleanup when component is unmounted
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown') && openDropdown.value) {
        closeDropdown()
      }
    }

    onMounted(async () => {
      try {
        await Promise.all([
          store.vendors.length === 0 ? store.fetchVendors() : Promise.resolve(),
          store.products.length === 0 ? store.fetchProducts() : Promise.resolve(),
          !store.orders || store.orders.length === 0 ? store.fetchOrders() : Promise.resolve()
        ])
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
      
      // Add event listener for handling clicks outside dropdowns
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    const formData = reactive({
      name: ''
    })

    // Reset page when filters change
    watch(selectedVendorId, () => {
      currentPage.value = 1
    })

    const paginatedVendors = computed(() => {
      let filtered = store.vendors;
      if (selectedVendorId.value) {
        filtered = filtered.filter(v => v.id === selectedVendorId.value);
      }
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      return filtered.slice(startIndex, endIndex);
    })

    const filteredPaginatedVendors = computed(() => {
      let filtered = store.vendors;
      if (selectedVendorId.value) {
        filtered = filtered.filter(v => v.id === selectedVendorId.value);
      }
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      return filtered.slice(startIndex, endIndex);
    })

    // Make these computed to ensure reactivity
    const getVendorProductCount = computed(() => (vendorId) => {
      return store.products.filter(p => p.vendorId === vendorId).length
    })

    const getOrdersCount = computed(() => (vendorId) => {
      if (!store.orders) return 0
      
      // Get all products for this vendor
      const vendorProductIds = store.products
        .filter(p => p.vendorId === vendorId)
        .map(p => p.id)
      
      // Count orders that contain items for any of this vendor's products
      const orderCount = store.orders.filter(order => {
        return order.items && order.items.some(item => vendorProductIds.includes(item.productId))
      }).length
      
      return orderCount
    })

    const resetForm = () => {
      formData.name = ''
      errorMsg.value = ''
    }

    const closeModal = () => {
      showAddForm.value = false
      editingVendor.value = null
      resetForm()
    }

    const editVendor = (vendor) => {
      editingVendor.value = vendor
      formData.name = vendor.name
      showAddForm.value = true
    }

    const saveVendor = async () => {
      if (submitting.value) return

      if (!formData.name.trim()) {
        errorMsg.value = 'Vendor name is required.'
        return
      }

      submitting.value = true
      errorMsg.value = ''

      try {
        const vendorData = {
          name: formData.name.trim()
        }

        if (editingVendor.value) {
          await store.updateVendor(editingVendor.value.id, vendorData)
          toast.success('Vendor updated successfully')
        } else {
          await store.addVendor(vendorData)
          toast.success('Vendor created successfully')
        }

        closeModal()
      } catch (error) {
        console.error('Failed to save vendor:', error)
        errorMsg.value = 'Failed to save vendor. Please try again.'
        toast.error('Failed to save vendor. Please try again.')
      } finally {
        submitting.value = false
      }
    }

    // Delete vendor using modal confirmation
    const { showDeleteModal, itemToDelete, confirmDelete, cancelDelete } = useDeleteConfirmation()

    const deleteVendor = (vendor) => {
      // Show the confirmation modal first
      confirmDelete(vendor)
    }

    const confirmDeleteVendor = async () => {
      if (!itemToDelete.value) return
      
      // Check if vendor has associated products
      const hasProducts = getVendorProductCount.value(itemToDelete.value.id) > 0
      if (hasProducts) {
        toast.error('Cannot delete vendor with associated products. Please reassign or delete the products first.')
        cancelDelete()
        return
      }
      
      try {
        await store.deleteVendor(itemToDelete.value.id)
        toast.success('Vendor deleted successfully')
        cancelDelete() // Close the modal after successful deletion
      } catch (error) {
        console.error('Failed to delete vendor:', error)
        toast.error('Failed to delete vendor. Please try again.')
      }
    }

    // Add navigation methods
    const navigateToProducts = (vendorId) => {
      router.push({
        name: 'products',
        query: { vendorId }
      })
    }

    const navigateToOrders = (vendorId) => {
      // Get all product IDs for this vendor
      const vendorProductIds = store.products
        .filter(p => p.vendorId === vendorId)
        .map(p => p.id)
      
      router.push({
        name: 'orders',
        query: { 
          vendorId,
          productIds: vendorProductIds.join(',')
        }
      })
    }

    const toggleDropdown = (itemId) => {
      if (openDropdown.value === itemId) {
        closeDropdown()
      } else {
        openDropdown.value = itemId
        const tableContainer = document.querySelector('.table-container')
        if (tableContainer) {
          tableContainer.classList.add('dropdown-active')
        }
      }
    }

    const closeDropdown = () => {
      openDropdown.value = null
      const tableContainer = document.querySelector('.table-container')
      if (tableContainer) {
        tableContainer.classList.remove('dropdown-active')
      }
    }

    const vendors = computed(() => store.vendors)

    return {
      toast,
      showAddForm,
      submitting,
      errorMsg,
      editingVendor,
      formData,
      selectedVendorId,
      paginatedVendors,
      filteredPaginatedVendors,
      currentPage,
      itemsPerPage,
      getVendorProductCount,
      getOrdersCount,
      closeModal,
      editVendor,
      saveVendor,
      deleteVendor,
      navigateToProducts,
      navigateToOrders,
      openDropdown,
      toggleDropdown,
      closeDropdown,
      showDeleteModal,
      itemToDelete,
      cancelDelete,
      confirmDeleteVendor,
      vendors,
    }
  }
}
</script>

<style scoped>
.table-container {
  position: relative;
  overflow: visible;
}

/* Dropdown Styles */
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-toggle {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  width: 95px;
  text-align: center;
}

.dropdown-toggle:hover {
  background: #e5e7eb;
}

/* Click-based dropdown */
.dropdown-open .dropdown-menu {
  display: block;
}

/* Table container overflow management */
.table-container:has(.dropdown-open) {
  overflow: visible;
}

.table-container.dropdown-active {
  overflow: visible;
}

.dropdown-menu {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  width: 95px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 0;
  border: none;
  background: none;
  text-align: center;
  cursor: pointer;
  color: #374151;
  font-size: 14px;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.delete-action {
  background: #dc2626;
  color: white;
}

.delete-action:hover {
  background: #b91c1c;
}

/* Enhanced badge button styles for Products/Orders (no gradient) */
.badge-clickable {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 0.85rem;
  font-weight: 600;
  border: none;
  outline: none;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  margin: 0 2px;
  letter-spacing: 0.01em;
}

.badge-success.badge-clickable {
  background: #10b981;
  color: #fff;
}
.badge-success.badge-clickable:disabled {
  background: #d1fae5;
  color: #6ee7b7;
  cursor: not-allowed;
  opacity: 0.7;
}
.badge-success.badge-clickable:not(:disabled):hover {
  background: #059669;
  color: #fff;
  box-shadow: 0 2px 8px rgba(16,185,129,0.12);
}

.badge-info.badge-clickable {
  background: #2563eb;
  color: #fff;
}
.badge-info.badge-clickable:disabled {
  background: #dbeafe;
  color: #93c5fd;
  cursor: not-allowed;
  opacity: 0.7;
}
.badge-info.badge-clickable:not(:disabled):hover {
  background: #1e40af;
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.12);
}

/* Filter Select Styles */
.filters-container {
  margin-bottom: 16px;
}

.filter-select {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
  max-width: 250px;
}

.filter-select:hover {
  border-color: #2563eb;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>