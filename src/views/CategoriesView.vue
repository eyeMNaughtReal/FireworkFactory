<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Categories Management</h1>
      <div class="header-actions">
        <button @click="showAddForm = true" class="btn-primary">
           Add Category
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading.categories" class="loading-overlay">
      <div class="loading-spinner">
        Loading categories...
      </div>
    </div>

    <!-- Error State -->
    <div v-if="errors.fetchCategories" class="error-message">
      <p>Error loading categories: {{ errors.fetchCategories }}</p>
      <button @click="fetchCategories" class="btn-secondary">
        Try Again
      </button>
    </div>

    <div class="filters-container">
      <select v-model="selectedCategoryId" class="filter-select">
        <option value="">All Categories</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name || category.title || '(No Name)' }}
        </option>
      </select>
    </div>

    <!-- Categories Table -->
    <div v-if="!loading.categories && !errors.fetchCategories" class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Category Name</th>
            <th>Products</th>
            <th>Orders</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in filteredPaginatedCategories" :key="category.id">
            <td>{{ category.name || category.title || '(No Name)' }}</td>
            <td>
              <button 
                class="badge badge-success badge-clickable" 
                @click="navigateToProducts(category.id)"
                :disabled="!getProductCount(category.id)"
              >
                {{ getProductCount(category.id) }} Products
              </button>
            </td>
            <td>
              <button 
                class="badge badge-info badge-clickable" 
                @click="navigateToOrders(category.id)"
                :disabled="!getOrdersCount(category.id)"
              >
                {{ getOrdersCount(category.id) }} Orders
              </button>
            </td>
            <td>
              <div class="dropdown" :class="{ 'dropdown-open': openDropdown === category.id }">
                <button class="dropdown-toggle" @click="toggleDropdown(category.id)">
                  Actions ▾
                </button>
                <div class="dropdown-menu">
                  <button @click="editCategory(category); closeDropdown()" class="dropdown-item">
                    Edit
                  </button>
                  <button @click="deleteCategory(category.id); closeDropdown()" class="dropdown-item delete-action">
                    Delete
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="categories.length === 0" class="empty-state">
        <h3>No categories yet</h3>
        <p>Click the "Add Category" button to create your first category.</p>
      </div>
      <PagePagination
        v-if="categories.length > 0"
        :current-page="currentPage"
        :total-items="categories.length"
        :per-page="itemsPerPage"
        @update:page="currentPage = $event"
      />
    </div>

    <!-- Add Category Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Add New Category</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <form @submit.prevent="addCategory" class="form">
            <div class="form-group">
              <label>Category Name*</label>
              <input 
                v-model="newCategory.name" 
                type="text" 
                required 
                placeholder="Enter category name" 
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>Sub-Categories</label>
              <div v-for="(sub, idx) in newCategory.subCategories" :key="idx" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input v-model="newCategory.subCategories[idx]" type="text" class="form-input" placeholder="Sub-Category name" />
                <button type="button" class="btn-secondary" @click="newCategory.subCategories.splice(idx, 1)">Remove</button>
              </div>
              <button type="button" class="btn-primary" @click="newCategory.subCategories.push('')">Add Sub-Category</button>
            </div>
            
            <div class="form-actions">
              <button type="button" @click="closeModal" class="btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn-primary" :disabled="loading.categories">
                {{ loading.categories ? 'Adding...' : 'Add Category' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Category Modal -->
    <div v-if="showEditForm" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Edit Category</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <form @submit.prevent="updateCategory" class="form">
            <div class="form-group">
              <label>Category Name*</label>
              <input 
                v-model="editCategoryData.name" 
                type="text" 
                required 
                placeholder="Enter category name" 
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>Sub-Categories</label>
              <div v-for="(sub, idx) in editCategoryData.subCategories" :key="idx" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input v-model="editCategoryData.subCategories[idx]" type="text" class="form-input" placeholder="Sub-Category name" />
                <button type="button" class="btn-secondary" @click="editCategoryData.subCategories.splice(idx, 1)">Remove</button>
              </div>
              <button type="button" class="btn-primary" @click="editCategoryData.subCategories.push('')">Add Sub-Category</button>
            </div>
            <div class="form-actions">
              <button type="button" @click="closeModal" class="btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn-primary">
                Update Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted, onUnmounted, watch, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useRouter } from 'vue-router'
import PagePagination from '@/components/PagePagination.vue'
import { useToast } from '@/components/Toast.vue'

export default {
  name: 'CategoriesView',
  components: {
    PagePagination
  },
  props: {
    id: String
  },
  setup(props) {
    const store = useInventoryStore();
    const router = useRouter();
    const toast = useToast();
    const confirmation = inject('confirmation');
    const showAddForm = ref(false);
    const showEditForm = ref(false);
    const editCategoryData = reactive({ id: props.id || '', name: '' });
    // Add subCategories to editCategoryData
    editCategoryData.subCategories = [];
    const currentPage = ref(1);
    const itemsPerPage = ref(10);

    const newCategory = reactive({
      name: '',
      subCategories: []
    });

    onMounted(async () => {
      // Fetch categories from Firebase if not already loaded
      if (store.categories.length === 0) {
        try {
          await store.fetchCategories();
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        }
      }
    });

    const selectedCategoryId = ref('');

    const paginatedCategories = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      return store.categories.slice(startIndex, endIndex);
    });
    const loading = computed(() => store.loading)
    const errors = computed(() => store.errors)

    const fetchCategories = async () => {
      try {
        await store.fetchCategories()
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    const getProductCount = (categoryId) => {
      return store.products.filter(p => p.categoryId === categoryId).length
    }

    const getOrdersCount = (categoryId) => {
      // Count orders that have products from this category
      const categoryProducts = store.products.filter(p => p.categoryId === categoryId);
      const categoryProductIds = new Set(categoryProducts.map(p => p.id));
      
      return store.orders.filter(order => 
        order.items?.some(item => categoryProductIds.has(item.productId))
      ).length;
    }

    const addCategory = async () => {
      if (!newCategory.name.trim()) return
      // Remove empty sub-categories
      newCategory.subCategories = newCategory.subCategories.filter(s => s.trim())
      try {
        await store.addCategory({ ...newCategory })
        toast.success('Category created successfully')
        
        // Reset form
        newCategory.name = ''
        newCategory.subCategories = []
        showAddForm.value = false
      } catch (error) {
        console.error('Failed to add category:', error)
        toast.error('Failed to add category. Please try again.')
      }
    }

    const editCategory = (category) => {
      editCategoryData.id = category.id
      editCategoryData.name = category.name
      editCategoryData.subCategories = Array.isArray(category.subCategories) ? [...category.subCategories] : []
      showEditForm.value = true
    }

    const updateCategory = async () => {
      if (!editCategoryData.name.trim()) return
      // Remove empty sub-categories
      editCategoryData.subCategories = editCategoryData.subCategories.filter(s => s.trim())
      try {
        await store.updateCategory(editCategoryData.id, {
          name: editCategoryData.name,
          subCategories: editCategoryData.subCategories
        })
        toast.success('Category updated successfully')
        showEditForm.value = false
        editCategoryData.id = ''
        editCategoryData.name = ''
        editCategoryData.subCategories = []
      } catch (error) {
        console.error('Failed to update category:', error)
        toast.error('Failed to update category. Please try again.')
      }
    }

    const deleteCategory = async (categoryId) => {
      try {
        await confirmation.confirm({
          title: 'Delete Category',
          message: 'Are you sure you want to delete this category?',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          messageType: 'danger',
          confirmButtonType: 'danger'
        });
        // If confirmed, proceed with deletion
        await store.deleteCategory(categoryId)
        toast.success('Category deleted successfully')
      } catch (error) {
        // User canceled or error occurred
        if (error instanceof Error) {
          console.error('Failed to delete category:', error)
          toast.error('Failed to delete category. Please try again.')
        }
        // else: user canceled, do nothing
      }
    }

    const closeModal = () => {
      showAddForm.value = false
      showEditForm.value = false
    }

    const navigateToProducts = (categoryId) => {
      router.push({
        name: 'products',
        query: { categoryId }
      })
    }

    const navigateToOrders = (categoryId) => {
      // Get all product IDs for this category
      const categoryProductIds = store.products
        .filter(p => p.categoryId === categoryId)
        .map(p => p.id)
      
      router.push({
        name: 'orders',
        query: {
          categoryId,
          productIds: categoryProductIds.join(',')
        }
      })
    }

    const openDropdown = ref(null)

    // Dropdown methods
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

    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown') && openDropdown.value) {
        closeDropdown()
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    // Reset page when filters change
    watch(selectedCategoryId, () => {
      currentPage.value = 1;
    });

    const filteredPaginatedCategories = computed(() => {
      let filtered = store.categories;
      if (selectedCategoryId.value) {
        filtered = filtered.filter(c => c.id === selectedCategoryId.value);
      }
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      return filtered.slice(startIndex, endIndex);
    });

    const categories = computed(() => store.categories);

    return {
      // Toast
      toast,
      
      // UI state
      showAddForm,
      showEditForm,
      
      // Form data
      newCategory,
      editCategoryData,
      
      // Data and pagination
      paginatedCategories,
      filteredPaginatedCategories,
      currentPage,
      itemsPerPage,
      selectedCategoryId,
      categories,
      
      // App state
      loading,
      errors,
      
      // Methods
      fetchCategories,
      getProductCount,
      getOrdersCount,
      addCategory,
      editCategory,
      updateCategory,
      deleteCategory,
      closeModal,
      navigateToProducts,
      navigateToOrders,
      openDropdown,
      toggleDropdown,
      closeDropdown,
    }
  }
}
</script>

<style scoped>
/* Form specific styles */

.table-container {
  position: relative;
  overflow: visible;
}

/* Form Styles */
.form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 20px;
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

.form-group input[type="color"] {
  height: 50px;
  padding: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Loading and Error States */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  font-size: 18px;
  color: #1e293b;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  background: #f9fafb;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #1e293b;
}

.empty-state p {
  margin: 0;
  color: #475569;
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

/* Enhanced badge button styles for Products/Orders */
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

/* Match filter-select style for dropdown */
.filter-select {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
  max-width: 250px;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>