<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Inventory Management</h1>
      <div class="header-actions">
        <button @click="refreshInventory" class="btn-secondary">
          Refresh
        </button>
        <button @click="showStockUpdateForm = true" class="btn-primary">
          Update Stock
        </button>
        <button @click="exportInventory" class="btn-secondary">
          Export
        </button>
      </div>
    </div>

    <div class="filters-container">
      <input
        type="text"
        class="search-input"
        v-model="searchQuery"
        placeholder="Search inventory..."
      />
      <select v-model="locationFilter" class="filter-select">
        <option value="">All Locations</option>
        <option v-for="location in uniqueLocations" :key="location" :value="location">
          {{ location }}
        </option>
      </select>
    </div>

    <!-- Inventory Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Current Stock</th>
            <th>Unit Configuration</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedInventory" :key="item.productId">
            <td>
              <div class="item-name">{{ getProductName(item.productId) }}</div>
              <div class="item-details">{{ item.location || 'No location' }}</div>
            </td>
            <td>{{ typeof item.quantity === 'number' ? item.quantity : 0 }}</td>
            <td>{{ formatUnitConfig(getProduct(item.productId)?.unitConfig) }}</td>
            <td>
              <span 
                class="badge" 
                :class="{
                  'badge-success': getQuantity(item) > getThreshold(item.productId),
                  'badge-warning': isLowStock(item),
                  'badge-danger': getQuantity(item) === 0
                }"
              >
                {{ getStockStatus(item) }}
              </span>
            </td>
            <td>
              <div class="dropdown" :class="{ 'dropdown-open': openDropdown === item.id }">
                <button class="dropdown-toggle" @click="toggleDropdown(item.id)">
                  Actions ▾
                </button>
                <div class="dropdown-menu">
                  <button @click="editStock(item); closeDropdown()" class="dropdown-item">
                    Update Stock
                  </button>
                  <button @click="viewProductDetails(item); closeDropdown()" class="dropdown-item">
                    View Details
                  </button>
                  <button @click="viewHistory(); closeDropdown()" class="dropdown-item">
                    View History
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Loading State -->
      <div v-if="!filteredInventory.length && isLoading" class="empty-state">
        <h3>Loading inventory...</h3>
        <p>Please wait while we fetch the data.</p>
      </div>

      <!-- Empty State -->
      <div v-if="!filteredInventory.length && !isLoading" class="empty-state">
        <h3>No inventory items found</h3>
        <p>Try adjusting your search filters or add new inventory items.</p>
      </div>
      
      <!-- Pagination -->
      <PagePagination
        v-if="filteredInventory.length > 0"
        :current-page="currentPage"
        :total-items="filteredInventory.length"
        :per-page="itemsPerPage"
        @update:page="currentPage = $event"
      />
    </div>

    <!-- Stock Update Modal -->
    <div v-if="showStockUpdateForm" class="modal-overlay" @click="showStockUpdateForm = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Update Stock</h2>
          <button @click="showStockUpdateForm = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <form @submit.prevent="updateStock" class="form">
            <div class="form-group">
              <label>Product</label>
              <select v-model="stockUpdate.productId" class="form-input" disabled>
                <option v-for="product in products" :key="product.id" :value="product.id">
                  {{ product.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Quantity*</label>
              <input v-model.number="stockUpdate.quantity" type="number" min="0" required class="form-input">
            </div>
            <div class="form-actions">
              <button type="button" @click="showStockUpdateForm = false" class="btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn-primary">
                Update Stock
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useInventoryStore } from '@/stores/inventory';
import PagePagination from '@/components/PagePagination.vue';
import { useToast } from '@/components/Toast.vue';

export default {
  name: 'InventoryView',
  components: {
    PagePagination
  },
  setup() {
    const toast = useToast();
    return { toast };
  },
  data() {
    return {
      currentPage: 1,
      itemsPerPage: 10,
      showStockUpdateForm: false,
      stockUpdate: {
        productId: '',
        quantity: null,
      },
      store: useInventoryStore(),
      searchQuery: '',
      locationFilter: '',
      openDropdown: null,
    };
  },
  computed: {
    inventory() {
      return this.store.inventory || [];
    },
    products() {
      return this.store.products || [];
    },
    isLoading() {
      return this.store.loading.inventory || this.store.loading.products;
    },
    filteredInventory() {
      let result = this.inventory;
      
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(item => {
          const productName = this.getProductName(item.productId).toLowerCase();
          return productName.includes(query) || 
                 (item.location && item.location.toLowerCase().includes(query));
        });
      }
      
      if (this.locationFilter) {
        result = result.filter(item => item.location === this.locationFilter);
      }
      
      return result;
    },
    uniqueLocations() {
      return [...new Set(this.inventory.map(item => item.location).filter(Boolean))];
    },
    paginatedInventory() {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      return this.filteredInventory.slice(startIndex, endIndex);
    },
  },
  methods: {
    getStockLevelClass(quantity) {
      if (quantity > 10) {
        return 'stock-high';
      }
      if (quantity > 0) {
        return 'stock-medium';
      }
      return 'stock-low';
    },
    async refreshInventory() {
      try {
        await this.store.fetchInventory(true);
        await this.store.fetchProducts();
        this.toast.success('Inventory refreshed successfully');
      } catch (error) {
        console.error('Failed to refresh inventory:', error);
        this.toast.error('Failed to refresh inventory. Please try again.');
      }
    },
    exportInventory() {
      try {
        // Create CSV data
        const headers = ['Product', 'Location', 'Current Stock', 'Status'];
        let csvContent = headers.join(',') + '\n';
        
        this.filteredInventory.forEach(item => {
          const row = [
            `"${this.getProductName(item.productId)}"`,
            `"${item.location || 'No location'}"`,
            item.quantity,
            `"${this.getStockStatus(item)}"`
          ];
          csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.toast.success('Inventory exported successfully');
      } catch (error) {
        console.error('Failed to export inventory:', error);
        this.toast.error('Failed to export inventory. Please try again.');
      }
    },
    toggleDropdown(itemId) {
      this.openDropdown = this.openDropdown === itemId ? null : itemId;
    },
    closeDropdown() {
      this.openDropdown = null;
    },
    editStock(item) {
      this.stockUpdate = { productId: item.productId, quantity: item.quantity };
      this.showStockUpdateForm = true;
    },
    async updateStock() {
      if (!this.stockUpdate.productId || this.stockUpdate.quantity === null) {
        this.toast.error('Please enter a valid quantity');
        return;
      }
      
      try {
        await this.store.updateInventory(this.stockUpdate.productId, this.stockUpdate.quantity);
        this.showStockUpdateForm = false;
        this.toast.success('Stock updated successfully');
        
        // Reset the form
        this.stockUpdate = {
          productId: '',
          quantity: null,
        };
      } catch (error) {
        console.error('Error updating stock:', error);
        this.toast.error('Failed to update stock. Please try again.');
      }
    },
    viewProductDetails(item) {
      const product = this.getProduct(item.productId);
      if (!product) {
        this.toast.error('Product details not available');
        return;
      }
      
      // Display product details for debugging
      console.log('Product details:', product);
      
      const details = [
        `Name: ${product.name}`,
        `ID: ${product.id}`,
        `Category: ${product.categoryId || 'None'}`,
        `Vendor: ${product.vendorId || 'None'}`,
        `Low Stock Threshold: ${product.lowInventoryThreshold || 0}`,
        `Unit Config: ${JSON.stringify(product.unitConfig || {})}`
      ].join('\n');
      
      alert(`Product Details:\n\n${details}`);
    },
    
    viewHistory() {
      // In a real implementation, this would show a history modal
      alert('Inventory history feature coming soon!');
    },
    getProduct(productId) {
      return this.products.find(p => p.id === productId);
    },
    getProductName(productId) {
      const product = this.getProduct(productId);
      return product ? product.name : 'Unknown Product';
    },
    formatInventoryLevel(item) {
      return typeof item.quantity === 'number' ? item.quantity : 0;
    },
    formatUnitConfig(unitConfig) {
      if (!unitConfig) return 'N/A';
      
      // Handle complex unitConfig structure (from ProductsView)
      if (unitConfig.structure) {
        const structure = unitConfig.structure;
        const caseConversion = unitConfig.case?.conversionRate || 0;
        const packageConversion = unitConfig.package?.conversionRate || 0;
        
        if (structure === 'item-package-case') {
          return `${packageConversion} items/package, ${caseConversion} packages/case`;
        } else if (structure === 'item-case') {
          return `${caseConversion} items/case`;
        }
        return `${unitConfig.totalItemsPerCase || 0} items/case`;
      }
      
      // Handle simpler unit formats
      if (unitConfig.type) {
        return `${unitConfig.conversionRate || 1} ${unitConfig.type}`;
      } else if (unitConfig.unit) {
        return `${unitConfig.amount || 1} ${unitConfig.unit}`;
      }
      
      return 'N/A';
    },
    getThreshold(productId) {
      const product = this.getProduct(productId);
      return product ? product.lowInventoryThreshold : 0;
    },
    getQuantity(item) {
      return typeof item.quantity === 'number' ? item.quantity : 0;
    },
    isLowStock(item) {
      const quantity = this.getQuantity(item);
      return quantity > 0 && quantity <= this.getThreshold(item.productId);
    },
    getStockStatus(item) {
      const quantity = this.getQuantity(item);
      if (quantity === 0) {
        return 'Out of Stock';
      }
      if (this.isLowStock(item)) {
        return 'Low Stock';
      }
      return 'In Stock';
    },
  },
  watch: {
    searchQuery() {
      this.currentPage = 1;
    },
    locationFilter() {
      this.currentPage = 1;
    },
    categoryFilter() {
      this.currentPage = 1;
    }
  },
  async created() {
    // Fetch data if not already loaded
    try {
      if (this.store.products.length === 0) {
        await this.store.fetchProducts();
      }
      
      if (this.store.inventory.length === 0) {
        await this.store.fetchInventory();
      }
      
      console.log('Loaded inventory data:', this.store.inventory);
      console.log('Loaded products data:', this.store.products);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }
};
</script>

<style scoped>
.inventory-item {
  gap: 0.5rem;
}

.item-details {
  font-size: 0.75rem;  /* 12px */
  color: #6B7280;      /* Tailwind gray-500, a nice muted gray */
  margin-top: 2px;     /* Small spacing from the main text */
}

/* Make sure dropdown actions work */
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

.dropdown-open .dropdown-menu {
  display: block;
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

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 15px 30px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
}

.modal-content {
  padding: 24px;
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

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
