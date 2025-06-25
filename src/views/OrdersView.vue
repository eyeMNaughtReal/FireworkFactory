<template>
  <div class="orders">
    <div class="page-header">
      <h1>🛒 Orders Management</h1>
      <button @click="showAddForm = true" class="btn-primary" :disabled="loading.orders">
        ➕ New Order
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading.orders" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading orders...</p>
    </div>

    <!-- Error State -->
    <div v-if="errors.fetchOrders" class="error-message">
      <p>❌ Error loading orders: {{ errors.fetchOrders }}</p>
      <button @click="store.fetchOrders()" class="btn-retry">🔄 Retry</button>
    </div>

    <!-- Main Content -->
    <div v-else-if="!loading.orders" class="orders-content">
      <div class="orders-stats">
        <div class="stat-card">
          <h3>Total Orders</h3>
          <div class="stat-number">{{ orders.length }}</div>
        </div>
        
        <div class="stat-card">
          <h3>Pending Orders</h3>
          <div class="stat-number">{{ pendingOrders.length }}</div>
        </div>
        
        <div class="stat-card">
          <h3>Received Orders</h3>
          <div class="stat-number">{{ receivedOrders.length }}</div>
        </div>
      </div>

      <div class="orders-table" v-if="orders.length > 0">
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Vendor</th>
              <th>Items</th>
              <th>Total Cost</th>
              <th>Status</th>
              <th>Order Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td class="order-id">{{ order.orderNumber || order.id.slice(-6) }}</td>
              <td>{{ getVendorName(order.vendorId) }}</td>
              <td>{{ order.items?.length || 0 }} items</td>
              <td>${{ calculateOrderTotal(order).toFixed(2) }}</td>
              <td>
                <span class="status-badge" :class="order.status">
                  {{ formatStatus(order.status) }}
                </span>
              </td>
              <td>{{ formatDate(order.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button @click="viewOrder(order)" class="btn-view" title="View Details">👁️</button>
                  <button @click="editOrder(order)" class="btn-edit" title="Edit Order">✏️</button>
                  <button 
                    v-if="order.status === 'pending'" 
                    @click="markAsReceived(order)" 
                    class="btn-receive" 
                    title="Mark as Received"
                  >
                    📦
                  </button>
                  <button v-if="order.status !== 'cancelled'" @click="cancelOrder(order)" class="btn-edit" title="Cancel Order">🚫</button>
                  <button @click="deleteOrder(order)" class="btn-delete" title="Delete Order">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No Orders Yet</h3>
        <p>Create your first order to get started.</p>
        <button @click="showAddForm = true" class="btn-primary">➕ Create Order</button>
      </div>
    </div>

    <!-- Add Order Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click="showAddForm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingOrder ? 'Edit Order' : 'Create New Order' }}</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveOrder" class="order-form">
          <div class="form-group">
            <label>Order Items*</label>
            <div class="order-items enhanced-ui">
              <div class="order-items-header">
                <span>Product</span>
                <span>Quantity (Cases)</span>
                <span>Unit Cost (per Case)</span>
                <span>Total</span>
                <span>Actions</span>
              </div>
              <div v-for="(item, index) in formData.items" :key="index" class="order-item enhanced-row">
                <div class="product-select-group">
                  <div class="select-with-icon">
                    <select v-model="item.productId" @change="updateItemProduct(item)" required>
                      <option value="">Select Product</option>
                      <option v-for="product in availableProducts" :key="product.id" :value="product.id">
                        {{ product.name }} ({{ product.sku }})
                      </option>
                    </select>
                    <button type="button" @click="openProductModal(index)" class="btn-add-product" title="Add New Product">
                      <span class="icon-plus">➕</span>
                    </button>
                  </div>
                </div>
                <div class="input-adorned">
                  <input 
                    v-model.number="item.quantity" 
                    type="number" 
                    min="1" 
                    placeholder="Qty (Cases)" 
                    required
                    class="qty-input"
                  />
                </div>
                <div class="input-adorned">
                  <span class="input-prefix">$</span>
                  <input 
                    v-model.number="item.unitCost" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    placeholder="Unit Cost (per Case)" 
                    required
                    class="cost-input"
                  />
                </div>
                <span class="item-total">${{ getItemTotal(item).toFixed(2) }}</span>
                <button type="button" @click="removeItem(index)" class="btn-remove" title="Remove Item">🗑️</button>
              </div>
              <button type="button" @click="addItem" class="btn-add-item enhanced-add-item">➕ Add Item</button>
            </div>
          </div>

          <div class="form-total">
            <strong>Total: ${{ orderTotal !== undefined ? orderTotal.toFixed(2) : calculateOrderTotal(formData).toFixed(2) }}</strong>
          </div>

          <div v-if="errorMsg" class="error">{{ errorMsg }}</div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? 'Saving...' : (editingOrder ? 'Update' : 'Create') }} Order
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Product Modal -->
    <div v-if="showProductModal" class="modal-overlay" @click="closeProductModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Add New Product</h2>
          <button @click="closeProductModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveProduct" class="product-form">
          <div class="form-group">
            <label>Product Name*</label>
            <input v-model="productForm.name" type="text" required />
          </div>
          <div class="form-group">
            <label>Category*</label>
            <select v-model="productForm.categoryId" required>
              <option value="">Select Category</option>
              <option v-for="category in store.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Low Inventory Threshold</label>
            <input v-model.number="productForm.lowInventoryThreshold" type="number" min="0" />
          </div>
          <div class="form-group">
            <label>Unit Type</label>
            <select v-model="productForm.units.type">
              <option value="item">Item</option>
              <option value="box">Box</option>
              <option value="case">Case</option>
            </select>
          </div>
          <div class="form-group">
            <label>Items per Pack (optional)</label>
            <input v-model.number="productForm.itemsPerPack" type="number" min="1" placeholder="e.g. 6" />
          </div>
          <div class="form-group">
            <label>Packs per Case (optional)</label>
            <input v-model.number="productForm.packsPerCase" type="number" min="1" placeholder="e.g. 4" />
          </div>
          <div class="form-group">
            <label>Items per Case <span v-if="productForm.itemsPerPack && productForm.packsPerCase">(auto-calculated)</span></label>
            <input v-model.number="productForm.itemsPerCase" type="number" min="1" :readonly="productForm.itemsPerPack && productForm.packsPerCase" :value="autoItemsPerCase" placeholder="e.g. 24" />
          </div>
          <div v-if="productErrorMsg" class="error">{{ productErrorMsg }}</div>
          <div v-if="productSuccessMsg" class="success">{{ productSuccessMsg }}</div>
          <div class="form-actions">
            <button type="button" @click="closeProductModal" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Add Product</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'

export default {
  name: 'OrdersView',
  setup() {
    const store = useInventoryStore()
    const showAddForm = ref(false)
    const editingOrder = ref(null)
    const submitting = ref(false)
    const showProductModal = ref(false)
    const productForm = ref({
      name: '',
      categoryId: '',
      vendorId: '',
      lowInventoryThreshold: 10,
      itemsPerPack: undefined,
      packsPerCase: undefined,
      itemsPerCase: undefined,
      units: { type: 'item', conversionRate: 1 }
    })
    // Track which item row triggered the modal
    const productModalRowIndex = ref(null)
    const formData = ref({
      vendorId: '',
      items: [{ productId: '', quantity: 1, unitCost: 0, unitType: 'item' }],
      notes: '',
      status: 'pending'
    })
    const errorMsg = ref('')
    const successMsg = ref('')
    // Add separate refs for product modal
    const productErrorMsg = ref('')
    const productSuccessMsg = ref('')

    // Computed properties
    const orders = computed(() => store.orders)
    const vendors = computed(() => store.vendors)
    const products = computed(() => store.products)
    const loading = computed(() => store.loading)
    const errors = computed(() => store.errors)
    
    const pendingOrders = computed(() => 
      orders.value.filter(order => order.status === 'pending')
    )
    
    const receivedOrders = computed(() => 
      orders.value.filter(order => order.status === 'received')
    )
    
    const availableProducts = computed(() =>
      formData.value.vendorId
        ? products.value.filter(p => p.vendorId === formData.value.vendorId)
        : products.value
    )
    
    const orderTotal = computed(() => 
      formData.value.items.reduce((sum, item) => 
        sum + (item.quantity * item.unitCost || 0), 0
      )
    )

    // Computed: auto-calculate itemsPerCase if both itemsPerPack and packsPerCase are set
    const autoItemsPerCase = computed(() => {
      if (productForm.value.itemsPerPack && productForm.value.packsPerCase) {
        return productForm.value.itemsPerPack * productForm.value.packsPerCase
      }
      return productForm.value.itemsPerCase || ''
    })

    // Methods
    const formatDate = (dateValue) => {
      if (!dateValue) return 'N/A'
      // Firestore Timestamp object
      if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
        const d = dateValue.toDate()
        return isNaN(d) ? 'N/A' : d.toLocaleDateString()
      }
      // ISO string or number
      const d = new Date(dateValue)
      return isNaN(d) ? 'N/A' : d.toLocaleDateString()
    }

    const formatStatus = (status) => {
      const statusMap = {
        'pending': 'Pending',
        'received': 'Received',
        'cancelled': 'Cancelled'
      }
      return statusMap[status] || status
    }

    const getVendorName = (vendorId) => {
      const vendor = vendors.value.find(v => v.id === vendorId)
      return vendor ? vendor.name : 'Unknown Vendor'
    }

    // Helper: Get product units for unit selector
    const getProductUnits = (productId) => {
      const product = products.value.find(p => p.id === productId)
      if (!product || !product.units) return [{ type: 'item', conversionRate: 1 }]
      // Support array or object for backward compatibility
      if (Array.isArray(product.units)) return product.units
      return [product.units]
    }

    // Helper: Get conversion rate for a given product/unitType
    const getConversionRate = (productId, unitType) => {
      const units = getProductUnits(productId)
      const found = units.find(u => u.type === unitType)
      return found ? found.conversionRate || 1 : 1
    }

    // Calculate item total (per order row, per case)
    const getItemTotal = (item) => {
      return (item.quantity || 0) * (item.unitCost || 0)
    }

    // Calculate order total (sum of all case totals)
    const calculateOrderTotal = (order) => {
      if (!order.items || !Array.isArray(order.items)) return 0
      return order.items.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.unitCost || 0))
      }, 0)
    }

    // Convert cases to items for inventory/logic
    const getItemsFromCases = (productId, cases) => {
      const product = products.value.find(p => p.id === productId)
      if (!product) return 0
      // Prefer itemsPerCase, fallback to 1
      return (cases || 0) * (product.itemsPerCase || 1)
    }

    const viewOrder = (order) => {
      console.log('Viewing order:', order)
      // TODO: Implement order details modal
    }

    const editOrder = (order) => {
      editingOrder.value = order
      formData.value = {
        vendorId: order.vendorId || '',
        items: order.items?.map(item => ({
          ...item,
          unitType: item.unitType || 'item'
        })) || [{ productId: '', quantity: 1, unitCost: 0, unitType: 'item' }],
        notes: order.notes || '',
        status: order.status || 'pending'
      }
      showAddForm.value = true
    }

    const markAsReceived = async (order) => {
      try {
        await store.updateOrder(order.id, { status: 'received' })
      } catch (error) {
        console.error('Error marking order as received:', error)
      }
    }

    const addItem = () => {
      formData.value.items.push({ productId: '', quantity: 1, unitCost: 0, unitType: 'item' })
    }

    const removeItem = (index) => {
      if (formData.value.items.length > 1) {
        formData.value.items.splice(index, 1)
      }
    }

    const updateItemProduct = (item) => {
      const product = products.value.find(p => p.id === item.productId)
      if (product && product.wholesalePrice) {
        item.unitCost = product.wholesalePrice
      }
      // Set default unitType if not set
      if (product && product.units) {
        if (Array.isArray(product.units)) {
          item.unitType = product.units[0]?.type || 'item'
        } else {
          item.unitType = product.units.type || 'item'
        }
      } else {
        item.unitType = 'item'
      }
    }

    const openProductModal = (rowIndex = null) => {
      productForm.value = {
        name: '',
        categoryId: '',
        vendorId: formData.value.vendorId,
        lowInventoryThreshold: 10,
        itemsPerPack: undefined,
        packsPerCase: undefined,
        itemsPerCase: undefined,
        units: { type: 'item', conversionRate: 1 }
      }
      productModalRowIndex.value = rowIndex
      showProductModal.value = true
      errorMsg.value = ''
      successMsg.value = ''
    }

    const saveProduct = async () => {
      if (!productForm.value.name || !productForm.value.categoryId) {
        productErrorMsg.value = 'Please fill in all required product fields.'
        return
      }
      // Always set itemsPerCase for backend
      if (productForm.value.itemsPerPack && productForm.value.packsPerCase) {
        productForm.value.itemsPerCase = productForm.value.itemsPerPack * productForm.value.packsPerCase
      }
      try {
        const newProduct = await store.addProduct({ ...productForm.value })
        // Refresh products if needed (Pinia store should be reactive, but force fetch if not)
        if (typeof store.fetchProducts === 'function') {
          await store.fetchProducts()
        }
        // Set the new product in the correct row
        const idx = productModalRowIndex.value ?? (formData.value.items.length - 1)
        if (formData.value.items[idx]) {
          formData.value.items[idx].productId = newProduct.id
        }
        showProductModal.value = false
        productErrorMsg.value = ''
        productSuccessMsg.value = 'Product added!'
        productModalRowIndex.value = null
      } catch (e) {
        productErrorMsg.value = 'Failed to create product.'
      }
    }

    const closeProductModal = () => {
      showProductModal.value = false
      productErrorMsg.value = ''
      productSuccessMsg.value = ''
      productModalRowIndex.value = null
    }

    const closeModal = () => {
      showAddForm.value = false
      editingOrder.value = null
      formData.value = {
        vendorId: '',
        items: [{ productId: '', quantity: 1, unitCost: 0, unitType: 'item' }],
        notes: '',
        status: 'pending'
      }
    }

    const saveOrder = async () => {
      if (submitting.value) return
      // Validation
      if (!formData.value.items.length || formData.value.items.some(i => !i.productId || i.quantity <= 0)) {
        errorMsg.value = 'All items must have a product and quantity.'
        return
      }
      if (formData.value.items.some(i => i.unitCost <= 0)) {
        errorMsg.value = 'All items must have a unit cost greater than 0.'
        return
      }
      submitting.value = true
      errorMsg.value = ''
      try {
        // Convert cases to items for each order item
        const itemsForOrder = formData.value.items.map(item => ({
          ...item,
          quantityCases: item.quantity, // store original
          quantityItems: getItemsFromCases(item.productId, item.quantity)
        }))
        const orderData = {
          vendorId: formData.value.vendorId, // can be blank
          items: itemsForOrder,
          notes: formData.value.notes,
          status: formData.value.status || 'pending',
          orderNumber: editingOrder.value?.orderNumber || `ORD-${Date.now()}`,
          createdAt: editingOrder.value?.createdAt || new Date().toISOString()
        }
        if (editingOrder.value) {
          await store.updateOrder(editingOrder.value.id, orderData)
        } else {
          await store.addOrder(orderData)
        }
        closeModal()
      } catch (error) {
        errorMsg.value = 'Failed to save order.'
      } finally {
        submitting.value = false
      }
    }

    const deleteOrder = async (order) => {
      if (confirm('Are you sure you want to delete this order?')) {
        try {
          await store.deleteOrder(order.id)
        } catch (error) {
          alert('Failed to delete order.')
        }
      }
    }
    const cancelOrder = async (order) => {
      if (order.status === 'cancelled') return
      if (confirm('Cancel this order?')) {
        try {
          await store.updateOrder(order.id, { status: 'cancelled' })
        } catch (error) {
          alert('Failed to cancel order.')
        }
      }
    }

    // Initialize data
    onMounted(async () => {
      try {
        await Promise.all([
          store.fetchOrders(),
          store.fetchVendors(),
          store.fetchProducts()
        ])
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    })

    return {
      // State
      showAddForm,
      editingOrder,
      submitting,
      formData,
      store,
      showProductModal,
      productForm,
      errorMsg,
      successMsg,
      productErrorMsg,
      productSuccessMsg,
      productModalRowIndex,
      
      // Computed
      orders,
      vendors,
      products,
      loading,
      errors,
      pendingOrders,
      receivedOrders,
      availableProducts,
      orderTotal,
      
      // Methods
      formatDate,
      formatStatus,
      getVendorName,
      calculateOrderTotal,
      viewOrder,
      editOrder,
      markAsReceived,
      addItem,
      removeItem,
      updateItemProduct,
      openProductModal,
      saveProduct,
      closeProductModal,
      closeModal,
      saveOrder,
      deleteOrder,
      cancelOrder
    }
  }
}
</script>

