<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Inventory Management</h1>
      <div class="header-actions">
        <button @click="refreshInventory" class="btn-secondary">
          Refresh
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
                  <button @click="viewHistory(item); closeDropdown()" class="dropdown-item">
                    View History
                  </button>
                  <button @click="viewProductDetails(item); closeDropdown()" class="dropdown-item">
                    View Details
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
        <div class="empty-icon">📦</div>
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
              <label>Location</label>
              <input v-model="stockUpdate.location" type="text" class="form-input" placeholder="Enter location">
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
    <!-- Product Details Modal -->
    <div v-if="showProductDetailsModal" class="modal-overlay" @click="showProductDetailsModal = false">
      <div class="modal modal-wide" @click.stop>
        <div class="modal-header">
          <h2>Product Details</h2>
          <button @click="showProductDetailsModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <div v-if="selectedProduct" class="product-details">
            <!-- Basic Information -->
            <div class="details-section">
              <h3>Basic Information</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Product Name:</label>
                  <span>{{ selectedProduct.name || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <label>Product ID:</label>
                  <span>{{ selectedProduct.id || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <label>Category:</label>
                  <span>{{ getCategoryName(selectedProduct.categoryId) || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <label>Vendor:</label>
                  <span>{{ getVendorName(selectedProduct.vendorId) || 'N/A' }}</span>
                </div>
              </div>
            </div>

            <!-- Inventory Information -->
            <div class="details-section">
              <h3>Inventory Information</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Current Stock:</label>
                  <span class="stock-quantity">{{ selectedInventoryItem?.quantity || 0 }}</span>
                </div>
                <div class="detail-item">
                  <label>Location:</label>
                  <span>{{ selectedInventoryItem?.location || 'No location specified' }}</span>
                </div>
                <div class="detail-item">
                  <label>Low Stock Threshold:</label>
                  <span>{{ selectedProduct.lowInventoryThreshold || 0 }}</span>
                </div>
                <div class="detail-item">
                  <label>Stock Status:</label>
                  <span 
                    class="badge"
                    :class="{
                      'badge-success': getQuantity(selectedInventoryItem) > getThreshold(selectedProduct.id),
                      'badge-warning': isLowStock(selectedInventoryItem),
                      'badge-danger': getQuantity(selectedInventoryItem) === 0
                    }"
                  >
                    {{ getStockStatus(selectedInventoryItem) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Unit Configuration -->
            <div class="details-section">
              <h3>Unit Configuration</h3>
              <div class="unit-config-display">
                <div v-if="selectedProduct.unitConfig">
                  <div v-if="selectedProduct.unitConfig.structure" class="config-item">
                    <label>Structure:</label>
                    <span class="config-value">{{ formatStructureType(selectedProduct.unitConfig.structure) }}</span>
                  </div>
                  
                  <div v-if="selectedProduct.unitConfig.structure === 'item-package-case'" class="config-breakdown">
                    <div class="config-item">
                      <label>Items per Package:</label>
                      <span class="config-value">{{ selectedProduct.unitConfig.package?.conversionRate || 'N/A' }}</span>
                    </div>
                    <div class="config-item">
                      <label>Packages per Case:</label>
                      <span class="config-value">{{ selectedProduct.unitConfig.case?.conversionRate || 'N/A' }}</span>
                    </div>
                    <div class="config-item">
                      <label>Total Items per Case:</label>
                      <span class="config-value">{{ selectedProduct.unitConfig.totalItemsPerCase || 'N/A' }}</span>
                    </div>
                  </div>
                  
                  <div v-else-if="selectedProduct.unitConfig.structure === 'item-case'" class="config-breakdown">
                    <div class="config-item">
                      <label>Items per Case:</label>
                      <span class="config-value">{{ selectedProduct.unitConfig.case?.conversionRate || 'N/A' }}</span>
                    </div>
                  </div>
                  
                  <div v-else-if="selectedProduct.unitConfig.type" class="config-breakdown">
                    <div class="config-item">
                      <label>Unit Type:</label>
                      <span class="config-value">{{ selectedProduct.unitConfig.type }}</span>
                    </div>
                    <div class="config-item">
                      <label>Conversion Rate:</label>
                      <span class="config-value">{{ selectedProduct.unitConfig.conversionRate || 1 }}</span>
                    </div>
                  </div>
                  
                  <div v-else-if="selectedProduct.unitConfig.unit" class="config-breakdown">
                    <div class="config-item">
                      <label>Unit:</label>
                      <span class="config-value">{{ selectedProduct.unitConfig.unit }}</span>
                    </div>
                    <div class="config-item">
                      <label>Amount:</label>
                      <span class="config-value">{{ selectedProduct.unitConfig.amount || 1 }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="no-config">
                  <span>No unit configuration available</span>
                </div>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="details-section">
              <h3>Additional Information</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Last Updated:</label>
                  <span>{{ formatDate(selectedInventoryItem?.lastUpdated) || 'N/A' }}</span>
                </div>
                <div class="detail-item" v-if="selectedProduct.description">
                  <label>Description:</label>
                  <span>{{ selectedProduct.description }}</span>
                </div>
                <div class="detail-item" v-if="selectedProduct.price">
                  <label>Price:</label>
                  <span>${{ selectedProduct.price.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="editStock(selectedInventoryItem)" class="btn-primary">
            Update Stock
          </button>
          <button @click="showProductDetailsModal = false" class="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Inventory History Modal -->
    <div v-if="showHistoryModal" class="modal-overlay" @click="showHistoryModal = false">
      <div class="modal modal-wide" @click.stop>
        <div class="modal-header">
          <div>
            <h2>Inventory History</h2>
            <div class="modal-subtitle" v-if="selectedProduct">
              {{ selectedProduct.name }} (ID: {{ selectedInventoryItem.id }})
              <div>Location: {{ selectedInventoryItem.location || 'No location' }}</div>
            </div>
          </div>
          <button @click="showHistoryModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <div v-if="historyLoading" class="loading-state">
            <p>Loading history...</p>
          </div>
          <div v-else-if="!inventoryHistory.length" class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>No Changes Recorded</h3>
            <p>This inventory item has no recorded changes yet.</p>
            <p class="text-muted">Changes will appear here when you update the quantity or location.</p>
            <button @click="createHistoryRecord" class="btn-primary mt-4">
              Create Baseline Record
            </button>
          </div>
          <div v-else>
            <!-- History Summary Stats -->
            <div class="history-summary">
              <div class="summary-card">
                <div class="summary-label">Total Records</div>
                <div class="summary-value">{{ inventoryHistory.length }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Current Stock</div>
                <div class="summary-value">{{ selectedInventoryItem?.quantity || 0 }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">First Activity</div>
                <div class="summary-value">{{ formatDateShort(inventoryHistory[inventoryHistory.length - 1]?.timestamp || inventoryHistory[inventoryHistory.length - 1]?.createdAt) }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Last Updated</div>
                <div class="summary-value">{{ formatDateShort(inventoryHistory[0]?.timestamp || inventoryHistory[0]?.createdAt) }}</div>
              </div>
            </div>
            
            <!-- History Timeline -->
            <div class="history-timeline">
              <div v-for="(entry, index) in inventoryHistory" :key="index" class="timeline-item">
                <div class="timeline-marker">
                  <div class="timeline-icon" :class="'timeline-' + entry.action">
                    <span v-if="entry.action === 'create'">+</span>
                    <span v-else-if="entry.action === 'update'">↑</span>
                    <span v-else-if="entry.action === 'delete'">×</span>
                    <span v-else>👁</span>
                  </div>
                </div>
                
                <div class="timeline-content">
                  <div class="timeline-header">
                    <div class="timeline-title">
                      <span v-if="entry.action === 'create'">Inventory Item Created</span>
                      <span v-else-if="entry.action === 'update'">Stock Updated</span>
                      <span v-else-if="entry.action === 'delete'">Item Removed</span>
                      <span v-else>Item Viewed</span>
                    </div>
                    <div class="timeline-date">{{ formatDateFull(entry.timestamp || entry.createdAt) }}</div>
                  </div>
                  
                  <div class="timeline-details">
                    <!-- Stock Changes -->
                    <div v-if="entry.action === 'create'" class="change-summary">
                      <div class="change-item">
                        <i class="change-icon">📦</i>
                        <span class="change-text">Initial quantity set to <strong>{{ entry.data?.quantity || 0 }}</strong></span>
                      </div>
                      <div v-if="entry.data?.location" class="change-item">
                        <i class="change-icon">📍</i>
                        <span class="change-text">Located at <strong>{{ entry.data.location }}</strong></span>
                      </div>
                    </div>
                    
                    <div v-else-if="entry.action === 'update'" class="change-summary">
                      <!-- Quantity Change -->
                      <div v-if="entry.data?.quantity !== undefined" class="change-item">
                        <i class="change-icon">📊</i>
                        <span class="change-text">
                          Quantity changed from 
                          <strong>{{ getPreviousQuantity(entry, index) }}</strong> 
                          to 
                          <strong>{{ entry.data.quantity }}</strong>
                          <span class="quantity-delta" :class="getQuantityDeltaClass(entry)">
                            ({{ getQuantityDelta(entry) }})
                          </span>
                        </span>
                      </div>
                      
                      <!-- Location Change -->
                      <div v-if="hasLocationChange(entry)" class="change-item">
                        <i class="change-icon">📍</i>
                        <span class="change-text">
                          Location changed from 
                          <strong>{{ entry.metadata?.previousData?.location || 'No location' }}</strong> 
                          to 
                          <strong>{{ entry.data?.location || 'No location' }}</strong>
                        </span>
                      </div>
                    </div>
                    
                    <div v-else-if="entry.action === 'view'" class="change-summary">
                      <div class="change-item">
                        <i class="change-icon">👁</i>
                        <span class="change-text">Item history was viewed</span>
                      </div>
                    </div>
                    
                    <!-- Additional Context -->
                    <div v-if="entry.metadata?.reason && entry.metadata.reason !== 'History viewed'" class="context-info">
                      <div class="context-item">
                        <strong>Reason:</strong> {{ entry.metadata.reason }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button v-if="inventoryHistory.length > 0" @click="createHistoryRecord" class="btn-secondary">
            Create Snapshot
          </button>
          <button @click="editStock(selectedInventoryItem)" class="btn-primary">
            Update Stock
          </button>
          <button @click="showHistoryModal = false" class="btn-secondary">
            Close
          </button>
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
      showProductDetailsModal: false,
      showHistoryModal: false,
      selectedProduct: null,
      selectedInventoryItem: null,
      inventoryHistory: [],
      historyLoading: false,
      debugExpandedItems: [],
      stockUpdate: {
        productId: '',
        quantity: null,
        location: '',
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
    categories() {
      return this.store.categories || [];
    },
    vendors() {
      return this.store.vendors || [];
    },
    isLoading() {
      return this.store.loading.inventory || this.store.loading.products;
    },
    filteredInventory() {
      let result = this.inventory;
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(item => {
          const product = this.getProduct(item.productId) || {};
          const productName = (product.name || '').toLowerCase();
          const vendorName = this.getVendorName(product.vendorId).toLowerCase();
          const categoryName = this.getCategoryName(product.categoryId).toLowerCase();
          const location = (item.location || '').toLowerCase();
          return (
            productName.includes(query) ||
            vendorName.includes(query) ||
            categoryName.includes(query) ||
            location.includes(query)
          );
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
      this.stockUpdate = { 
        productId: item.productId, 
        quantity: item.quantity,
        location: item.location || ''
      };
      this.showStockUpdateForm = true;
    },
    async updateStock() {
      if (!this.stockUpdate.productId || this.stockUpdate.quantity === null) {
        this.toast.error('Please enter a valid quantity');
        return;
      }
      
      try {
        await this.store.updateInventory(
          this.stockUpdate.productId, 
          {
            quantity: this.stockUpdate.quantity,
            location: this.stockUpdate.location
          }
        );
        this.showStockUpdateForm = false;
        this.toast.success('Stock updated successfully');
        
        // Reset the form
        this.stockUpdate = {
          productId: '',
          quantity: null,
          location: '',
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
      
      this.selectedProduct = product;
      this.selectedInventoryItem = item;
      this.showProductDetailsModal = true;
    },
    
    async viewHistory(item) {
      if (!item) {
        this.toast.error('No inventory item selected');
        return;
      }

      this.selectedInventoryItem = item;
      this.selectedProduct = this.getProduct(item.productId);
      this.historyLoading = true;
      this.inventoryHistory = []; // Clear previous history
      this.debugExpandedItems = []; // Reset expanded debug items
      this.showHistoryModal = true;
      
      try {
        console.log('Looking for history for inventory item:', item);
        
        // Fetch all audit logs
        await this.store.fetchAuditLogs(null, 500);
        
        console.log('All audit logs count:', this.store.auditLogs.length);
        
        // Filter for ONLY inventory-related changes to this specific item
        let inventoryHistory = this.store.auditLogs.filter(log => {
          // Must be inventory collection
          if (log.collection !== 'inventory') return false;
          
          // Must be create or update actions (not view actions)
          if (!['create', 'update'].includes(log.action)) return false;
          
          // Try multiple ways to match this inventory item:
          // 1. Direct document ID match
          if (log.documentId === item.id) return true;
          
          // 2. Metadata inventory ID match
          if (log.metadata && log.metadata.inventoryId === item.id) return true;
          
          // 3. Product ID match (less specific but better than nothing)
          if (log.metadata && log.metadata.productId === item.productId) return true;
          
          return false;
        });
        
        console.log('Found inventory changes for this item:', inventoryHistory.length);
        
        // If we found some logs but they're for the product rather than this specific inventory item,
        // let's create a baseline record for this item specifically
        if (inventoryHistory.length === 0) {
          console.log('No inventory history found for item:', item.id);
          console.log('Will show empty state with option to create baseline record');
        }
        
        // Sort logs by timestamp (newest first)
        inventoryHistory.sort((a, b) => {
          const timeA = a.timestamp?.seconds || new Date(a.createdAt).getTime() / 1000 || 0;
          const timeB = b.timestamp?.seconds || new Date(b.createdAt).getTime() / 1000 || 0;
          return timeB - timeA; // Descending order (newest first)
        });
        
        this.inventoryHistory = inventoryHistory;
        
        console.log('Filtered inventory history:', this.inventoryHistory);
      } catch (error) {
        console.error('Failed to fetch inventory history:', error);
        this.toast.error('Failed to load inventory history. Please try again.');
      } finally {
        this.historyLoading = false;
      }
    },
    async createHistoryRecord() {
      if (!this.selectedInventoryItem) {
        this.toast.error('No inventory item selected');
        return;
      }
      
      try {
        const item = this.selectedInventoryItem;
        
        // Use the updateInventory method to create a proper audit trail
        // This will trigger the normal audit logging process
        await this.store.updateInventory(
          item.productId,
          {
            quantity: item.quantity,
            location: item.location || ''
          }
        );
        
        // Refresh the history view
        await this.viewHistory(item);
        
        this.toast.success('Baseline history record created successfully');
      } catch (error) {
        console.error('Failed to create history record:', error);
        this.toast.error('Failed to create history record. Please try again.');
      }
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
    getCategoryName(categoryId) {
      const category = this.categories.find(c => c.id === categoryId);
      return category ? category.name : 'Unknown Category';
    },
    getVendorName(vendorId) {
      const vendor = this.vendors.find(v => v.id === vendorId);
      return vendor ? vendor.name : 'Unknown Vendor';
    },
    formatStructureType(structure) {
      switch (structure) {
        case 'item-package-case':
          return 'Item → Package → Case';
        case 'item-case':
          return 'Item → Case';
        default:
          return structure || 'N/A';
      }
    },
    formatDate(dateInput) {
      if (!dateInput) return 'N/A';
      
      let date;
      
      // Handle Firestore Timestamp objects
      if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
        date = new Date(dateInput.seconds * 1000);
      }
      // Handle ISO date strings
      else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      }
      // Handle Date objects
      else if (dateInput instanceof Date) {
        date = dateInput;
      }
      // Handle epoch timestamps
      else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      }
      else {
        return 'N/A';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    formatAction(action) {
      const actionMap = {
        'create': 'Created',
        'update': 'Updated',
        'delete': 'Deleted',
        'view': 'Viewed'
      };
      return actionMap[action] || action;
    },
    
    formatUpdateDetails(entry) {
      if (!entry.data) return 'Details not available';
      
      const details = [];
      
      if (entry.data.quantity !== undefined) {
        const quantityChange = entry.metadata && entry.metadata.previousData && 
                              entry.metadata.previousData.quantity !== undefined ? 
                              `${entry.metadata.previousData.quantity} → ${entry.data.quantity}` :
                              `to ${entry.data.quantity}`;
        details.push(`Quantity changed ${quantityChange}`);
      }
      
      if (entry.data.location) {
        const locationChange = entry.metadata && entry.metadata.previousData && 
                              entry.metadata.previousData.location ? 
                              `${entry.metadata.previousData.location} → ${entry.data.location}` :
                              `to ${entry.data.location}`;
        details.push(`Location changed ${locationChange}`);
      }
      
      return details.join(', ') || 'Stock updated';
    },
    toggleDebugInfo(index) {
      const position = this.debugExpandedItems.indexOf(index);
      if (position === -1) {
        this.debugExpandedItems.push(index);
      } else {
        this.debugExpandedItems.splice(position, 1);
      }
    },
    formatSource(source) {
      const sourceMap = {
        'inventory_view': 'Inventory Management',
        'home_view': 'Dashboard',
        'order_processing': 'Order Processing',
        'manual': 'Manual Entry',
        'system': 'System'
      };
      return sourceMap[source] || source;
    },
    
    formatDateShort(dateInput) {
      if (!dateInput) return 'N/A';
      
      let date;
      
      // Handle Firestore Timestamp objects
      if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
        date = new Date(dateInput.seconds * 1000);
      }
      // Handle ISO date strings
      else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      }
      // Handle Date objects
      else if (dateInput instanceof Date) {
        date = dateInput;
      }
      // Handle epoch timestamps
      else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      }
      else {
        return 'N/A';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    },
    
    formatDateFull(dateInput) {
      if (!dateInput) return 'N/A';
      
      let date;
      
      // Handle Firestore Timestamp objects
      if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
        date = new Date(dateInput.seconds * 1000);
      }
      // Handle ISO date strings
      else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      }
      // Handle Date objects
      else if (dateInput instanceof Date) {
        date = dateInput;
      }
      // Handle epoch timestamps
      else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      }
      else {
        return 'N/A';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    getQuantityDelta(entry) {
      if (!entry.data || !entry.metadata?.previousData) return '';
      
      const current = entry.data.quantity || 0;
      const previous = entry.metadata.previousData.quantity || 0;
      const delta = current - previous;
      
      if (delta > 0) return `+${delta}`;
      if (delta < 0) return `${delta}`;
      return '0';
    },
    
    getQuantityDeltaClass(entry) {
      if (!entry.data || !entry.metadata?.previousData) return '';
      
      const current = entry.data.quantity || 0;
      const previous = entry.metadata.previousData.quantity || 0;
      const delta = current - previous;
      
      if (delta > 0) return 'delta-positive';
      if (delta < 0) return 'delta-negative';
      return 'delta-neutral';
    },
    
    hasLocationChange(entry) {
      if (!entry.data || entry.data.location === undefined) return false;
      if (!entry.metadata?.previousData) return true;
      
      const currentLocation = entry.data.location || '';
      const previousLocation = entry.metadata.previousData.location || '';
      
      return currentLocation !== previousLocation;
    },
    getPreviousQuantity(entry, index = null) {
      // Try multiple possible locations for previous quantity
      if (entry.metadata?.previousData?.quantity !== undefined) {
        return entry.metadata.previousData.quantity;
      }
      
      // Check if previousData exists but quantity is missing - maybe it's stored differently
      if (entry.metadata?.previousData) {
        // Check for alternative property names
        if (entry.metadata.previousData.qty !== undefined) {
          return entry.metadata.previousData.qty;
        }
      }
      
      // Fallback: if we have the current item and this is an update, we might be able to infer
      if (entry.metadata?.previousQuantity !== undefined) {
        return entry.metadata.previousQuantity;
      }
      
      // Last resort: if we have access to the index and history array, try to infer from the next entry
      if (index !== null && this.inventoryHistory && index < this.inventoryHistory.length - 1) {
        const nextEntry = this.inventoryHistory[index + 1];
        if (nextEntry && nextEntry.data?.quantity !== undefined) {
          return nextEntry.data.quantity;
        }
      }
      
      return 'unknown';
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
      
      if (this.store.categories.length === 0) {
        await this.store.fetchCategories();
      }
      
      if (this.store.vendors.length === 0) {
        await this.store.fetchVendors();
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

/* --- Filter Select (Location) --- */
.filter-select {
  min-width: 160px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 1rem;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  margin-left: 12px;
  margin-right: 8px;
  transition: border 0.18s, box-shadow 0.18s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.filter-select:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 2px #2563eb22;
}
.filter-select option {
  font-size: 1rem;
  padding: 8px 0;
}

/* --- Search Input (Inventory) --- */
.search-input {
  min-width: 220px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 1rem;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  margin-right: 12px;
  transition: border 0.18s, box-shadow 0.18s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.search-input:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 2px #2563eb22;
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
  width: 105px;
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
  width: 105px;
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
  padding: 10px 0;
  border: none;
  background: none;
  text-align: center;
  cursor: pointer;
  color: #374151;
  font-size: 14px;
  transition: all 0.2s ease;
  border-bottom: 1px solid #e5e7eb;
}

.dropdown-item:first-child {
  background-color: #007bff;
  color: white;
  font-weight: 500;
  border-radius: 0;
}

.dropdown-item:first-child:hover {
  background-color: #0069d9;
}

.dropdown-item:not(:first-child):hover {
  background: #f3f4f6;
}

.dropdown-item:last-child {
  border-bottom: none;
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

.modal-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 4px;
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

/* Product Details Modal Styles */
.modal-wide {
  max-width: 800px;
  width: 90%;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.details-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.details-section h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  border-bottom: 2px solid #3498db;
  padding-bottom: 8px;
}

.stock-quantity {
  font-weight: 600;
  font-size: 1.1rem !important;
}

.unit-config-display {
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #dee2e6;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f3f4;
}

.config-item:last-child {
  border-bottom: none;
}

.config-item label {
  font-weight: 500;
  color: #495057;
  margin: 0;
  text-transform: none;
  letter-spacing: normal;
  font-size: 0.9rem;
}

.config-value {
  font-weight: 600;
  color: #2c3e50;
  background: #e9ecef !important;
  padding: 4px 8px !important;
  border-radius: 3px !important;
  font-size: 0.875rem !important;
  border: none !important;
}

.config-breakdown {
  margin-top: 12px;
  padding-left: 16px;
  border-left: 3px solid #3498db;
}

.no-config {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f8f9fa;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-success {
  background: #d1fae5;
  color: #059669;
}

.badge-warning {
  background: #fef3c7;
  color: #d97706;
}

.badge-danger {
  background: #fee2e2;
  color: #dc2626;
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

/* History Modal Styles */
.history-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.summary-card {
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.summary-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
}

/* Timeline Styles */
.history-timeline {
  position: relative;
  padding-left: 40px;
}

.history-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #e2e8f0, #cbd5e0);
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
  padding-bottom: 16px;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-marker {
  position: absolute;
  left: -32px;
  top: 0;
  z-index: 2;
}

.timeline-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.timeline-create {
  background: linear-gradient(135deg, #10b981, #059669);
}

.timeline-update {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.timeline-delete {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.timeline-view {
  background: linear-gradient(135deg, #6b7280, #4b5563);
}

.timeline-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  position: relative;
}

.timeline-content::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 12px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid white;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.timeline-title {
  font-weight: 600;
  font-size: 1rem;
  color: #1e293b;
}

.timeline-date {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.change-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #e2e8f0;
}

.change-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.change-text {
  flex: 1;
  color: #334155;
  line-height: 1.4;
}

.quantity-delta {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875rem;
  margin-left: 4px;
}

.delta-positive {
  background: #dcfce7;
  color: #166534;
}

.delta-negative {
  background: #fee2e2;
  color: #991b1b;
}

.delta-neutral {
  background: #f1f5f9;
  color: #475569;
}

.context-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e2e8f0;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.context-item {
  font-size: 0.875rem;
  color: #64748b;
}

.context-item strong {
  color: #374151;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.loading-state p {
  font-size: 1.1rem;
  margin: 0;
}

.text-muted {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 8px;
}

.detail-row {
  margin-bottom: 8px;
  padding: 4px 0;
  border-bottom: 1px dotted #e5e7eb;
}

.detail-row:last-child {
  border-bottom: none;
}

.debug-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #d1d5db;
}

.debug-info pre {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  margin-top: 8px;
  border: 1px solid #e5e7eb;
  white-space: pre-wrap;
}

.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  padding: 0;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: underline;
}

.btn-link:hover {
  color: #2563eb;
}

.modal-subtitle {
  display: block;
  font-size: 0.85rem;
  font-weight: normal;
  color: #6b7280;
  margin-top: 4px;
}

.mt-4 {
  margin-top: 1rem;
}

/* Improved empty state in history modal */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #64748b;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.7;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
  font-weight: 600;
}

.empty-state p {
  margin: 4px 0;
  line-height: 1.5;
}
</style>