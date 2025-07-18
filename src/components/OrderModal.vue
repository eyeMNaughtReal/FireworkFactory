<template>
  <div v-if="show" class="modal-overlay" @click="onCancel">
    <div class="modal modal-wide modal-wider" @click.stop>
      <div class="modal-header">
        <h2>{{ isEdit ? 'Edit Order' : 'New Order' }}</h2>
        <button @click="onCancel" class="close-btn">&times;</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="form">
        <!-- Order Details Section -->
        <details open class="form-section order-details-section collapsible-section">
          <summary class="section-summary"><span>Order Details</span></summary>
          <div class="form-row">
            <div class="form-group">
              <label>Order Date</label>
              <input type="date" v-model="localOrder.orderDate" class="form-input" required />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="localOrder.status" class="form-input">
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div class="form-group">
              <label>Season</label>
              <select v-model="localOrder.season" class="form-input">
                <option value="">General Stock</option>
                <option value="july-4th">4th of July</option>
                <option value="new-years">New Year's</option>
              </select>
            </div>
          </div>
        </details>

        <hr class="section-divider" />

        <!-- Order Items Section -->
        <details open class="form-section order-items-section collapsible-section">
          <summary class="section-summary"><span>Order Items</span></summary>
          <div class="section-header">
            <h3>Order Items</h3>
            <button type="button" @click="$emit('addOrderItem')" class="btn-primary btn-compact">Add Item</button>
          </div>
          
          <div class="table-scroll-container">
            <table class="data-table order-items-table">
              <thead class="sticky-header">
                <tr>
                  <th class="col-product">Product</th>
                  <th class="col-unit">Unit</th>
                  <th class="col-quantity">Quantity</th>
                  <th class="col-unit-cost">Unit Cost</th>
                  <th class="col-markup">Mark Up (%)</th>
                  <th class="col-marked-value">Marked Up Value</th>
                  <th class="col-total">Total</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in localOrder.items" :key="index" class="item-row">
                  <!-- Product -->
                  <td class="col-product">
                    <select v-model="item.productId" required class="form-input compact-input">
                      <option value="">Select Product</option>
                      <option v-for="product in products" :key="product.id" :value="product.id">
                        {{ product.name }} ({{ getVendorName(getProductVendorId(product.id)) }})
                      </option>
                    </select>
                  </td>

                  <!-- Unit -->
                  <td class="col-unit">
                    <select v-model="item.unit" class="form-input compact-input" @change="$emit('updateUnitConversion', item)">
                      <option value="case">Case</option>
                      <option value="pack">Pack</option>
                      <option value="item">Item</option>
                    </select>
                    <div class="unit-info" v-if="item.productId">
                      {{ getUnitInfo(item) }}
                    </div>
                  </td>

                  <!-- Quantity -->
                  <td class="col-quantity">
                    <input type="number" v-model.number="item.quantity" min="1" required class="form-input compact-input">
                    <div class="unit-total" v-if="item.productId">
                      Total Items: {{ calculateTotalItems(item) }}
                    </div>
                  </td>

                  <!-- Unit Cost -->
                  <td class="col-unit-cost">
                    <input type="number" v-model.number="item.unitCost" min="0" step="0.01" required class="form-input compact-input">
                  </td>

                  <!-- Mark Up % -->
                  <td class="col-markup">
                    <input type="number" v-model.number="item.markUp" min="0" step="0.01" class="form-input compact-input" placeholder="%">
                  </td>

                  <!-- Marked Up Value -->
                  <td class="col-marked-value text-right">
                    <span class="calculated-value">${{ (item.unitCost * (1 + (item.markUp || 0) / 100)).toFixed(2) }}</span>
                  </td>

                  <!-- Total -->
                  <td class="col-total text-right">
                    <span class="calculated-value">${{ (item.quantity * item.unitCost || 0).toFixed(2) }}</span>
                  </td>

                  <!-- Actions -->
                  <td class="col-actions">
                    <button type="button" @click="$emit('removeOrderItem', index)" class="remove-btn" title="Remove Item">
                      ×
                    </button>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr v-if="localOrder.items.length === 0">
                  <td colspan="8" class="empty-message">Click "Add Item" to add products to this order</td>
                </tr>
              </tbody>
              
              <!-- Footer with Total -->
              <tfoot v-if="localOrder.items.length > 0">
                <tr class="total-row">
                  <td colspan="6" class="text-right"><strong>Order Total:</strong></td>
                  <td class="text-right"><strong>${{ orderTotal.toFixed(2) }}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </details>

        <!-- Form Actions -->
        <div class="form-actions sticky-actions">
          <div class="actions-row">
            <div class="left-actions">
              <button type="button" @click="onCancel" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="!localOrder.items.length || submitting">
                {{ submitting ? 'Saving...' : (isEdit ? 'Update Order' : 'Create Order') }}
              </button>
            </div>
            <button type="button" @click="openProductModalSafe" class="btn-primary add-product-btn">
              Add Product
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { reactive, watch, toRefs } from 'vue'