<style scoped>
.orders {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 2rem;
  font-weight: bold;
}

.loading-container {
  text-align: center;
  padding: 48px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: center;
}

.error-message p {
  margin: 0 0 12px;
  color: #dc2626;
}

.btn-retry {
  background: #dc2626;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-retry:hover {
  background: #b91c1c;
}

.orders-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.orders-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 8px;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
}

.orders-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.orders-table table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th,
.orders-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.orders-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.orders-table tbody tr:hover {
  background: #f9fafb;
}

.order-id {
  font-family: monospace;
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.received {
  background: #d1fae5;
  color: #059669;
}

.status-badge.cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-view,
.btn-edit,
.btn-receive {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  font-size: 1rem;
}

.btn-view:hover,
.btn-edit:hover,
.btn-receive:hover {
  background: #f3f4f6;
}

.btn-receive {
  background: #10b981;
  color: white;
}

.btn-receive:hover {
  background: #059669;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: #1f2937;
  font-size: 1.5rem;
}

.empty-state p {
  margin: 0 0 24px;
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
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

.order-form {
  padding: 24px;
}

.product-form {
  padding: 24px;
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

.order-items {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
}

.order-items.enhanced-ui {
  background: #f7fafc;
  border: 1.5px solid #e0e7ef;
  border-radius: 10px;
  padding: 20px 16px 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(60, 60, 100, 0.04);
}

.order-items-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 12px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 10px;
  font-size: 1rem;
  letter-spacing: 0.01em;
}

.order-item.enhanced-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 40px;
  gap: 12px;
  align-items: center;
  background: #fff;
  border-radius: 7px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(60, 60, 100, 0.04);
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s, border 0.2s;
}

.order-item.enhanced-row:hover {
  box-shadow: 0 4px 12px rgba(60, 60, 100, 0.10);
  border: 1.5px solid #3b82f6;
}

.product-select-group .select-with-icon {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-add-product {
  background: #e0e7ef;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #3b82f6;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.btn-add-product:hover {
  background: #3b82f6;
  color: #fff;
}

.input-adorned {
  display: flex;
  align-items: center;
  position: relative;
}

.input-prefix {
  position: absolute;
  left: 10px;
  color: #6b7280;
  font-size: 1rem;
  pointer-events: none;
}

.cost-input {
  padding-left: 20px;
}

.qty-input, .cost-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 1rem;
  background: #f9fafb;
  transition: border 0.2s;
}

.qty-input:focus, .cost-input:focus {
  border: 1.5px solid #3b82f6;
  outline: none;
  background: #fff;
}

.item-total {
  font-weight: 700;
  color: #059669;
  text-align: right;
  font-size: 1.1rem;
}

.btn-remove {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.2s, color 0.2s;
}

.btn-remove:hover {
  background: #dc2626;
  color: #fff;
}

.enhanced-add-item {
  margin-top: 8px;
  background: #3b82f6;
  color: #fff;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 20px;
  border: none;
  box-shadow: 0 1px 3px rgba(60, 60, 100, 0.06);
  transition: background 0.2s;
}

.enhanced-add-item:hover {
  background: #2563eb;
}

.form-total {
  background: #f9fafb;
  padding: 16px;
  border-radius: 6px;
  text-align: right;
  margin-bottom: 24px;
  font-size: 1.125rem;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 14px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
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

@media (max-width: 768px) {
  .orders {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .orders-stats {
    grid-template-columns: 1fr;
  }
  
  .orders-table {
    overflow-x: auto;
  }
  
  .modal {
    width: 95%;
    margin: 16px;
  }
  
  .order-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .item-total {
    text-align: left;
  }
}
</style>
