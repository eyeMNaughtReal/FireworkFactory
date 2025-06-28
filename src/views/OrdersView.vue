<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Orders Management</h1>
      <div class="header-actions">
        <button class="btn-primary" @click="showOrderForm = true">Add Order</button>
      </div>
    </div>

    <div class="filters-container">
      <input 
        type="text" 
        class="search-input"
        v-model="searchQuery"
        placeholder="Search orders..."
      />
      <select v-model="vendorFilter" class="filter-select">
        <option value="">All Vendors</option>
        <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
          {{ vendor.name }}
        </option>
      </select>
      <select v-model="statusFilter" class="filter-select">
        <option value="">All Statuses</option>
        <option value="ordered">Ordered</option>
        <option value="received">Received</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <!-- Orders Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Order Date</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in paginatedOrders" :key="order.id">
            <td>{{ order.orderNumber || order.id.slice(-6) }}</td>
            <td>{{ formatDate(order.orderDate || order.createdAt) }}</td>
            <td>{{ order.items?.length || 0 }}</td>
            <td>${{ (order.total || calculateOrderTotal(order)).toFixed(2) }}</td>
            <td>
              <span 
                class="badge" 
                :class="{
                  'badge-warning': order.status === 'pending',
                  'badge-success': order.status === 'received',
                  'badge-danger': order.status === 'cancelled'
                }"
              >
                {{ formatStatus(order.status) }}
              </span>
            </td>
            <td>
              <div class="dropdown" :class="{ 'dropdown-open': openDropdown === order.id }">
                <button class="dropdown-toggle" @click="toggleDropdown(order.id)">
                  Actions ▾
                </button>
                <div class="dropdown-menu">
                  <button @click="editOrder(order); closeDropdown()" class="dropdown-item">
                    Edit
                  </button>
                  <button @click="deleteOrder(order.id); closeDropdown()" class="dropdown-item delete-action">
                    Delete
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Empty state message -->
      <div v-if="filteredOrders.length === 0" class="empty-state">
        <h3>No Orders Found</h3>
        <p>Adjust your filters or add a new order.</p>
      </div>
      
      <!-- Pagination -->
      <PagePagination
        v-if="filteredOrders.length > 0"
        :current-page="currentPage"
        :total-items="filteredOrders.length"
        :per-page="itemsPerPage"
        @update:page="currentPage = $event"
      />
    </div>

    <!-- Order Form Modal -->
    <div v-if="showOrderForm" class="modal-overlay" @click="closeModal">
      <div class="modal modal-wide" @click.stop>
        <div class="modal-header">
          <h2>{{ editingOrder ? 'Edit Order' : 'New Order' }}</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>

        <form @submit.prevent="saveOrder" class="form">
          <div class="form-row">
            <div class="form-group">
              <label>Order Date</label>
              <input 
                type="date" 
                v-model="formData.orderDate"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="formData.status" class="form-input">
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3>Order Items</h3>
              <button type="button" @click="addOrderItem" class="btn-primary btn-compact">
                Add Item
              </button>
            </div>

            <table class="data-table order-items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Unit Cost</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in formData.items" :key="index">
                  <td>
                    <select v-model="item.productId" required class="form-input">
                      <option value="">Select Product</option>
                      <option v-for="product in products" :key="product.id" :value="product.id">
                        {{ product.name }} ({{ getVendorName(getProductVendorId(product.id)) }})
                      </option>
                    </select>
                  </td>
                  <td>
                    <select v-model="item.unit" class="form-input" @change="updateUnitConversion(item)">
                      <option value="case">Case</option>
                      <option value="pack">Pack</option>
                      <option value="item">Item</option>
                    </select>
                    <div class="unit-info" v-if="item.productId">
                      {{ getUnitInfo(item) }}
                    </div>
                  </td>
                  <td>
                    <input type="number" v-model.number="item.quantity" min="1" required class="form-input">
                    <div class="unit-total" v-if="item.productId">
                      Total Items: {{ calculateTotalItems(item) }}
                    </div>
                  </td>
                  <td>
                    <input type="number" v-model.number="item.unitCost" min="0" step="0.01" required class="form-input">
                  </td>
                  <td class="text-right">
                    ${{ (item.quantity * item.unitCost || 0).toFixed(2) }}
                  </td>
                  <td>
                    <button 
                      type="button" 
                      @click="removeOrderItem(index)" 
                      class="btn-delete" 
                      title="Remove Item"
                      aria-label="Remove Item"
                    >×</button>
                  </td>
                </tr>
                <tr v-if="formData.items.length === 0">
                  <td colspan="6" class="empty-message">
                    Click "Add Item" to add products to this order
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="formData.items.length > 0">
                <tr>
                  <td colspan="4" class="text-right"><strong>Order Total:</strong></td>
                  <td class="text-right"><strong>${{ orderTotal.toFixed(2) }}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              :disabled="!formData.items.length || submitting"
            >
              {{ submitting ? 'Saving...' : (editingOrder ? 'Update Order' : 'Create Order') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useRoute } from 'vue-router'
import PagePagination from '@/components/PagePagination.vue'
import { useToast } from '@/components/Toast.vue'

export default {
  name: 'OrdersView',
  components: {
    PagePagination
  },
  setup() {
    const store = useInventoryStore()
    const route = useRoute()
    const toast = useToast()
    const showOrderForm = ref(false)
    const submitting = ref(false)
    const errorMsg = ref('')
    const editingOrder = ref(null)
    const searchQuery = ref('')
    const vendorFilter = ref('')
    const statusFilter = ref('')
    const openDropdown = ref(null)
    
    // Pagination variables
    const currentPage = ref(1)
    const itemsPerPage = ref(10)

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    const formData = reactive({
      items: [],
      status: 'ordered',
      orderDate: today
    })

    onMounted(async () => {
      try {
        await Promise.all([
          store.vendors.length === 0 ? store.fetchVendors() : Promise.resolve(),
          store.products.length === 0 ? store.fetchProducts() : Promise.resolve(),
          store.orders.length === 0 ? store.fetchOrders() : Promise.resolve(),
          store.inventory.length === 0 ? store.fetchInventory() : Promise.resolve()
        ])

        // Set vendor filter from URL if present
        if (route.query.vendorId) {
          vendorFilter.value = route.query.vendorId
        }
        
        // Handle quick order creation from dashboard
        if (route.query.action === 'add') {
          showOrderForm.value = true
          
          // If productId is specified, pre-populate the order with that product
          if (route.query.productId) {
            formData.items = [{
              productId: route.query.productId,
              unit: 'case',
              quantity: 1,
              actualQuantity: 0,
              unitCost: 0
            }]
          }
        }
        
        // Add click outside handler for dropdowns
        document.addEventListener('click', handleClickOutside)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    const products = computed(() => store.products)
    const vendors = computed(() => store.vendors)

    const getVendorName = (vendorId) => {
      const vendor = vendors.value.find(v => v.id === vendorId)
      return vendor ? vendor.name : ''
    }

    const getProductVendorId = (productId) => {
      const product = products.value.find(p => p.id === productId)
      return product ? product.vendorId : ''
    }

    const orders = computed(() => {
      let result = store.orders

      if (route.query.vendorId) {
        const vendorId = route.query.vendorId
        result = result.filter(order => 
          order.items?.some(item => {
            const product = products.value.find(p => p.id === item.productId)
            return product && product.vendorId === vendorId
          })
        )
      }

      return result
    })

    const filteredOrders = computed(() => {
      let result = orders.value

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(order => 
          order.orderNumber?.toLowerCase().includes(query)
        )
      }

      if (vendorFilter.value) {
        const vendorId = vendorFilter.value
        result = result.filter(order => 
          order.items?.some(item => {
            const product = products.value.find(p => p.id === item.productId)
            return product && product.vendorId === vendorId
          })
        )
      }

      if (statusFilter.value) {
        result = result.filter(order => order.status === statusFilter.value)
      }

      return result
    })
    
    // Add paginated orders computed property
    const paginatedOrders = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value
      const endIndex = startIndex + itemsPerPage.value
      return filteredOrders.value.slice(startIndex, endIndex)
    })

    const calculateOrderTotal = (order) => {
      return order.items?.reduce((sum, item) => sum + (item.quantity * item.unitCost || 0), 0) || 0
    }

    const orderTotal = computed(() => {
      return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitCost || 0), 0)
    })

    const getUnitInfo = (item) => {
      const product = products.value.find(p => p.id === item.productId)
      if (!product || !product.unitConfig) return ''

      switch (item.unit) {
        case 'case':
          if (product.unitConfig.structure === 'item-package-case') {
            return `1 case = ${product.unitConfig.case.conversionRate} packages (${product.unitConfig.totalItemsPerCase} items)`
          } else {
            return `1 case = ${product.unitConfig.case.conversionRate} items`
          }
        case 'pack':
          if (product.unitConfig.structure === 'item-package-case') {
            return `1 package = ${product.unitConfig.package.conversionRate} items`
          }
          return 'Package not available for this product'
        case 'item':
          return 'Individual items'
        default:
          return ''
      }
    }

    const calculateTotalItems = (item) => {
      if (!item.quantity) return 0
      const product = products.value.find(p => p.id === item.productId)
      if (!product || !product.unitConfig) return 0
      
      switch (item.unit) {
        case 'case':
          if (product.unitConfig.structure === 'item-package-case') {
            return item.quantity * product.unitConfig.totalItemsPerCase
          } else {
            return item.quantity * product.unitConfig.case.conversionRate
          }
        case 'pack':
          if (product.unitConfig.structure === 'item-package-case') {
            return item.quantity * product.unitConfig.package.conversionRate
          }
          return 0
        case 'item':
          return item.quantity
        default:
          return 0
      }
    }

    const updateUnitConversion = (item) => {
      // When unit changes, convert the quantity to maintain the same total number of items
      const product = products.value.find(p => p.id === item.productId)
      if (!product || !product.unitConfig || !item.quantity) return

      const currentTotalItems = calculateTotalItems(item)
      
      // Update the quantity to maintain the same total number of items
      switch (item.unit) {
        case 'case':
          if (product.unitConfig.structure === 'item-package-case') {
            item.quantity = Math.ceil(currentTotalItems / product.unitConfig.totalItemsPerCase)
          } else {
            item.quantity = Math.ceil(currentTotalItems / product.unitConfig.case.conversionRate)
          }
          break
        case 'pack':
          if (product.unitConfig.structure === 'item-package-case') {
            item.quantity = Math.ceil(currentTotalItems / product.unitConfig.package.conversionRate)
          }
          break
        case 'item':
          item.quantity = currentTotalItems
          break
      }
      
      // Update the actual quantity of individual items
      item.actualQuantity = calculateTotalItems(item)
    }

    const addOrderItem = () => {
      formData.items.push({
        productId: '',
        unit: 'case',
        quantity: 1,
        actualQuantity: 0, // This will store the actual number of individual items
        unitCost: 0
      })
    }

    const removeOrderItem = (index) => {
      formData.items.splice(index, 1)
    }

    const resetForm = () => {
      formData.items = []
      formData.status = 'ordered'
      formData.orderDate = today
      errorMsg.value = ''
    }

    const closeModal = () => {
      showOrderForm.value = false
      editingOrder.value = null
      resetForm()
    }

    const saveOrder = async () => {
      if (submitting.value || !formData.items.length) return

      submitting.value = true
      errorMsg.value = ''

      try {
        const orderData = {
          items: formData.items,
          status: formData.status,
          total: orderTotal.value,
          orderDate: formData.orderDate,
          createdAt: new Date().toISOString()
        }

        console.log('Saving order with data:', orderData);

        if (editingOrder.value) {
          console.log('Updating existing order:', editingOrder.value.id);
          await store.updateOrder(editingOrder.value.id, orderData)
          toast.success('Order updated successfully')
        } else {
          console.log('Creating new order');
          await store.addOrder(orderData)
          toast.success('Order created successfully')
        }

        // Refresh inventory after order changes
        await store.fetchInventory()

        closeModal()
      } catch (error) {
        console.error('Failed to save order:', error)
        errorMsg.value = 'Failed to save order. Please try again.'
        toast.error('Failed to save order. Please try again.')
      } finally {
        submitting.value = false
      }
    }

    const editOrder = (order) => {
      editingOrder.value = order
      formData.items = [...order.items]
      formData.status = order.status
      formData.orderDate = order.orderDate || new Date(order.createdAt).toISOString().split('T')[0]
      showOrderForm.value = true
    }

    const deleteOrder = async (orderId) => {
      if (!confirm('Are you sure you want to delete this order?')) return

      try {
        await store.deleteOrder(orderId)
        toast.success('Order deleted successfully')
      } catch (error) {
        console.error('Failed to delete order:', error)
        toast.error('Failed to delete order. Please try again.')
      }
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const formatStatus = (status) => {
      return status.charAt(0).toUpperCase() + status.slice(1)
    }

    const toggleDropdown = (itemId) => {
      if (openDropdown.value === itemId) {
        closeDropdown()
      } else {
        openDropdown.value = itemId
        // Toggle table container overflow for dropdown visibility
        const tableContainer = document.querySelector('.table-container')
        if (tableContainer) {
          tableContainer.classList.add('dropdown-active')
        }
      }
    }

    const closeDropdown = () => {
      openDropdown.value = null
      // Remove table container overflow class
      const tableContainer = document.querySelector('.table-container')
      if (tableContainer) {
        tableContainer.classList.remove('dropdown-active')
      }
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown') && openDropdown.value) {
        closeDropdown()
      }
    }

    // Reset page when filters change
    watch([searchQuery, vendorFilter, statusFilter], () => {
      currentPage.value = 1
    })

    return {
      toast,
      showOrderForm,
      submitting,
      errorMsg,
      editingOrder,
      openDropdown,
      formData,
      searchQuery,
      vendorFilter,
      statusFilter,
      products,
      vendors,
      filteredOrders,
      paginatedOrders,
      currentPage,
      itemsPerPage,
      orderTotal,
      getVendorName,
      getProductVendorId,
      calculateOrderTotal,
      getUnitInfo,
      calculateTotalItems,
      updateUnitConversion,
      addOrderItem,
      removeOrderItem,
      closeModal,
      editOrder,
      saveOrder,
      deleteOrder,
      formatDate,
      formatStatus,
      toggleDropdown,
      closeDropdown
    }
  }
}
</script>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-content {
  padding: 16px;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.card-title .badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
}

