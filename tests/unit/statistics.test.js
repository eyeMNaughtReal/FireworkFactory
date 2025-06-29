import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import StatisticsView from '@/views/StatisticsView.vue'
import { useInventoryStore } from '@/stores/inventory.js'

// Mock the toast composable
vi.mock('@/components/Toast.vue', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  })
}))

// Mock the inventory store
vi.mock('@/stores/inventory.js', () => ({
  useInventoryStore: vi.fn()
}))

describe('StatisticsView', () => {
  let wrapper
  let mockStore

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Create mock store
    mockStore = {
      categories: [
        { id: 'cat1', name: 'Fireworks' },
        { id: 'cat2', name: 'Sparklers' }
      ],
      products: [
        { 
          id: 'prod1', 
          name: 'TNT Soup Bottlerockets', 
          categoryId: 'cat1', 
          vendorId: 'vendor1' 
        },
        { 
          id: 'prod2', 
          name: 'Rainbow Sparklers', 
          categoryId: 'cat2', 
          vendorId: 'vendor1' 
        }
      ],
      orders: [
        { id: 'order1', productId: 'prod1', quantity: 250 }, // 10 cases × 25 packages/case
        { id: 'order2', productId: 'prod2', quantity: 100 }
      ],
      inventory: [
        { id: 'inv1', productId: 'prod1', quantity: 2 }, // 2 packages left
        { id: 'inv2', productId: 'prod2', quantity: 25 } // 25 packages left
      ],
      getVendorById: vi.fn((id) => ({ id: 'vendor1', name: 'Pyro Co' })),
      fetchProducts: vi.fn().mockResolvedValue(),
      fetchCategories: vi.fn().mockResolvedValue(),
      fetchVendors: vi.fn().mockResolvedValue(),
      fetchOrders: vi.fn().mockResolvedValue(),
      fetchInventory: vi.fn().mockResolvedValue()
    }

    useInventoryStore.mockReturnValue(mockStore)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Sales Calculation Logic', () => {
    it('should calculate correct sales statistics', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      const salesStats = wrapper.vm.salesStats

      // Test TNT Soup Bottlerockets calculation
      const prod1Stats = salesStats.find(stat => stat.productId === 'prod1')
      expect(prod1Stats.orderedQuantity).toBe(250)
      expect(prod1Stats.remainingQuantity).toBe(2)
      expect(prod1Stats.soldQuantity).toBe(248) // 250 - 2
      expect(prod1Stats.soldPercentage).toBe(99) // Math.round((248/250) * 100)

      // Test Rainbow Sparklers calculation
      const prod2Stats = salesStats.find(stat => stat.productId === 'prod2')
      expect(prod2Stats.orderedQuantity).toBe(100)
      expect(prod2Stats.remainingQuantity).toBe(25)
      expect(prod2Stats.soldQuantity).toBe(75) // 100 - 25
      expect(prod2Stats.soldPercentage).toBe(75) // Math.round((75/100) * 100)
    })

    it('should calculate estimated revenue correctly', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      const salesStats = wrapper.vm.salesStats
      const prod1Stats = salesStats.find(stat => stat.productId === 'prod1')

      // 248 sold × $2.00 per unit = $496.00
      expect(prod1Stats.estimatedRevenue).toBe(496.00)
    })

    it('should handle products with no orders', async () => {
      // Add a product with no orders
      mockStore.products.push({
        id: 'prod3',
        name: 'No Orders Product',
        categoryId: 'cat1',
        vendorId: 'vendor1'
      })

      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      const salesStats = wrapper.vm.salesStats
      const prod3Stats = salesStats.find(stat => stat.productId === 'prod3')

      // Should not appear in stats since it filters out products with no orders
      expect(prod3Stats).toBeUndefined()
    })

    it('should prevent negative sold quantities', async () => {
      // Create scenario where remaining > ordered (data error case)
      mockStore.inventory[0].quantity = 300 // More remaining than ordered

      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      const salesStats = wrapper.vm.salesStats
      const prod1Stats = salesStats.find(stat => stat.productId === 'prod1')

      // Should be 0, not negative
      expect(prod1Stats.soldQuantity).toBe(0)
      expect(prod1Stats.soldPercentage).toBe(0)
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter by category correctly', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      // Set category filter
      await wrapper.setData({ selectedCategory: 'cat1' })

      const sortedStats = wrapper.vm.sortedStats
      expect(sortedStats).toHaveLength(1)
      expect(sortedStats[0].categoryId).toBe('cat1')
      expect(sortedStats[0].productName).toBe('TNT Soup Bottlerockets')
    })

    it('should sort by sold quantity by default', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      const sortedStats = wrapper.vm.sortedStats
      
      // Should be sorted by soldQuantity descending (248, 75)
      expect(sortedStats[0].soldQuantity).toBe(248)
      expect(sortedStats[1].soldQuantity).toBe(75)
    })

    it('should sort by sell-through percentage', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      await wrapper.setData({ sortBy: 'soldPercentage' })

      const sortedStats = wrapper.vm.sortedStats
      
      // Should be sorted by soldPercentage descending (99%, 75%)
      expect(sortedStats[0].soldPercentage).toBe(99)
      expect(sortedStats[1].soldPercentage).toBe(75)
    })
  })

  describe('Performance Classification', () => {
    it('should classify performance correctly', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      // Test performance classification
      expect(wrapper.vm.getPerformanceClass(85)).toBe('excellent')
      expect(wrapper.vm.getPerformanceClass(70)).toBe('good')
      expect(wrapper.vm.getPerformanceClass(50)).toBe('average')
      expect(wrapper.vm.getPerformanceClass(30)).toBe('poor')

      expect(wrapper.vm.getPerformanceLabel(85)).toBe('Excellent')
      expect(wrapper.vm.getPerformanceLabel(70)).toBe('Good')
      expect(wrapper.vm.getPerformanceLabel(50)).toBe('Average')
      expect(wrapper.vm.getPerformanceLabel(30)).toBe('Poor')
    })
  })

  describe('Summary Statistics', () => {
    it('should calculate filtered summary stats correctly', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      const filteredStats = wrapper.vm.filteredStats

      expect(filteredStats.totalProducts).toBe(2)
      expect(filteredStats.totalOrdered).toBe(350) // 250 + 100
      expect(filteredStats.totalSold).toBe(323) // 248 + 75
      expect(filteredStats.avgSellThrough).toBe(87) // Math.round((99 + 75) / 2)
    })

    it('should show top performers correctly', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      const topPerformers = wrapper.vm.topPerformers

      expect(topPerformers).toHaveLength(2)
      expect(topPerformers[0].productName).toBe('TNT Soup Bottlerockets')
      expect(topPerformers[1].productName).toBe('Rainbow Sparklers')
    })
  })

  describe('Number Formatting', () => {
    it('should format numbers with commas', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.formatNumber(1234)).toBe('1,234')
      expect(wrapper.vm.formatNumber(1234567)).toBe('1,234,567')
    })

    it('should format currency correctly', async () => {
      wrapper = mount(StatisticsView)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.formatCurrency(123.45)).toBe('123.45')
      expect(wrapper.vm.formatCurrency(1234.5)).toBe('1,234.50')
    })
  })
})
