import { defineStore } from 'pinia'
import firebaseService from '@/firebase/firebaseService.js'

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    // Main collections
    products: [],
    categories: [],
    vendors: [],
    orders: [],
    inventory: [],
    notifications: [],
    auditLogs: [],
    
    // Loading states
    loading: {
      products: false,
      categories: false,
      vendors: false,
      orders: false,
      inventory: false,
      notifications: false
    },
    
    // Error states
    errors: {},
    
    // Offline mode
    isOffline: false
  }),

  getters: {
    // Categories
    getCategoryById: (state) => (id) => {
      return state.categories.find(category => category.id === id)
    },
    
    // Vendors
    getVendorById: (state) => (id) => {
      return state.vendors.find(vendor => vendor.id === id)
    },
    
    // Products
    getProductById: (state) => (id) => {
      return state.products.find(product => product.id === id)
    },
    
    getProductsByCategory: (state) => (categoryId) => {
      return state.products.filter(product => product.categoryId === categoryId)
    },
    
    getProductsByVendor: (state) => (vendorId) => {
      return state.products.filter(product => product.vendorId === vendorId)
    },
    
    // Inventory
    getInventoryByProduct: (state) => (productId) => {
      return state.inventory.find(inv => inv.productId === productId)
    },
    
    getLowStockProducts: (state) => () => {
      return state.products.filter(product => {
        const inventoryItem = state.inventory.find(inv => inv.productId === product.id)
        const currentStock = inventoryItem ? inventoryItem.quantity : 0
        return currentStock <= (product.lowInventoryThreshold || 0)
      })
    },
    
    // Orders
    getPendingOrders: (state) => {
      return state.orders.filter(order => order.status === 'pending')
    },
    
    getOrderById: (state) => (id) => {
      return state.orders.find(order => order.id === id)
    },
    
    // Notifications
    getUnreadNotifications: (state) => {
      return state.notifications.filter(notification => !notification.isRead)
    },
    
    getNotificationsByType: (state) => (type) => {
      return state.notifications.filter(notification => notification.type === type)
    }
  },

  actions: {
    // Error handling
    setError(operation, error) {
      this.errors[operation] = error.message || error
      console.error(`Error in ${operation}:`, error)
    },
    
    clearError(operation) {
      delete this.errors[operation]
    },
    
    // Categories CRUD
    async fetchCategories() {
      this.loading.categories = true
      this.clearError('fetchCategories')
      
      try {
        this.categories = await firebaseService.getCategories()
      } catch (error) {
        this.setError('fetchCategories', error)
        throw error
      } finally {
        this.loading.categories = false
      }
    },
    
    async addCategory(categoryData) {
      this.clearError('addCategory')
      
      try {
        // Persist name and subCategories only if non-empty
        const newCategory = {
          name: categoryData.name
        };
        if (Array.isArray(categoryData.subCategories) && categoryData.subCategories.length > 0) {
          newCategory.subCategories = categoryData.subCategories;
        }

        console.log('addCategory payload:', newCategory);
        const result = await firebaseService.addDocument(
          firebaseService.collections.CATEGORIES,
          newCategory
        );

        this.categories.push(result);
        return result;
      } catch (error) {
        this.setError('addCategory', error)
        throw error
      }
    },
    
    async updateCategory(id, categoryData) {
      this.clearError('updateCategory')
      
      try {
        // Persist name and subCategories only if non-empty
        const updatedData = {
          name: categoryData.name
        };
        if (Array.isArray(categoryData.subCategories) && categoryData.subCategories.length > 0) {
          updatedData.subCategories = categoryData.subCategories;
        }

        const result = await firebaseService.updateDocument(
          firebaseService.collections.CATEGORIES,
          id,
          updatedData
        );

        const index = this.categories.findIndex(cat => cat.id === id);
        if (index !== -1) {
          this.categories[index] = { ...this.categories[index], ...updatedData };
        }
        
        return result
      } catch (error) {
        this.setError('updateCategory', error)
        throw error
      }
    },
    
    async deleteCategory(id) {
      this.clearError('deleteCategory')
      
      try {
        await firebaseService.deleteDocument(firebaseService.collections.CATEGORIES, id)
        this.categories = this.categories.filter(cat => cat.id !== id)
      } catch (error) {
        this.setError('deleteCategory', error)
        throw error
      }
    },
    
    // Vendors CRUD
    async fetchVendors() {
      this.loading.vendors = true
      this.clearError('fetchVendors')
      
      try {
        this.vendors = await firebaseService.getVendors()
      } catch (error) {
        this.setError('fetchVendors', error)
        throw error
      } finally {
        this.loading.vendors = false
      }
    },
    
    async addVendor(vendorData) {
      this.clearError('addVendor')
      
      try {
        // Simplified vendor structure: only name and id
        const newVendor = {
          name: vendorData.name
        }
        
        const result = await firebaseService.addDocument(
          firebaseService.collections.VENDORS,
          newVendor
        )
        
        this.vendors.push(result)
        return result
      } catch (error) {
        this.setError('addVendor', error)
        throw error
      }
    },
    
    async updateVendor(id, vendorData) {
      this.clearError('updateVendor')
      
      try {
        const updatedData = {
          name: vendorData.name
        }
        
        const result = await firebaseService.updateDocument(
          firebaseService.collections.VENDORS,
          id,
          updatedData
        )
        
        const index = this.vendors.findIndex(vendor => vendor.id === id)
        if (index !== -1) {
          this.vendors[index] = { ...this.vendors[index], ...updatedData }
        }
        
        return result
      } catch (error) {
        this.setError('updateVendor', error)
        throw error
      }
    },
    
    async deleteVendor(id) {
      this.clearError('deleteVendor')
      
      try {
        await firebaseService.deleteDocument(firebaseService.collections.VENDORS, id)
        this.vendors = this.vendors.filter(vendor => vendor.id !== id)
      } catch (error) {
        this.setError('deleteVendor', error)
        throw error
      }
    },
    
    // Products CRUD (simplified structure)
    unsubscribeProducts: null,
    async subscribeToProducts() {
      if (this.unsubscribeProducts) {
        this.unsubscribeProducts();
      }
      this.loading.products = true;
      this.clearError('subscribeToProducts');
      try {
        this.unsubscribeProducts = firebaseService.subscribeToCollection(
          firebaseService.collections.PRODUCTS,
          (products) => {
            this.products = products;
            this.loading.products = false;
          }
        );
      } catch (error) {
        this.setError('subscribeToProducts', error);
        this.loading.products = false;
        throw error;
      }
    },
    
    async fetchProducts() {
      this.loading.products = true
      this.clearError('fetchProducts')
      
      try {
        this.products = await firebaseService.getProducts()
      } catch (error) {
        this.setError('fetchProducts', error)
        throw error
      } finally {
        this.loading.products = false
      }
    },
    
    async addProduct(productData) {
      this.clearError('addProduct')
      
      try {
        // Defensive: Guarantee all required unitConfig fields are present and not undefined
        let unitConfig = productData.unitConfig || {
          structure: 'item-case',
          item: { type: 'item', conversionRate: 1 },
          package: { type: 'package', conversionRate: 0 },
          case: { type: 'case', conversionRate: 1 },
          itemsPerCase: 0,
          itemsPerPackage: 0,
          itemsPerItem: 0,
          totalItemsPerCase: 0,
          packagesPerCase: 0 // Add missing field
        };
        // Guarantee all possible fields are present and not undefined
        if (unitConfig.itemsPerCase === undefined) unitConfig.itemsPerCase = 0;
        if (unitConfig.itemsPerPackage === undefined) unitConfig.itemsPerPackage = 0;
        if (unitConfig.itemsPerItem === undefined) unitConfig.itemsPerItem = 0;
        if (unitConfig.totalItemsPerCase === undefined) unitConfig.totalItemsPerCase = 0;
        if (unitConfig.packagesPerCase === undefined) unitConfig.packagesPerCase = 0;
        // Defensive: Guarantee nested conversionRates are numbers
        if (!unitConfig.item) unitConfig.item = { type: 'item', conversionRate: 1 };
        if (!unitConfig.package) unitConfig.package = { type: 'package', conversionRate: 0 };
        if (!unitConfig.case) unitConfig.case = { type: 'case', conversionRate: 1 };
        if (typeof unitConfig.item.conversionRate !== 'number') unitConfig.item.conversionRate = Number(unitConfig.item.conversionRate) || 1;
        if (typeof unitConfig.package.conversionRate !== 'number') unitConfig.package.conversionRate = Number(unitConfig.package.conversionRate) || 0;
        if (typeof unitConfig.case.conversionRate !== 'number') unitConfig.case.conversionRate = Number(unitConfig.case.conversionRate) || 1;

        const newProduct = {
          name: productData.name,
          categoryId: productData.categoryId,
          vendorId: productData.vendorId,
          lowInventoryThreshold: productData.lowInventoryThreshold || 0,
          thresholdUnit: productData.thresholdUnit || 'item',
          thresholdInItems: productData.thresholdInItems || 0,
          unitConfig
        };

        // Make sure not to send the legacy 'units' field to Firestore
        if ('units' in newProduct) {
          delete newProduct.units;
        }

        const result = await firebaseService.addDocument(
          firebaseService.collections.PRODUCTS,
          newProduct
        );

        this.products.push(result);
        return result;
      } catch (error) {
        this.setError('addProduct', error);
        throw error;
      }
    },
    
    async updateProduct(id, productData) {
      this.clearError('updateProduct')
      
      try {
        // Remove invalid units field and use unitConfig instead
        const updatedData = {
          name: productData.name,
          categoryId: productData.categoryId,
          vendorId: productData.vendorId,
          lowInventoryThreshold: productData.lowInventoryThreshold || 0,
          thresholdUnit: productData.thresholdUnit || 'item',
          thresholdInItems: productData.thresholdInItems || 0,
          unitConfig: productData.unitConfig || {}
        }
        
        // Make sure not to pass 'units' field to Firestore which would cause validation errors
        if ('units' in updatedData) {
          delete updatedData.units;
        }
        
        const result = await firebaseService.updateDocument(
          firebaseService.collections.PRODUCTS,
          id,
          updatedData
        )
        
        const index = this.products.findIndex(product => product.id === id)
        if (index !== -1) {
          this.products[index] = { ...this.products[index], ...updatedData }
        }
        
        return result
      } catch (error) {
        this.setError('updateProduct', error)
        throw error
      }
    },
    
    async deleteProduct(id) {
      this.clearError('deleteProduct')
      
      try {
        await firebaseService.deleteDocument(firebaseService.collections.PRODUCTS, id)
        this.products = this.products.filter(product => product.id !== id)
      } catch (error) {
        this.setError('deleteProduct', error)
        throw error
      }
    },
    
    // Orders CRUD
    async fetchOrders() {
      this.loading.orders = true
      this.clearError('fetchOrders')
      
      try {
        this.orders = await firebaseService.getOrders()
      } catch (error) {
        this.setError('fetchOrders', error)
        throw error
      } finally {
        this.loading.orders = false
      }
    },
    
    async addOrder(orderData) {
      this.clearError('addOrder')
      
      try {
        console.log('Adding new order with data:', orderData);
        
        const newOrder = {
          ...orderData,
          status: orderData.status || 'pending' // Default to pending but keep status if provided
        }
        
        // Ensure item quantities are numbers
        if (newOrder.items && Array.isArray(newOrder.items)) {
          newOrder.items = newOrder.items.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0 // Convert to number
          }));
        }
        
        const result = await firebaseService.addDocument(
          firebaseService.collections.ORDERS,
          newOrder
        )
        
        this.orders.push(result)
        
        // If order is already marked as received upon creation, update inventory right away
        if (result.status === 'received') {
          console.log('New order is already received, updating inventory...');
          await this.updateInventoryFromOrder(result);
        }
        
        return result
      } catch (error) {
        this.setError('addOrder', error)
        throw error
      }
    },
    
    async updateOrder(id, orderData) {
      this.clearError('updateOrder')
      
      try {
        console.log(`Updating order ${id} with data:`, orderData);
        
        // First, ensure we have the latest inventory data before processing
        await this.fetchInventory(true);
        
        const result = await firebaseService.updateDocument(
          firebaseService.collections.ORDERS,
          id,
          orderData
        )
        
        const index = this.orders.findIndex(order => order.id === id)
        if (index !== -1) {
          // Create updated order object with all data
          const updatedOrder = { ...this.orders[index], ...orderData };
          this.orders[index] = updatedOrder;
          
          // If order is marked as received, update inventory
          if (orderData.status === 'received') {
            console.log('Order marked as received, updating inventory...');
            await this.updateInventoryFromOrder(updatedOrder);
          }
        }
        
        // Refresh inventory after an order is saved to ensure we have the latest data
        await this.fetchInventory(true);
        
        return result
      } catch (error) {
        this.setError('updateOrder', error)
        throw error
      }
    },
    
    async deleteOrder(id) {
      this.clearError('deleteOrder')
      
      try {
        await firebaseService.deleteDocument(firebaseService.collections.ORDERS, id)
        this.orders = this.orders.filter(order => order.id !== id)
      } catch (error) {
        this.setError('deleteOrder', error)
        throw error
      }
    },
    
    // Inventory CRUD
    async fetchInventory(forceRefresh = false) {
      this.loading.inventory = true
      this.clearError('fetchInventory')
      
      try {
        this.inventory = await firebaseService.getInventory(!forceRefresh)
      } catch (error) {
        this.setError('fetchInventory', error)
        throw error
      } finally {
        this.loading.inventory = false
      }
    },
    
    async updateInventory(productId, quantityInput) {
      this.clearError('updateInventory')
      
      try {
        // Handle both object and primitive quantity values
        let numericQuantity;
        let lastUpdated = new Date().toISOString();
        
        // Handle additional fields like location
        let location;
        
        // Check if quantity is an object (from HomeView.vue) or a primitive (from updateInventoryFromOrder)
        if (typeof quantityInput === 'object' && quantityInput !== null) {
          console.log(`updateInventory called with object:`, quantityInput);
          if (quantityInput.quantity !== undefined) {
            numericQuantity = Number(quantityInput.quantity) || 0;
          } else {
            // Default to 0 if quantity is not provided in the object
            numericQuantity = 0;
          }
          
          // Use provided lastUpdated if available
          if (quantityInput.lastUpdated) {
            lastUpdated = quantityInput.lastUpdated;
          }
          
          // Extract location if provided
          if (quantityInput.location !== undefined) {
            location = quantityInput.location;
          }
        } else {
          // Direct quantity value passed
          numericQuantity = Number(quantityInput) || 0;
        }
        
        console.log(`updateInventory processing product ${productId} with final quantity: ${numericQuantity}`);
        
        const existingInventory = this.inventory.find(inv => inv.productId === productId)
        
        if (existingInventory) {
          console.log(`Found existing inventory for product ${productId}: ${JSON.stringify(existingInventory)}`);
          
          // Update existing inventory
          const updateData = { 
            quantity: numericQuantity,  // Use numeric quantity for Firestore
            lastUpdated: lastUpdated
          }
          
          // Add location if provided
          if (location !== undefined) {
            updateData.location = location;
          }
          
          // Save previous data for audit trail
          const previousData = {
            quantity: existingInventory.quantity,
            location: existingInventory.location
          };
          
          // Enhanced metadata for audit trail
          const metadata = { 
            previousData,
            inventoryId: existingInventory.id,
            productId: productId,
            productName: this.getProductById(productId)?.name || 'Unknown Product',
            reason: 'Inventory update',
            changeType: 'quantity_update'
          };
          
          const result = await firebaseService.updateDocument(
            firebaseService.collections.INVENTORY,
            existingInventory.id,
            updateData,
            metadata // Pass enhanced metadata
          )
          
          // Update local state with the same numeric quantity
          const index = this.inventory.findIndex(inv => inv.id === existingInventory.id)
          if (index !== -1) {
            this.inventory[index].quantity = numericQuantity
            this.inventory[index].lastUpdated = lastUpdated
            if (location !== undefined) {
              this.inventory[index].location = location
            }
            console.log(`Local inventory updated to: ${numericQuantity}`, location ? `with location: ${location}` : '');
          }
          
          return result
        } else {
          console.log(`No existing inventory for product ${productId}, creating new record`);
          
          // Create new inventory record
          const newInventory = {
            productId,
            quantity: numericQuantity,
            lastUpdated: lastUpdated
          }
          
          // Add location if provided
          if (location !== undefined) {
            newInventory.location = location;
          }
          
          // Enhanced metadata for audit trail
          const metadata = {
            action: 'Initial inventory creation',
            productId: productId,
            productName: this.getProductById(productId)?.name || 'Unknown Product',
            reason: 'New inventory item',
            changeType: 'create_inventory'
          };
          
          const result = await firebaseService.addDocument(
            firebaseService.collections.INVENTORY,
            newInventory,
            metadata
          )
          
          this.inventory.push(result)
          return result
        }
      } catch (error) {
        this.setError('updateInventory', error)
        throw error
      }
    },
    
    async updateInventoryFromOrder(order) {
      if (!order.items) return
      
      console.log('Processing received order:', order);
      
      for (const item of order.items) {
        try {
          // Make sure we get the latest inventory data
          const currentInventory = this.inventory.find(inv => inv.productId === item.productId);
          // Ensure we convert to number to avoid string concatenation issues
          const currentQuantity = currentInventory ? Number(currentInventory.quantity) || 0 : 0;
          // Convert item quantity to number as well
          const itemQuantity = Number(item.quantity) || 0;
          // Calculate new quantity by adding order quantity to current inventory
          const newQuantity = currentQuantity + itemQuantity;
          
          console.log(`Updating inventory for product ${item.productId}: Current: ${currentQuantity}, Adding: ${itemQuantity}, New: ${newQuantity}`);
          
          await this.updateInventory(item.productId, newQuantity);
        } catch (error) {
          console.error('Error updating inventory from order:', error);
        }
      }
    },
    
    // Notifications
    async fetchNotifications() {
      this.loading.notifications = true
      this.clearError('fetchNotifications')
      
      try {
        this.notifications = await firebaseService.getNotifications()
      } catch (error) {
        this.setError('fetchNotifications', error)
        throw error
      } finally {
        this.loading.notifications = false
      }
    },
    
    async markNotificationAsRead(notificationId) {
      try {
        await firebaseService.markNotificationAsRead(notificationId)
        
        const index = this.notifications.findIndex(n => n.id === notificationId)
        if (index !== -1) {
          this.notifications[index].isRead = true
        }
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    },
    
    // Audit Logs
    async fetchAuditLogs(collectionFilter = null, limit = 100) {
      try {
        this.auditLogs = await firebaseService.getAuditLogs(collectionFilter, limit)
      } catch (error) {
        console.error('Error fetching audit logs:', error)
      }
    },
    
    // Initialize store
    async initializeStore() {
      try {
        await Promise.all([
          this.fetchCategories(),
          this.fetchVendors(),
          this.fetchProducts(),
          this.fetchOrders(),
          this.fetchInventory(),
          this.fetchNotifications()
        ])
        
        // Check for low inventory items
        await this.checkLowInventory()
      } catch (error) {
        console.error('Error initializing store:', error)
        this.isOffline = true
      }
    },
    
    // Check for low inventory and create notifications
    async checkLowInventory() {
      try {
        await firebaseService.checkLowInventory(this.products, this.inventory)
        // Refresh notifications after checking
        await this.fetchNotifications()
      } catch (error) {
        console.error('Error checking low inventory:', error)
      }
    },
    
    // Log inventory action for audit trail
    async logInventoryAction(inventoryId, action, data, metadata = {}) {
      try {
        // If we have the inventory item, include its details in the metadata
        const inventoryItem = this.inventory.find(item => item.id === inventoryId);
        const enhancedMetadata = { ...metadata };
        
        if (inventoryItem) {
          // Add inventory item details to metadata
          enhancedMetadata.inventoryId = inventoryId;
          enhancedMetadata.productId = inventoryItem.productId;
          enhancedMetadata.productName = this.getProductById(inventoryItem.productId)?.name || 'Unknown Product';
          
          // Add product ID to data for easier searching
          if (data && typeof data === 'object') {
            data.productId = inventoryItem.productId;
          }
        }
        
        return await firebaseService.logAuditEntry(
          firebaseService.collections.INVENTORY, 
          action, 
          inventoryId, 
          data, 
          enhancedMetadata
        );
      } catch (error) {
        console.error('Error logging inventory action:', error);
        return false;
      }
    },
  }
})