.card-title .badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.card-title .badge-success {
  background: #d1fae5;
  color: #059669;
}

.card-title .badge-danger {
  background: #fee2e2;
  color: #dc2626;
}

.card-text {
  margin-bottom: 16px;
  color: #374151;
}

.card-text p {
  margin: 4px 0;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
}

.close-btn:hover {
  color: #374151;
}

.form {
  padding: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  overflow-x: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1f36;
  margin: 0;
}

.table-container {
  position: relative;
  overflow: visible;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  background: #f9fafb;
  color: #374151;
  font-weight: 600;
}

.data-table td {
  color: #374151;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.order-summary {
  background: #f8f9fe;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  text-align: right;
}

.order-summary h4 {
  color: #1a1f36;
  margin: 0;
  font-size: 1.1rem;
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.success {
  color: #059669;
  background: #d1fae5;
  border: 1px solid #34d399;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 12px;
  font-weight: 600;
  text-align: center;
}

.filters-container {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.search-input,
.filter-select {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
  max-width: 250px;
}

.search-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-wide {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
}

.order-items-table td {
  min-width: 120px;
  vertical-align: top;
  padding: 12px 8px;
  position: relative;
}

.order-items-table td:first-child {
  width: 35%;
  min-width: 300px;
}

.order-items-table td:nth-child(2) {
  width: 15%;
  min-width: 120px;
}

.order-items-table td:nth-child(3),
.order-items-table td:nth-child(4) {
  width: 15%;
  min-width: 100px;
}

.order-items-table td:nth-child(5) {
  width: 15%;
  min-width: 100px;
  text-align: right;
}

.order-items-table td:last-child {
  width: 5%;
  min-width: 80px;
  text-align: center;
}

.order-items-table .form-input {
  margin-bottom: 0;
  min-height: 40px;
  padding: 8px 12px;
  line-height: 1.4;
}

.order-items-table select.form-input {
  height: auto;
  min-height: 40px;
}

.order-items-table input.form-input {
  height: 40px;
}

.order-items-table tbody tr {
  min-height: 80px;
}

.unit-info {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
  line-height: 1.2;
}

.unit-total {
  font-size: 11px;
  color: #0066cc;
  margin-top: 4px;
  font-weight: 500;
  line-height: 1.2;
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

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .card-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-wide {
    width: 98%;
    margin: 8px auto;
    max-height: 95vh;
    overflow-y: auto;
  }
}
</style>
