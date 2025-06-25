<template>
  <div class="products">
    <div class="page-header">
      <h1>📦 Products Management</h1>
      <button @click="showAddForm = true" class="btn-primary">
        ➕ Add New Product
      </button>
    </div>

    <!-- Add Product Form Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click="showAddForm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Add New Product</h2>
          <button @click="showAddForm = false" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="addProduct" class="product-form">
          <div class="form-group">
            <label>Product Name*</label>
            <input v-model="newProduct.name" type="text" required>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Category*</label>
              <select v-model="newProduct.categoryId" required>
                <option value="">Select Category</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Vendor*</label>
              <select v-model="newProduct.vendorId" required>
                <option value="">Select Vendor</option>
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                  {{ vendor.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Low Inventory Threshold*</label>
              <input v-model.number="newProduct.lowInventoryThreshold" type="number" min="0" required>
            </div>
            
            <div class="form-group">
              <label>Unit Type</label>
              <select v-model="newProduct.units.type">
                <option value="item">Item</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="case">Case</option>
              </select>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showAddForm = false" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="loading.products">
              {{ loading.products ? 'Adding...' : 'Add Product' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Products Grid -->
    <div class="products-grid">
      <div v-for="product in products" :key="product.id" class="product-card">
        <div class="product-header">
          <h3>{{ product.name }}</h3>
          <div class="product-meta">
            <span class="category-tag">{{ getCategoryName(product.categoryId) }}</span>
            <span class="vendor-tag">{{ getVendorName(product.vendorId) }}</span>
          </div>
        </div>
        
        <div class="product-content">
          <div class="product-info">
            <div class="info-item">
              <strong>Unit Type:</strong> {{ product.units?.type || 'item' }}
            </div>
            <div class="info-item">
              <strong>Low Stock Threshold:</strong> {{ product.lowInventoryThreshold }}
            </div>
            <div class="info-item">
              <strong>Current Stock:</strong> {{ getProductStock(product.id) }}
            </div>
          </div>
        </div>
        
        <div class="product-actions">
          <button @click="editProduct(product)" class="btn-edit">✏️ Edit</button>
          <button @click="deleteProduct(product.id)" class="btn-delete">🗑️ Delete</button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading.products" class="loading">
      Loading products...
    </div>

    <!-- Error state -->
    <div v-if="errors.fetchProducts" class="error">
      Error loading products: {{ errors.fetchProducts }}
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'

export default {
  name: 'ProductsView',
  setup() {
    const store = useInventoryStore()
    const showAddForm = ref(false)
    
    const newProduct = reactive({
      name: '',
      categoryId: '',
      vendorId: '',
      lowInventoryThreshold: 10,
      units: {
        type: 'item',
        conversionRate: 1
      }
    })

    onMounted(async () => {
      // Fetch all data from Firebase if not already loaded
      try {
        await Promise.all([
          store.categories.length === 0 ? store.fetchCategories() : Promise.resolve(),
          store.vendors.length === 0 ? store.fetchVendors() : Promise.resolve(),
          store.products.length === 0 ? store.fetchProducts() : Promise.resolve(),
          store.inventory.length === 0 ? store.fetchInventory() : Promise.resolve()
        ])
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    })

    const products = computed(() => store.products)
    const categories = computed(() => store.categories)
    const vendors = computed(() => store.vendors)
    const loading = computed(() => store.loading)
    const errors = computed(() => store.errors)

    const getCategoryName = (categoryId) => {
      const category = store.getCategoryById(categoryId)
      return category ? category.name : 'Unknown'
    }

    const getVendorName = (vendorId) => {
      const vendor = store.getVendorById(vendorId)
      return vendor ? vendor.name : 'Unknown'
    }

    const getProductStock = (productId) => {
      const inventory = store.getInventoryByProduct(productId)
      return inventory ? inventory.quantity : 0
    }

    const addProduct = async () => {
      if (!newProduct.name.trim() || !newProduct.categoryId || !newProduct.vendorId) {
        alert('Please fill in all required fields')
        return
      }
      
      try {
        await store.addProduct({ ...newProduct })
        
        // Reset form
        newProduct.name = ''
        newProduct.categoryId = ''
        newProduct.vendorId = ''
        newProduct.lowInventoryThreshold = 10
        newProduct.units.type = 'item'
        
        showAddForm.value = false
      } catch (error) {
        console.error('Failed to add product:', error)
        alert('Failed to add product. Please try again.')
      }
    }

    const editProduct = (product) => {
      console.log('Edit product:', product)
      // TODO: Implement edit functionality
    }

    const deleteProduct = async (productId) => {
      if (confirm('Are you sure you want to delete this product?')) {
        try {
          await store.deleteProduct(productId)
        } catch (error) {
          console.error('Failed to delete product:', error)
          alert('Failed to delete product. Please try again.')
        }
      }
    }

    return {
      showAddForm,
      newProduct,
      products,
      categories,
      vendors,
      loading,
      errors,
      getCategoryName,
      getVendorName,
      getProductStock,
      addProduct,
      editProduct,
      deleteProduct
    }
  }
}
</script>

<style scoped>
.products {
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

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
}

.product-card:hover {
  transform: translateY(-2px);
}

.product-header {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.product-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
}

.product-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-tag, .vendor-tag {
  background: rgba(255,255,255,0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.product-content {
  padding: 20px;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  font-size: 0.9rem;
}

.product-actions {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 8px;
}

.btn-edit, .btn-delete {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-edit {
  background: #3b82f6;
  color: white;
}

.btn-edit:hover {
  background: #2563eb;
}

.btn-delete {
  background: #ef4444;
  color: white;
}

.btn-delete:hover {
  background: #dc2626;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #6b7280;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #4b5563;
}

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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  color: #6b7280;
}

.close-btn:hover {
  color: #374151;
}

.product-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.error {
  color: #ef4444;
}
</style>
