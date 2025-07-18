<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Products Management</h1>
      <div class="header-actions">
        <button class="btn-primary" @click="showAddProductForm">
          Add Product
        </button>
      </div>
    </div>

    <div class="filters-container">
      <input 
        type="text" 
        class="search-input"
        v-model="searchQuery"
        placeholder="Search products..."
      />
      <select v-model="categoryFilter" class="filter-select">
        <option value="">All Categories</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name }}
        </option>
      </select>
      <select v-model="vendorFilter" class="filter-select">
        <option value="">All Vendors</option>
        <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
          {{ vendor.name }}
        </option>
      </select>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Category</th>
            <th>Vendor</th>
            <th>Unit Configuration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in filteredProducts" :key="product.id">
            <td>
              <div class="item-name">{{ product.name }}</div>
    
            </td>
            <td>{{ getCategoryName(product.categoryId) }}</td>
            <td>{{ getVendorName(product.vendorId) }}</td>
            <td>
              <div class="unit-config-display">
                {{ formatUnitConfig(product.unitConfig) }}
              </div>
            </td>
            <td>
              <div class="dropdown" :class="{ 'dropdown-open': openDropdown === product.id }">
                <button class="dropdown-toggle" @click="toggleDropdown(product.id)">
                  Actions ▾
                </button>
                <div class="dropdown-menu">
                  <button @click="editProduct(product); closeDropdown()" class="dropdown-item">
                    Edit
                  </button>
                  <button @click="handleDeleteClick(product); closeDropdown()" class="dropdown-item delete-action">
                    Delete
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredProducts.length === 0" class="empty-state">
        <h3>No Products Found</h3>
        <p>Try adjusting your search or filters, or add a new product.</p>
      </div>

      <!-- Pagination -->
      <PagePagination
        v-if="allFilteredProducts.length > 0"
        :current-page="currentPage"
        :total-items="allFilteredProducts.length"
        :per-page="itemsPerPage"
        @update:page="currentPage = $event"
      />
    </div>

    <!-- Reusable NewProductModal Component -->
    <NewProductModal
      :show="showModal"
      :product="editingProduct ? editingProduct : undefined"
      :categories="categories"
      :vendors="vendors"
      @submit="handleProductModalSubmit"
      @cancel="hideModal"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      :is-visible="showDeleteModal"
      title="Confirm Product Deletion"
      :message="'Are you sure you want to delete this product? This action cannot be undone.'"
      confirm-text="Delete Product"
      cancel-text="Cancel"
      :item-details="itemToDelete && itemToDelete.value ? {
        'Name': itemToDelete.value.name,
        'Category': getCategoryName(itemToDelete.value.categoryId),
        'Vendor': getVendorName(itemToDelete.value.vendorId)
      } : null"
      @confirm="deleteProduct"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import PagePagination from '@/components/PagePagination.vue'
import { useToast } from '@/components/Toast.vue'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal.vue'
import useDeleteConfirmation from '@/composables/useDeleteConfirmation'
import NewProductModal from '@/components/NewProductModal.vue'

