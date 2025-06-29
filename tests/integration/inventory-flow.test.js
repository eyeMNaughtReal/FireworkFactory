import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '@/stores/inventory.js'
import firebaseService from '@/firebase/firebaseService.js'

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

describe('Inventory Store Integration', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useInventoryStore()
    vi.clearAllMocks()
  })

  describe('Category Management Flow', () => {
    it('should successfully fetch, add, update, and delete categories', async () => {
      // Mock data
      const mockCategories = [
        { id: 'cat1', name: 'Fireworks' },
        { id: 'cat2', name: 'Sparklers' }
      ]

      const newCategory = { id: 'cat3', name: 'Fountains' }
      const updatedCategory = { id: 'cat1', name: 'Premium Fireworks' }

      // Setup mocks
      firebaseService.getCategories.mockResolvedValue(mockCategories)
      firebaseService.addDocument.mockResolvedValue(newCategory)
      firebaseService.updateDocument.mockResolvedValue(updatedCategory)
      firebaseService.deleteDocument.mockResolvedValue()

      // Test fetch
      await store.fetchCategories()
      expect(store.categories).toEqual(mockCategories)
      expect(store.loading.categories).toBe(false)
      expect(firebaseService.getCategories).toHaveBeenCalledTimes(1)

      // Test add
      const addResult = await store.addCategory({ name: 'Fountains' })
      expect(addResult).toEqual(newCategory)
      expect(store.categories).toHaveLength(3) // Started with 2, added 1
      expect(store.categories.find(cat => cat.id === 'cat3')).toEqual(newCategory)
      expect(firebaseService.addDocument).toHaveBeenCalledWith(
        firebaseService.collections.CATEGORIES,
        { name: 'Fountains' }
      )

      // Test update
      const updateResult = await store.updateCategory('cat1', { name: 'Premium Fireworks' })
      expect(updateResult).toEqual(updatedCategory)
      expect(firebaseService.updateDocument).toHaveBeenCalledWith(
        firebaseService.collections.CATEGORIES,
        'cat1',
        { name: 'Premium Fireworks' }
      )

      // Test delete
      await store.deleteCategory('cat1')
      expect(store.categories.find(cat => cat.id === 'cat1')).toBeUndefined()
      expect(firebaseService.deleteDocument).toHaveBeenCalledWith(
        firebaseService.collections.CATEGORIES,
        'cat1'
      )
    })

    it('should handle fetch categories error', async () => {
      const error = new Error('Firebase error')
      firebaseService.getCategories.mockRejectedValue(error)

      try {
        await store.fetchCategories()
      } catch (thrownError) {
        expect(thrownError).toBe(error)
        expect(store.errors.fetchCategories).toBe('Firebase error')
        expect(store.loading.categories).toBe(false)
      }
    })
  })

  describe('Product and Inventory Integration', () => {
    it('should manage product lifecycle with inventory tracking', async () => {
      // Setup initial data
      const mockCategories = [{ id: 'cat1', name: 'Fireworks' }]
      const mockVendors = [{ id: 'vendor1', name: 'Pyro Co' }]
      const mockProducts = [
        {
          id: 'prod1',
          name: 'Roman Candle',
          categoryId: 'cat1',
          vendorId: 'vendor1',
          lowInventoryThreshold: 10
        }
      ]
      const mockInventory = [
        { id: 'inv1', productId: 'prod1', quantity: 5 }
      ]

      // Mock Firebase responses
      firebaseService.getCategories.mockResolvedValue(mockCategories)
      firebaseService.getVendors.mockResolvedValue(mockVendors)
      firebaseService.getProducts.mockResolvedValue(mockProducts)
      firebaseService.getInventory.mockResolvedValue(mockInventory)

      // Load all data
      await Promise.all([
        store.fetchCategories(),
        store.fetchVendors(),
        store.fetchProducts(),
        store.fetchInventory()
      ])

      // Verify data is loaded
      expect(store.categories).toEqual(mockCategories)
      expect(store.vendors).toEqual(mockVendors)
      expect(store.products).toEqual(mockProducts)
      expect(store.inventory).toEqual(mockInventory)

      // Test low stock detection with real data
      const lowStockProducts = store.getLowStockProducts()
      expect(lowStockProducts).toHaveLength(1)
      expect(lowStockProducts[0].id).toBe('prod1')

      // Test related getters
      const product = store.getProductById('prod1')
      expect(product.name).toBe('Roman Candle')

      const category = store.getCategoryById('cat1')
      expect(category.name).toBe('Fireworks')

      const vendor = store.getVendorById('vendor1')
      expect(vendor.name).toBe('Pyro Co')

      const inventory = store.getInventoryByProduct('prod1')
      expect(inventory.quantity).toBe(5)
    })

    it('should handle complex product filtering scenarios', async () => {
      // Setup test data
      store.categories = [
        { id: 'cat1', name: 'Fireworks' },
        { id: 'cat2', name: 'Sparklers' }
      ]
      
      store.vendors = [
        { id: 'vendor1', name: 'Pyro Co' },
        { id: 'vendor2', name: 'Sparkle Inc' }
      ]
      
      store.products = [
        { id: 'prod1', name: 'Roman Candle', categoryId: 'cat1', vendorId: 'vendor1' },
        { id: 'prod2', name: 'Fountain', categoryId: 'cat1', vendorId: 'vendor1' },
        { id: 'prod3', name: 'Sparkler Pack', categoryId: 'cat2', vendorId: 'vendor2' },
        { id: 'prod4', name: 'Premium Sparklers', categoryId: 'cat2', vendorId: 'vendor1' }
      ]

      // Test category filtering
      const fireworksProducts = store.getProductsByCategory('cat1')
      expect(fireworksProducts).toHaveLength(2)
      expect(fireworksProducts.map(p => p.name)).toEqual(['Roman Candle', 'Fountain'])

      const sparklersProducts = store.getProductsByCategory('cat2')
      expect(sparklersProducts).toHaveLength(2)
      expect(sparklersProducts.map(p => p.name)).toEqual(['Sparkler Pack', 'Premium Sparklers'])

      // Test vendor filtering
      const pyroCoProducts = store.getProductsByVendor('vendor1')
      expect(pyroCoProducts).toHaveLength(3)
      expect(pyroCoProducts.map(p => p.name)).toEqual(['Roman Candle', 'Fountain', 'Premium Sparklers'])

      const sparkleIncProducts = store.getProductsByVendor('vendor2')
      expect(sparkleIncProducts).toHaveLength(1)
      expect(sparkleIncProducts[0].name).toBe('Sparkler Pack')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle multiple operation errors gracefully', async () => {
      const categoryError = new Error('Category fetch failed')
      const productError = new Error('Product add failed')

      firebaseService.getCategories.mockRejectedValue(categoryError)
      firebaseService.addDocument.mockRejectedValue(productError)

      // Test that one error doesn't affect another operation
      try {
        await store.fetchCategories()
      } catch (error) {
        expect(error).toBe(categoryError)
        expect(store.errors.fetchCategories).toBe('Category fetch failed')
      }

      try {
        await store.addProduct({ name: 'Test Product' })
      } catch (error) {
        expect(error).toBe(productError)
        expect(store.errors.addProduct).toBe('Product add failed')
      }

      // Both errors should be tracked separately
      expect(store.errors.fetchCategories).toBe('Category fetch failed')
      expect(store.errors.addProduct).toBe('Product add failed')

      // Clear one error shouldn't affect the other
      store.clearError('fetchCategories')
      expect(store.errors.fetchCategories).toBeUndefined()
      expect(store.errors.addProduct).toBe('Product add failed')
    })
  })

  describe('Loading State Management', () => {
    it('should properly manage loading states during operations', async () => {
      let resolvePromise
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      firebaseService.getCategories.mockReturnValue(pendingPromise)

      // Start the operation
      const fetchPromise = store.fetchCategories()
      
      // Loading should be true during operation
      expect(store.loading.categories).toBe(true)

      // Resolve the promise
      resolvePromise([{ id: 'cat1', name: 'Test Category' }])
      await fetchPromise

      // Loading should be false after completion
      expect(store.loading.categories).toBe(false)
      expect(store.categories).toEqual([{ id: 'cat1', name: 'Test Category' }])
    })

    it('should reset loading state even when operation fails', async () => {
      const error = new Error('Operation failed')
      firebaseService.getCategories.mockRejectedValue(error)

      try {
        await store.fetchCategories()
      } catch (thrownError) {
        expect(thrownError).toBe(error)
      }

      // Loading should be false even after error
      expect(store.loading.categories).toBe(false)
    })
  })
})
