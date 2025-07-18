<template>
  <div v-if="show" class="modal-overlay" @click="onCancel">
    <div class="form-container" @click.stop>
      <h2 class="content-title">Add New Product</h2>
      <form @submit.prevent="handleSubmit">
        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
        <div class="form-group">
          <label class="form-label">Product Name*</label>
          <input v-model="localProduct.name" type="text" class="form-input" required>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label">Category*</label>
          <select v-model="localProduct.categoryId" class="form-select" required @change="onCategoryChange">
            <option value="">Select Category</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
          <div v-if="subCategoryOptions && subCategoryOptions.length && localProduct.categoryId" style="margin-top: 4px;">
            <label class="form-label" style="margin-bottom: 4px;">Sub-Category</label>
            <select v-model="localProduct.subCategory" class="form-select">
              <option value="">Select Sub-Category</option>
              <option v-for="sub in subCategoryOptions" :key="sub" :value="sub">{{ sub }}</option>
            </select>
          </div>
        </div>
        <div class="form-section">
          <h3>Unit Configuration</h3>
          <div class="form-group">
            <label class="form-label">Unit Structure*</label>
            <select v-model="localProduct.unitConfig.structure" class="form-input" required @change="resetUnitConfig">
              <option value="">Select Unit Structure</option>
              <option value="item-package-case">Item → Package → Case</option>
              <option value="item-case">Item → Case (No Packages)</option>
            </select>
            <div class="help-text">Select how this product is organized</div>
          </div>
          <template v-if="localProduct.unitConfig.structure === 'item-package-case'">
            <div class="unit-grid">
              <div class="form-group">
                <label class="form-label">Items per Package*</label>
                <input v-model.number="localProduct.unitConfig.package.conversionRate" type="number" class="form-input" min="1" required @input="calculateTotalItems" />
                <div class="help-text">Number of items in one package</div>
              </div>
              <div class="form-group">
                <label class="form-label">Packages per Case*</label>
                <input v-model.number="localProduct.unitConfig.case.conversionRate" type="number" class="form-input" min="1" required @input="calculateTotalItems" />
                <div class="help-text">Number of packages in one case</div>
              </div>
            </div>
          </template>
          <template v-else-if="localProduct.unitConfig.structure === 'item-case'">
            <div class="unit-grid">
              <div class="form-group">
                <label class="form-label">Items per Case*</label>
                <input v-model.number="localProduct.unitConfig.case.conversionRate" type="number" class="form-input" min="1" required @input="calculateTotalItems" />
                <div class="help-text">Number of items in one case</div>
              </div>
            </div>
          </template>
          <div class="unit-summary" v-if="localProduct.unitConfig.structure">
            <strong>Total Items per Case:</strong> {{ localProduct.unitConfig.totalItemsPerCase || 0 }}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Vendor*</label>
          <select v-model="localProduct.vendorId" class="form-select" required>
            <option value="">Select Vendor</option>
            <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
              {{ vendor.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Low Stock Threshold</label>
          <div class="threshold-config">
            <input v-model.number="localProduct.threshold" type="number" class="form-input threshold-input" min="0" />
            <select v-model="localProduct.thresholdUnit" class="form-select threshold-unit">
              <option value="item">Items</option>
              <option value="pack" v-if="localProduct.unitConfig.structure === 'item-package-case'">Packages</option>
              <option value="case">Cases</option>
            </select>
          </div>
          <div class="threshold-info" v-if="localProduct.threshold && localProduct.thresholdUnit">
            Alert when stock falls below: {{ getThresholdInItems() }} individual items
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-secondary" @click="onCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Product</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { reactive, watch, ref, computed } from 'vue'; // Removed 'toRefs' as it is unused
export default {
  name: 'NewProductModal',
  props: {
    show: { type: Boolean, required: true },
    vendors: { type: Array, required: true },
    categories: { type: Array, default: () => [] },
    product: { type: Object, default: () => ({
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
    }) }
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const errorMsg = ref('')
    // Defensive deep initialization for localProduct and unitConfig
    // (already declared above, do not redeclare)
    // Computed subCategoryOptions based on selected categoryId
    const subCategoryOptions = computed(() => {
      const selectedCat = props.categories.find(cat => cat.id === localProduct.categoryId)
      return selectedCat && Array.isArray(selectedCat.subCategories) ? selectedCat.subCategories : []
    })
    const onCategoryChange = () => {
      // Optionally clear subCategory if category changes
      localProduct.subCategory = ''
    }
    // Defensive deep initialization for localProduct and unitConfig
    const defaultUnitConfig = {
      structure: '',
      item: { type: 'item', conversionRate: 1 },
      package: { type: 'package', conversionRate: 0 },
      case: { type: 'case', conversionRate: 0 }
    }
    const localProduct = reactive({
      ...props.product,
      unitConfig: {
        ...defaultUnitConfig,
        ...(props.product.unitConfig || {})
      }
    })
    watch(() => props.product, (val) => {
      Object.assign(localProduct, val)
      // Defensive update for unitConfig
      localProduct.unitConfig = {
        ...defaultUnitConfig,
        ...(val.unitConfig || {})
      }
    })
    // Calculate total items per case
    const calculateTotalItems = () => {
      if (localProduct.unitConfig.structure === 'item-package-case') {
        const itemsPerPackage = parseInt(localProduct.unitConfig.package.conversionRate) || 0;
        const packagesPerCase = parseInt(localProduct.unitConfig.case.conversionRate) || 0;
        localProduct.unitConfig.totalItemsPerCase = itemsPerPackage * packagesPerCase;
      } else if (localProduct.unitConfig.structure === 'item-case') {
        const itemsPerCase = parseInt(localProduct.unitConfig.case.conversionRate) || 0;
        localProduct.unitConfig.totalItemsPerCase = itemsPerCase;
      }
    }
    // Reset unit config fields
    const resetUnitConfig = () => {
      if (!localProduct.unitConfig) {
        localProduct.unitConfig = {
          structure: '',
          item: { type: 'item', conversionRate: 1 },
          package: { type: 'package', conversionRate: 0 },
          case: { type: 'case', conversionRate: 0 }
        }
      }
      if (localProduct.unitConfig.structure === 'item-package-case') {
        localProduct.unitConfig.itemsPerCase = undefined;
      } else if (localProduct.unitConfig.structure === 'item-case') {
        localProduct.unitConfig.itemsPerPackage = undefined;
        localProduct.unitConfig.packagesPerCase = undefined;
      }
    }
    // Threshold conversion
    const getThresholdInItems = () => {
      if (!localProduct.threshold || !localProduct.thresholdUnit) return 0;
      switch (localProduct.thresholdUnit) {
        case 'item':
          return localProduct.threshold;
        case 'pack':
          if (localProduct.unitConfig.structure === 'item-package-case') {
            return localProduct.threshold * (localProduct.unitConfig.package.conversionRate || 0);
          }
          return 0;
        case 'case':
          if (localProduct.unitConfig.structure === 'item-package-case') {
            return localProduct.threshold * (localProduct.unitConfig.totalItemsPerCase || 0);
          } else if (localProduct.unitConfig.structure === 'item-case') {
            return localProduct.threshold * (localProduct.unitConfig.case.conversionRate || 0);
          }
          return 0;
        default:
          return 0;
      }
    }
    const handleSubmit = () => {
      errorMsg.value = ''
      if (!localProduct.name || !localProduct.vendorId || !localProduct.categoryId || !localProduct.unitConfig.structure) {
        errorMsg.value = 'Please fill out all required fields.'
        return
      }
      calculateTotalItems()
      // Defensive: Guarantee all required unitConfig fields are present and not undefined
      if (!localProduct.unitConfig) {
        localProduct.unitConfig = {
          structure: '',
          item: { type: 'item', conversionRate: 1 },
          package: { type: 'package', conversionRate: 0 },
          case: { type: 'case', conversionRate: 0 },
          itemsPerCase: 0,
          itemsPerPackage: 0,
          itemsPerItem: 0,
          totalItemsPerCase: 0
        }
      } else {
        if (localProduct.unitConfig.itemsPerCase === undefined) localProduct.unitConfig.itemsPerCase = 0
        if (localProduct.unitConfig.itemsPerPackage === undefined) localProduct.unitConfig.itemsPerPackage = 0
        if (localProduct.unitConfig.itemsPerItem === undefined) localProduct.unitConfig.itemsPerItem = 0
        if (localProduct.unitConfig.totalItemsPerCase === undefined) localProduct.unitConfig.totalItemsPerCase = 0
      }
      emit('submit', { ...localProduct })
    }
    const onCancel = () => {
      emit('cancel')
    }
    return {
      localProduct,
      errorMsg,
      handleSubmit,
      onCancel,
      calculateTotalItems,
      resetUnitConfig,
      getThresholdInItems,
      subCategoryOptions,
      onCategoryChange
    }
  }
}
</script>

<style scoped>
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
.form-container {
  background: white;
  border-radius: 12px;
  width: 95%;
  max-width: 1000px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
}
.content-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 24px;
}
.form-group {
  margin-bottom: 16px;
}
form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.form-section, .actions, .error-message {
  grid-column: 1 / -1;
}
.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}
.form-input,
.form-select {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}
.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 16px;
}
.form-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}
.form-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #374151;
}
.unit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
.help-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}
.unit-summary {
  background: #f3f4f6;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}
.threshold-config {
  display: flex;
  gap: 8px;
  align-items: center;
}
.threshold-input {
  flex: 1;
  max-width: 120px;
}
.threshold-unit {
  flex: 1;
  max-width: 120px;
}
.threshold-info {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  font-style: italic;
}
.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