export default {
  name: 'OrderModal',
  props: {
    show: { type: Boolean, required: true },
    order: { type: Object, required: true },
    isEdit: { type: Boolean, default: false },
    products: { type: Array, default: () => [] },
    vendors: { type: Array, default: () => [] },
    submitting: { type: Boolean, default: false },
    getVendorName: { type: Function, required: true },
    getProductVendorId: { type: Function, required: true },
    getUnitInfo: { type: Function, required: true },
    calculateTotalItems: { type: Function, required: true },
    orderTotal: { type: Number, default: 0 }
  },
  emits: ['submit', 'cancel', 'addOrderItem', 'removeOrderItem', 'openProductModal', 'updateUnitConversion'],
  setup(props, { emit }) {
    const localOrder = reactive({ ...props.order })
    
    watch(() => props.order, (val) => {
      Object.assign(localOrder, val)
    })
    
    const handleSubmit = () => {
      emit('submit', { ...localOrder })
    }
    
    const onCancel = () => {
      emit('cancel')
    }
    
    // Fix: Guarantee all unitConfig fields are present and not undefined
    const openProductModalSafe = () => {
      let payload = {}
      if (localOrder.items && localOrder.items.length > 0) {
        const lastItem = localOrder.items[localOrder.items.length - 1]
        payload = { ...lastItem }
        if (!payload.unitConfig) {
          payload.unitConfig = {
            itemsPerCase: 0,
            itemsPerPackage: 0,
            itemsPerItem: 0
          }
        } else {
          if (payload.unitConfig.itemsPerCase === undefined) payload.unitConfig.itemsPerCase = 0
          if (payload.unitConfig.itemsPerPackage === undefined) payload.unitConfig.itemsPerPackage = 0
          if (payload.unitConfig.itemsPerItem === undefined) payload.unitConfig.itemsPerItem = 0
        }
      }
      emit('openProductModal', payload)
    }
    
    return {
      ...toRefs(props),
      localOrder,
      handleSubmit,
      onCancel,
      openProductModalSafe
    }
  }
}
</script>

<style scoped>
/* Modal Styles */
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

.modal-wide {
  background: white;
  border-radius: 12px;
  width: 98%;
  max-width: 1400px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  line-height: 1;
}

.close-btn:hover {
  color: #374151;
}

/* Form Styles */
.form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Section Styles */
.collapsible-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
  background: #f9fafb;
}

.section-summary {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  padding: 16px 20px;
  cursor: pointer;
  list-style: none;
}

.section-summary::-webkit-details-marker {
  display: none;
}

.order-details-section {
  padding: 0 20px 20px 20px;
}

.order-items-section {
  padding: 0 20px 20px 20px;
}

.section-divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0 0 16px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

/* Table Styles */
.table-scroll-container {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: 14px;
}

.sticky-header {
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 10;
}

.data-table th {
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  background: #f8fafc;
}

.data-table td {
  padding: 8px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

/* Column Widths */
.col-product { width: 220px; min-width: 200px; }
.col-unit { width: 120px; min-width: 110px; }
.col-quantity { width: 100px; min-width: 90px; }
.col-unit-cost { width: 100px; min-width: 90px; }
.col-markup { width: 100px; min-width: 90px; }
.col-marked-value { width: 120px; min-width: 110px; }
.col-total { width: 100px; min-width: 90px; }
.col-actions { width: 60px; min-width: 50px; }

/* Input Styles */
.compact-input {
  padding: 6px 8px;
  font-size: 13px;
  min-height: 32px;
}

.col-product .compact-input {
  width: 100%;
  max-width: 210px;
}

.col-unit .compact-input,
.col-quantity .compact-input,
.col-unit-cost .compact-input,
.col-markup .compact-input {
  width: 100%;
}

/* Info Text */
.unit-info {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.3;
}

.unit-total {
  font-size: 11px;
  color: #2563eb;
  margin-top: 4px;
  font-weight: 500;
  line-height: 1.3;
}

.calculated-value {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

/* Row Styles */
.item-row:hover {
  background: #f8fafc;
}

.total-row {
  background: #f8fafc;
  font-weight: 600;
}

.total-row td {
  padding: 12px 8px;
  border-top: 2px solid #e5e7eb;
}

/* Action Buttons */
.remove-btn {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: #fecaca;
  border-color: #dc2626;
}

/* Button Styles */
.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-compact {
  padding: 6px 12px;
  font-size: 13px;
}

/* Form Actions */
.sticky-actions {
  position: sticky;
  bottom: 0;
  background: white;
  padding: 16px 0 0 0;
  margin-top: 16px;
  border-top: 1px solid #e5e7eb;
  z-index: 5;
}

.actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.left-actions {
  display: flex;
  gap: 12px;
}

.add-product-btn {
  padding: 10px 20px;
  font-weight: 600;
}

/* Utility Classes */
.text-right {
  text-align: right;
}

.empty-message {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 32px 16px;
}

/* Responsive */
@media (max-width: 1200px) {
  .modal-wide {
    width: 95%;
    padding: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>