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
        placeholder="Search orders, products, vendors, or status..."
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
      <select v-model="seasonFilter" class="filter-select">
        <option value="">All Seasons</option>
        <option value="july-4th">4th of July</option>
        <option value="new-years">New Year's</option>
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
            <th>Season</th>
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
                  'badge-blue': order.status === 'ordered',
                  'badge-success': order.status === 'received',
                  'badge-danger': order.status === 'cancelled'
                }"
              >
                {{ formatStatus(order.status) }}
              </span>
            </td>
            <td>
              <span 
                v-if="order.season" 
                class="badge season-badge" 
                :class="{
                  'season-july-4th badge-red': order.season === 'july-4th',
                  'season-new-years badge-gold': order.season === 'new-years'
                }"
              >
                {{ getSeasonLabel(order.season) }}
              </span>
              <!-- Removed 'General Stock' label -->
            </td>
            <td>
              <div class="dropdown" :class="{ 'dropdown-open': openDropdown === order.id }">
                <button class="actions-button" @click="toggleDropdown(order.id)">
                  Actions ▾
                </button>
                <div class="actions-menu" v-if="openDropdown === order.id">
                  <button @click="editOrder(order); closeDropdown()" class="action-item">
                    Edit
                  </button>
                  <button @click="deleteOrder(order.id); closeDropdown()" class="action-item action-delete">
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

    <!-- Reusable OrderModal Component -->
    <OrderModal
      :show="showOrderForm"
      :order="formData"
      :is-edit="!!editingOrder"
      :products="products"
      :vendors="vendors"
      :submitting="submitting"
      :getVendorName="getVendorName"
      :getProductVendorId="getProductVendorId"
      :getUnitInfo="getUnitInfo"
      :calculateTotalItems="calculateTotalItems"
      :order-total="orderTotal"
      @submit="saveOrder"
      @cancel="closeModal"
      @addOrderItem="addOrderItem"
      @removeOrderItem="removeOrderItem"
      @openProductModal="openProductModal"
      @updateUnitConversion="updateUnitConversion"
    />
    <!-- Reusable NewProductModal Component -->
    <NewProductModal
      :show="showProductModal"
      :vendors="vendors"
      :categories="categories"
      :sub-category-options="subCategoryOptions"
      :selected-category-id="selectedCategoryId"
      :product="newProduct"
      @submit="handleProductSubmit"
      @cancel="closeProductModal"
    />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useRoute } from 'vue-router'
import PagePagination from '@/components/PagePagination.vue'
import { useToast } from '@/components/Toast.vue'
import NewProductModal from '@/components/NewProductModal.vue'
import OrderModal from '@/components/OrderModal.vue'