export default {
  name: 'ProductsView',
  components: {
    PagePagination,
    DeleteConfirmationModal,
    NewProductModal
  },
  setup() {
    // Handles product add/edit from NewProductModal
    const handleProductModalSubmit = async (productData) => {
      try {
        if (editingProduct.value && editingProduct.value.id) {
          // Edit existing product
          await store.updateProduct(editingProduct.value.id, productData)
          toast.success('Product updated successfully')
        } else {
          // Add new product
          await store.addProduct(productData)
          toast.success('Product added successfully')
        }
        showModal.value = false
        editingProduct.value = null
      } catch (error) {
        toast.error('Failed to save product: ' + error.message)
      }
    }
    const store = useInventoryStore()
    const route = useRoute()
    const toast = useToast()
    const showModal = ref(false)
    const editingProduct = ref(null)
    const searchQuery = ref('')
    const categoryFilter = ref('')
    const vendorFilter = ref('')
    const openDropdown = ref(null)

    onMounted(async () => {
      try {
        await Promise.all([
          store.products.length === 0 ? store.fetchProducts() : Promise.resolve(),
          store.categories.length === 0 ? store.fetchCategories() : Promise.resolve(),
          store.vendors.length === 0 ? store.fetchVendors() : Promise.resolve()
        ])
        // Set filter values from URL query parameters
        if (route.query.categoryId) {
          categoryFilter.value = route.query.categoryId
        }
        if (route.query.vendorId) {
          vendorFilter.value = route.query.vendorId
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
    
    const initFormData = () => ({
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

    const formData = reactive({
      ...initFormData(),
      subCategory: ''
    })
    // Sub-category options based on selected category
    const subCategoryOptions = computed(() => {
      const selectedCat = store.categories.find(cat => cat.id === formData.categoryId)
      return selectedCat && Array.isArray(selectedCat.subCategories) ? selectedCat.subCategories : []
    })

    const calculateTotalItems = () => {
      if (formData.unitConfig.structure === 'item-package-case') {
        const itemsPerPackage = parseInt(formData.unitConfig.package.conversionRate) || 0;
        const packagesPerCase = parseInt(formData.unitConfig.case.conversionRate) || 0;
        formData.unitConfig.totalItemsPerCase = itemsPerPackage * packagesPerCase;
      } else if (formData.unitConfig.structure === 'item-case') {
        const itemsPerCase = parseInt(formData.unitConfig.case.conversionRate) || 0;
        formData.unitConfig.totalItemsPerCase = itemsPerCase;
      }
    };

    const totalItemsPerCase = computed(() => {
      return formData.unitConfig.totalItemsPerCase || 0;
    });

    const formatUnitConfig = (config) => {
      if (!config?.structure) return 'Not configured';

      const structure = config.structure;
      const caseConversion = config.case?.conversionRate || 0;
      const packageConversion = config.package?.conversionRate || 0;

      if (structure === 'item-package-case') {
        return `${packageConversion} items/package, ${caseConversion} packages/case`;
      } else if (structure === 'item-case') {
        return `${caseConversion} items/case`;
      }
    };

    // For pagination
    const currentPage = ref(1);
    const itemsPerPage = ref(10);

    // Updated to include all products before pagination for count purposes
    const allFilteredProducts = computed(() => {
      let result = store.products
      
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(p => p.name.toLowerCase().includes(query))
      }
      
      if (categoryFilter.value) {
        result = result.filter(p => p.categoryId === categoryFilter.value)
      }
      
      if (vendorFilter.value) {
        result = result.filter(p => p.vendorId === vendorFilter.value)
      }
      
      return result
    })
    
    // This computed now returns only the current page of products
    const filteredProducts = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      return allFilteredProducts.value.slice(startIndex, endIndex);
    })

    const showAddProductForm = () => {
      editingProduct.value = null
      showModal.value = true
    }

    const editProduct = (product) => {
      editingProduct.value = { ...product }
      showModal.value = true
    }

    const hideModal = () => {
      showModal.value = false
      editingProduct.value = null
    }


    // Delete product using modal confirmation
    /* eslint-disable no-unused-vars */
    const { 
      showDeleteModal, 
      itemToDelete, 
      confirmDelete,
      cancelDelete
    } = useDeleteConfirmation()

    const deleteProduct = async () => {
      try {
        if (!itemToDelete.value) {
          throw new Error('No product selected for deletion')
        }
        await store.deleteProduct(itemToDelete.value.id)
        toast.success('Product deleted successfully')
        showDeleteModal.value = false
        itemToDelete.value = null
      } catch (error) {
        console.error('Failed to delete product:', error)
        toast.error('Failed to delete product: ' + error.message)
      }
    }

    const handleDeleteClick = (product) => {
      confirmDelete(product, 'product')
    }
    /* eslint-enable no-unused-vars */
    
    const getCategoryName = (id) => {
      const category = store.categories.find(c => c.id === id)
      return category ? category.name : 'N/A'
    }

    const getVendorName = (id) => {
      const vendor = store.vendors.find(v => v.id === id)
      return vendor ? vendor.name : 'N/A'
    }

    const getStockStatus = (product) => {
      if (!product.stock) return 'Out of Stock'
      return product.stock <= (product.threshold || 5) ? 'Low Stock' : 'In Stock'
    }

    const getStockStatusClass = (product) => {
      const status = getStockStatus(product)
      if (status === 'Out of Stock') return 'status-error'
      if (status === 'Low Stock') return 'status-warning'
      return 'status-active'
    }

    // Reset page when filters change
    watch([searchQuery, categoryFilter, vendorFilter], () => {
      currentPage.value = 1
    })

    // Fixed TypeError in resetUnitConfig by ensuring 'formData.unitConfig' is defined
    const resetUnitConfig = () => {
      if (!formData.unitConfig) {
        formData.unitConfig = {
          structure: '',
          item: { type: 'item', conversionRate: 1 },
          package: { type: 'package', conversionRate: 0 },
          case: { type: 'case', conversionRate: 0 }
        };
      }

      if (formData.unitConfig.structure === 'item-package-case') {
        formData.unitConfig.itemsPerCase = undefined;
      } else if (formData.unitConfig.structure === 'item-case') {
        formData.unitConfig.itemsPerPackage = undefined;
        formData.unitConfig.packagesPerCase = undefined;
      }
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

    const getThresholdInItems = () => {
      if (!formData.threshold || !formData.thresholdUnit) return 0;
      
      switch (formData.thresholdUnit) {
        case 'item':
          return formData.threshold;
        case 'pack':
          if (formData.unitConfig.structure === 'item-package-case') {
            return formData.threshold * (formData.unitConfig.package.conversionRate || 0);
          }
          return 0;
        case 'case':
          if (formData.unitConfig.structure === 'item-package-case') {
            return formData.threshold * (formData.unitConfig.totalItemsPerCase || 0);
          } else if (formData.unitConfig.structure === 'item-case') {
            return formData.threshold * (formData.unitConfig.case.conversionRate || 0);
          }
          return 0;
        default:
          return 0;
      }
    };

    return {
      toast,
      searchQuery,
      categoryFilter,
      vendorFilter,
      showModal,
      editingProduct,
      openDropdown,
      formData,
      filteredProducts,
      allFilteredProducts, // For total count in pagination
      currentPage,         // For pagination
      itemsPerPage,        // For pagination
      categories: store.categories,
      subCategories: store.subCategories,
      vendors: store.vendors,
      showAddProductForm,
      editProduct,
      hideModal,
      deleteProduct,
      getCategoryName,
      getVendorName,
      getStockStatus,
      getStockStatusClass,
      totalItemsPerCase,
      resetUnitConfig,
      formatUnitConfig,
      calculateTotalItems,
      toggleDropdown,
      closeDropdown,
      getThresholdInItems,
      subCategoryOptions,
      // Add missing properties for template
      handleProductModalSubmit,
      showDeleteModal,
      itemToDelete,
      cancelDelete,
    }
  }
}
</script>

<style scoped>
.content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.content-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.filters-container {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.table-container {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: visible;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
  color: #1e293b;
  font-weight: 600;
}

.data-table td {
  color: #374151;
}

.item-name {
  font-weight: 500;
  color: #1e293b;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
}

.status-active {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

.status-warning {
  background: rgba(234, 179, 8, 0.1);
  color: #ca8a04;
}

.status-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  color: #1e293b;
}

.empty-state p {
  margin: 0 0 16px 0;
}

/* Using common button styles from common.css */

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
}

.form-group {
  margin-bottom: 16px;
}

/* Two-column layout for the form */
form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Full-width elements */
.form-section, 
.actions,
.error-message {
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

.item-details {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
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
</style>
