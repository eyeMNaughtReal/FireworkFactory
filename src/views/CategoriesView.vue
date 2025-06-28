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
      <input 
        type="text" 
        class="search-input"
        v-model="searchQuery"
        placeholder="Search categories..."
      />
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
          <tr v-for="category in paginatedCategories" :key="category.id">
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
      <div v-if="filteredCategories.length === 0" class="empty-state">
        <h3>No categories yet</h3>
        <p>Click the "Add Category" button to create your first category.</p>
      </div>

      <!-- Pagination -->
      <PagePagination
        v-if="filteredCategories.length > 0"
        :current-page="currentPage"
        :total-items="filteredCategories.length"
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
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
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
    const showAddForm = ref(false);
    const showEditForm = ref(false);
    const editCategoryData = reactive({ id: props.id || '', name: '' });
    const currentPage = ref(1);
    const itemsPerPage = ref(10);

    const newCategory = reactive({
      name: ''
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

    const searchQuery = ref('');

    const filteredCategories = computed(() => {
      let result = store.categories;

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(c => c.name.toLowerCase().includes(query));
      }

      return result;
    });
    
    const paginatedCategories = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      return filteredCategories.value.slice(startIndex, endIndex);
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
      
      try {
        await store.addCategory({ ...newCategory })
        toast.success('Category created successfully')
        
        // Reset form
        newCategory.name = ''
        showAddForm.value = false
      } catch (error) {
        console.error('Failed to add category:', error)
        toast.error('Failed to add category. Please try again.')
      }
    }

    const editCategory = (category) => {
      editCategoryData.id = category.id
      editCategoryData.name = category.name
      showEditForm.value = true
    }

    const updateCategory = async () => {
      if (!editCategoryData.name.trim()) return
      try {
        await store.updateCategory(editCategoryData.id, { name: editCategoryData.name })
        toast.success('Category updated successfully')
        showEditForm.value = false
        editCategoryData.id = ''
        editCategoryData.name = ''
      } catch (error) {
        console.error('Failed to update category:', error)
        toast.error('Failed to update category. Please try again.')
      }
    }

    const deleteCategory = async (categoryId) => {
      if (confirm('Are you sure you want to delete this category?')) {
        try {
          await store.deleteCategory(categoryId)
          toast.success('Category deleted successfully')
        } catch (error) {
          console.error('Failed to delete category:', error)
          toast.error('Failed to delete category. Please try again.')
        }
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
      router.push({
        name: 'orders',
        query: { categoryId }
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
    watch(searchQuery, () => {
      currentPage.value = 1;
    });

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
      filteredCategories,
      paginatedCategories,
      currentPage,
      itemsPerPage,
      searchQuery,
      
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
</style>