export default {
  name: 'OrdersView',
  components: {
    PagePagination,
    NewProductModal,
    OrderModal
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
    const seasonFilter = ref('')
    const openDropdown = ref(null)
    
    // Pagination variables
    const currentPage = ref(1)
    const itemsPerPage = ref(10)

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    const formData = reactive({
      items: [],
      status: 'ordered',
      season: '',
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
    const categories = computed(() => store.categories)
    const selectedCategoryId = ref('')
    const subCategoryOptions = computed(() => {
      const selectedCat = store.categories.find(cat => cat.id === selectedCategoryId.value)
      return selectedCat && Array.isArray(selectedCat.subCategories) ? selectedCat.subCategories : []
    })

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
        result = result.filter(order => {
          // Search in order number or order ID
          const orderNumberMatch = order.orderNumber?.toLowerCase().includes(query) ||
                                 order.id?.toLowerCase().includes(query)
          
          // Search in product names within the order
          const productMatch = order.items?.some(item => {
            const product = products.value.find(p => p.id === item.productId)
            return product?.name?.toLowerCase().includes(query)
          })
          
          // Search in vendor names of products in the order
          const vendorMatch = order.items?.some(item => {
            const product = products.value.find(p => p.id === item.productId)
            if (product) {
              const vendor = vendors.value.find(v => v.id === product.vendorId)
              return vendor?.name?.toLowerCase().includes(query)
            }
            return false
          })
          
          // Search in order status
          const statusMatch = order.status?.toLowerCase().includes(query)
          
          // Search in order season if it exists
          const seasonMatch = order.season?.toLowerCase().includes(query)
          
          return orderNumberMatch || productMatch || vendorMatch || statusMatch || seasonMatch
        })
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
      
      if (seasonFilter.value) {
        result = result.filter(order => order.season === seasonFilter.value)
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
      formData.season = ''
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
          season: formData.season,
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
      formData.season = order.season || ''
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
      if (!status) return 'Unknown'
      return status.charAt(0).toUpperCase() + status.slice(1)
    }
    
    const getSeasonLabel = (season) => {
      if (!season) return ''
      
      const seasonLabels = {
        'july-4th': '4th of July',
        'new-years': 'New Year\'s'
      }
      
      return seasonLabels[season] || 'Unknown Season'
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
    watch([searchQuery, vendorFilter, statusFilter, seasonFilter], () => {
      currentPage.value = 1
    })

    // Quick Add Product Modal logic
    const showProductModal = ref(false)
    const newProduct = reactive({
      name: '',
      categoryId: '',
      vendorId: '',
      unitConfig: {
        structure: '',
        item: { type: 'item', conversionRate: 1 },
        package: { type: 'package', conversionRate: 0 },
        case: { type: 'case', conversionRate: 0 }
      },
      threshold: 0,
      thresholdUnit: 'item'
    })
    const productModalIndex = ref(null)
    const openProductModal = (index) => {
      productModalIndex.value = index
      showProductModal.value = true
      newProduct.name = ''
      newProduct.categoryId = ''
      newProduct.vendorId = ''
      newProduct.unitConfig = {
        structure: '',
        item: { type: 'item', conversionRate: 1 },
        package: { type: 'package', conversionRate: 0 },
        case: { type: 'case', conversionRate: 0 }
      }
      newProduct.threshold = 0
      newProduct.thresholdUnit = 'item'
      selectedCategoryId.value = ''
    }
    const closeProductModal = () => {
      showProductModal.value = false
      productModalIndex.value = null
    }
    // Handler for NewProductModal submit
    const handleProductSubmit = async (productData) => {
      let productId = null
      try {
        productId = await store.addProduct(productData)
        await store.fetchProducts()
        if (productModalIndex.value !== null) {
          formData.items[productModalIndex.value].productId = productId
        }
      } catch (error) {
        console.error('Product add error:', error)
      }
      closeProductModal()
      if (productId) {
        toast.success('Product added successfully')
      } else {
        toast.error('Failed to add product')
      }
    }
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
      seasonFilter,
      products,
      vendors,
      categories,
      selectedCategoryId,
      subCategoryOptions,
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
      getSeasonLabel,
      toggleDropdown,
      closeDropdown,
      showProductModal,
      openProductModal,
      closeProductModal,
      handleProductSubmit,
      newProduct
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
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 1px 3px var(--shadow-color);
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
  color: var(--text-primary);
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
  color: var(--text-secondary);
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
  color: var(--text-muted);
  padding: 4px;
}

.close-btn:hover {
  color: var(--text-primary);
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
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-blue);
  box-shadow: 0 0 0 3px var(--color-blue-light);
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
  background: var(--table-header-bg);
  color: var(--text-primary);
  font-weight: 600;
}

.data-table td {
  color: var(--text-primary);
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

.actions-button {
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

.actions-button:hover {
  background: #e5e7eb;
}

/* Click-based dropdown */
.dropdown-open .actions-menu {
  display: block;
}

/* Table container overflow management */
.table-container:has(.dropdown-open) {
  overflow: visible;
}

.table-container.dropdown-active {
  overflow: visible;
}

.actions-menu {
  display: block;
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

.action-item {
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

.action-item:hover {
  background: #f3f4f6;
}

.action-item.action-delete {
  background: #dc2626;
  color: white;
}

.action-item.action-delete:hover {
  background: #b91c1c;
}
.badge {
  display: inline-block;
  padding: 6px 18px;
  border-radius: 999px;
  font-size: 0.95em;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.02em;
  line-height: 1.2;
  vertical-align: middle;
}

.badge-blue {
  background: #dbeafe;
  color: #2563eb;
}
.badge-success {
  background: #d1fae5;
  color: #059669;
}
.badge-danger {
  background: #fee2e2;
  color: #dc2626;
}
.badge-red {
  background: #fee2e2;
  color: #dc2626;
}
.badge-gold {
  background: #fffae5;
  color: #b45309;
}

.text-muted {
  color: var(--text-muted);
  font-size: 0.95em;
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