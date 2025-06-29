import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '@/stores/inventory.js'

// Mock the Firebase service
vi.mock('@/firebase/firebaseService.js', () => ({
  default: {
    collections: {
      PRODUCTS: 'products',
      CATEGORIES: 'categories',
      VENDORS: 'vendors',
      ORDERS: 'orders',
      INVENTORY: 'inventory'
    },
    getCategories: vi.fn(),
    getVendors: vi.fn(),
    getProducts: vi.fn(),
    getOrders: vi.fn(),
    getInventory: vi.fn(),
    addDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn()
  }
}))

describe('Inventory Store', () => {
  let store

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    store = useInventoryStore()
  })

  describe('State Initialization', () => {
    it('should initialize with empty arrays and default values', () => {
      expect(store.products).toEqual([])
      expect(store.categories).toEqual([])
      expect(store.vendors).toEqual([])
      expect(store.orders).toEqual([])
      expect(store.inventory).toEqual([])
      expect(store.isOffline).toBe(false)
      expect(store.errors).toEqual({})
    })

    it('should initialize loading states to false', () => {
      expect(store.loading.products).toBe(false)
      expect(store.loading.categories).toBe(false)
      expect(store.loading.vendors).toBe(false)
      expect(store.loading.orders).toBe(false)
      expect(store.loading.inventory).toBe(false)
      expect(store.loading.notifications).toBe(false)
    })
  })

  describe('Getters', () => {
    beforeEach(() => {
      // Set up test data
      store.categories = [
        { id: 'cat1', name: 'Fireworks' },
        { id: 'cat2', name: 'Sparklers' }
      ]
      
      store.vendors = [
        { id: 'vendor1', name: 'Pyrotechnics Inc' },
        { id: 'vendor2', name: 'Sparkle Co' }
      ]
      
      store.products = [
        { 
          id: 'prod1', 
          name: 'Roman Candle', 
          categoryId: 'cat1', 
          vendorId: 'vendor1',
          lowInventoryThreshold: 10
        },
        { 
          id: 'prod2', 
          name: 'Sparkler Pack', 
          categoryId: 'cat2', 
          vendorId: 'vendor2',
          lowInventoryThreshold: 5
        },
        { 
          id: 'prod3', 
          name: 'Fountain', 
          categoryId: 'cat1', 
          vendorId: 'vendor1',
          lowInventoryThreshold: 8
        }
      ]
      
      store.inventory = [
        { id: 'inv1', productId: 'prod1', quantity: 3 }, // Low stock
        { id: 'inv2', productId: 'prod2', quantity: 20 }, // Good stock
        { id: 'inv3', productId: 'prod3', quantity: 8 }  // At threshold
      ]
      
      store.orders = [
        { id: 'order1', status: 'pending', productId: 'prod1' },
        { id: 'order2', status: 'completed', productId: 'prod2' },
        { id: 'order3', status: 'pending', productId: 'prod3' }
      ]
    })

    it('should get category by id', () => {
      const category = store.getCategoryById('cat1')
      expect(category).toEqual({ id: 'cat1', name: 'Fireworks' })
    })

    it('should return undefined for non-existent category', () => {
      const category = store.getCategoryById('non-existent')
      expect(category).toBeUndefined()
    })

    it('should get vendor by id', () => {
      const vendor = store.getVendorById('vendor2')
      expect(vendor).toEqual({ id: 'vendor2', name: 'Sparkle Co' })
    })

    it('should get product by id', () => {
      const product = store.getProductById('prod1')
      expect(product).toEqual({
        id: 'prod1',
        name: 'Roman Candle',
        categoryId: 'cat1',
        vendorId: 'vendor1',
        lowInventoryThreshold: 10
      })
    })

    it('should get products by category', () => {
      const products = store.getProductsByCategory('cat1')
      expect(products).toHaveLength(2)
      expect(products.map(p => p.name)).toEqual(['Roman Candle', 'Fountain'])
    })

    it('should get products by vendor', () => {
      const products = store.getProductsByVendor('vendor1')
      expect(products).toHaveLength(2)
      expect(products.map(p => p.name)).toEqual(['Roman Candle', 'Fountain'])
    })

    it('should get inventory by product', () => {
      const inventory = store.getInventoryByProduct('prod2')
      expect(inventory).toEqual({ id: 'inv2', productId: 'prod2', quantity: 20 })
    })

    describe('Low Stock Detection', () => {
      it('should identify products with low stock', () => {
        const lowStockProducts = store.getLowStockProducts()
        
        expect(lowStockProducts).toHaveLength(2)
        
        // Roman Candle: 3 quantity <= 10 threshold
        expect(lowStockProducts.find(p => p.id === 'prod1')).toBeDefined()
        
        // Fountain: 8 quantity <= 8 threshold
        expect(lowStockProducts.find(p => p.id === 'prod3')).toBeDefined()
        
        // Sparkler Pack: 20 quantity > 5 threshold (not low stock)
        expect(lowStockProducts.find(p => p.id === 'prod2')).toBeUndefined()
      })

      it('should handle products with no inventory record', () => {
        // Add a product with no inventory
        store.products.push({
          id: 'prod4',
          name: 'New Product',
          categoryId: 'cat1',
          vendorId: 'vendor1',
          lowInventoryThreshold: 5
        })

        const lowStockProducts = store.getLowStockProducts()
        
        // Should include the new product since 0 <= 5
        expect(lowStockProducts.find(p => p.id === 'prod4')).toBeDefined()
      })

      it('should handle products with zero threshold', () => {
        store.products.push({
          id: 'prod5',
          name: 'Zero Threshold Product',
          categoryId: 'cat1',
          vendorId: 'vendor1',
          lowInventoryThreshold: 0
        })

        store.inventory.push({
          id: 'inv5',
          productId: 'prod5',
          quantity: 0
        })

        const lowStockProducts = store.getLowStockProducts()
        
        // Should include product with 0 quantity and 0 threshold
        expect(lowStockProducts.find(p => p.id === 'prod5')).toBeDefined()
      })

      it('should handle products with undefined threshold', () => {
        store.products.push({
          id: 'prod6',
          name: 'No Threshold Product',
          categoryId: 'cat1',
          vendorId: 'vendor1'
          // No lowInventoryThreshold defined
        })

        store.inventory.push({
          id: 'inv6',
          productId: 'prod6',
          quantity: 0 // Changed to 0 to test the threshold default behavior
        })

        const lowStockProducts = store.getLowStockProducts()
        
        // Should include product since 0 <= 0 (default threshold)
        expect(lowStockProducts.find(p => p.id === 'prod6')).toBeDefined()
      })
    })

    it('should get pending orders', () => {
      const pendingOrders = store.getPendingOrders
      expect(pendingOrders).toHaveLength(2)
      expect(pendingOrders.map(o => o.id)).toEqual(['order1', 'order3'])
    })

    it('should get order by id', () => {
      const order = store.getOrderById('order2')
      expect(order).toEqual({ id: 'order2', status: 'completed', productId: 'prod2' })
    })
  })

  describe('Error Handling', () => {
    it('should set error for operation', () => {
      const error = new Error('Test error')
      store.setError('testOperation', error)
      
      expect(store.errors.testOperation).toBe('Test error')
    })

    it('should handle non-Error objects', () => {
      store.setError('testOperation', 'String error')
      
      expect(store.errors.testOperation).toBe('String error')
    })

    it('should clear error for operation', () => {
      store.setError('testOperation', 'Test error')
      expect(store.errors.testOperation).toBe('Test error')
      
      store.clearError('testOperation')
      expect(store.errors.testOperation).toBeUndefined()
    })
  })
})
