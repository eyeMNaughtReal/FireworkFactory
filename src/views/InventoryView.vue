<template>
  <div class="inventory">
    <div class="page-header">
      <h1>📊 Inventory Management</h1>
      <div class="header-actions">
        <button @click="showStockUpdateForm = true" class="btn-primary">
          📦 Update Stock
        </button>
        <button @click="exportInventory" class="btn-secondary">
          📄 Export
        </button>
      </div>
    </div>

    <!-- Stock Update Modal -->
    <div v-if="showStockUpdateForm" class="modal-overlay" @click="showStockUpdateForm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Update Stock</h2>
          <button @click="showStockUpdateForm = false" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="updateStock" class="stock-form">
          <div class="form-group">
            <label>Product*</label>
            <select v-model="stockUpdate.productId" required>
              <option value="">Select Product</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.name }} ({{ product.sku }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Quantity*</label>
            <input type="number" v-model="stockUpdate.quantity" required />
          </div>
          <div class="form-group">
            <label>Location</label>
            <input type="text" v-model="stockUpdate.location" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">Update Stock</button>
            <button @click="showStockUpdateForm = false" class="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="inventory-list">
      <div class="inventory-item" v-for="item in filteredInventory" :key="item.id">
        <div class="item-details">
          <h3>{{ item.product.name }}</h3>
          <p>SKU: {{ item.product.sku }}</p>
          <p>Location: {{ item.location }}</p>
        </div>
        <div class="item-stock">
          <span class="stock-level" :class="getStockLevelClass(item.quantity)">
            {{ item.quantity }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InventoryView',
  data() {
    return {
      showStockUpdateForm: false,
      stockUpdate: {
        productId: '',
        quantity: null,
        location: ''
      },
      products: [], // This should be populated with the actual product data
      inventory: [] // This should be populated with the actual inventory data
    };
  },
  computed: {
    filteredInventory() {
      // Implement any filtering logic here
      return this.inventory;
    }
  },
  methods: {
    getStockLevelClass(quantity) {
      if (quantity > 10) return 'stock-high';
      if (quantity > 0) return 'stock-low';
      return 'stock-out';
    },
    updateStock() {
      // Implement the stock update logic here
      this.showStockUpdateForm = false;
    },
    exportInventory() {
      // Implement the export logic here
    }
  }
};
</script>

<style scoped>
.inventory {
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.stock-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.inventory-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.inventory-item {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-details {
  flex-grow: 1;
}

.item-stock {
  min-width: 80px;
  text-align: right;
}

.stock-level {
  padding: 0.5rem;
  border-radius: 4px;
  color: white;
}

.stock-high {
  background-color: #28a745;
}

.stock-low {
  background-color: #ffc107;
}

.stock-out {
  background-color: #dc3545;
}
</style>
