<template>
  <div class="categories">
    <div class="page-header">
      <h1>🏷️ Categories Management</h1>
      <button @click="showAddForm = true" class="btn-primary">
        ➕ Add Category
      </button>
    </div>

    <!-- Add Category Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click="showAddForm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Add New Category</h2>
          <button @click="showAddForm = false" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="addCategory" class="category-form">
          <div class="form-group">
            <label>Category Name*</label>
            <input v-model="newCategory.name" type="text" required>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showAddForm = false" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="loading.categories">
              {{ loading.categories ? 'Adding...' : 'Add Category' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Category Modal -->
    <div v-if="showEditForm" class="modal-overlay" @click="showEditForm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Edit Category</h2>
          <button @click="showEditForm = false" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="updateCategory" class="category-form">
          <div class="form-group">
            <label>Category Name*</label>
            <input v-model="editCategoryData.name" type="text" required>
          </div>
          <div class="form-actions">
            <button type="button" @click="showEditForm = false" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Update Category
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="categories-grid">
      <div v-for="category in categories" :key="category.id" class="category-card">
        <div class="category-header">
          <h3>{{ category.name || category.title || '(No Name)' }}</h3>
        </div>
        <div class="category-content">
          <div class="category-stats">
            <span>{{ getProductCount(category.id) }} products</span>
          </div>
          <div class="category-actions">
            <button @click="editCategory(category)" class="btn-edit">✏️ Edit</button>
            <button @click="deleteCategory(category.id)" class="btn-delete">🗑️ Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading.categories" class="loading">
      Loading categories...
    </div>

    <!-- Error state -->
    <div v-if="errors.fetchCategories" class="error">
      Error loading categories: {{ errors.fetchCategories }}
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'

export default {
  name: 'CategoriesView',
  setup() {
    const store = useInventoryStore()
    const showAddForm = ref(false)
    const showEditForm = ref(false)
    const editCategoryData = reactive({ id: '', name: '' })
    
    const newCategory = reactive({
      name: ''
    })

    onMounted(async () => {
      // Fetch categories from Firebase if not already loaded
      if (store.categories.length === 0) {
        try {
          await store.fetchCategories()
        } catch (error) {
          console.error('Failed to fetch categories:', error)
        }
      }
    })

    const categories = computed(() => store.categories)
    const loading = computed(() => store.loading)
    const errors = computed(() => store.errors)

    const getProductCount = (categoryId) => {
      return store.products.filter(p => p.categoryId === categoryId).length
    }

    const addCategory = async () => {
      if (!newCategory.name.trim()) return
      
      try {
        await store.addCategory({ ...newCategory })
        
        // Reset form
        newCategory.name = ''
        showAddForm.value = false
      } catch (error) {
        console.error('Failed to add category:', error)
        alert('Failed to add category. Please try again.')
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
        showEditForm.value = false
        editCategoryData.id = ''
        editCategoryData.name = ''
      } catch (error) {
        console.error('Failed to update category:', error)
        alert('Failed to update category. Please try again.')
      }
    }

    const deleteCategory = async (categoryId) => {
      if (confirm('Are you sure you want to delete this category?')) {
        try {
          await store.deleteCategory(categoryId)
        } catch (error) {
          console.error('Failed to delete category:', error)
          alert('Failed to delete category. Please try again.')
        }
      }
    }

    return {
      showAddForm,
      showEditForm,
      newCategory,
      editCategoryData,
      categories,
      loading,
      errors,
      getProductCount,
      addCategory,
      editCategory,
      updateCategory,
      deleteCategory
    }
  }
}
</script>

<style scoped>
.categories {
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

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.category-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
}

.category-card:hover {
  transform: translateY(-2px);
}

.category-header {
  padding: 20px;
  color: #1e293b; /* Changed from white to dark for visibility */
}

.category-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.category-content {
  padding: 20px;
}

.category-content p {
  color: #64748b;
  margin-bottom: 16px;
}

.category-stats {
  margin-bottom: 16px;
  font-weight: 600;
  color: #1e293b;
}

.category-actions {
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
}

.btn-delete {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
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
  max-width: 500px;
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

.category-form {
  padding: 30px;
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
</style>
