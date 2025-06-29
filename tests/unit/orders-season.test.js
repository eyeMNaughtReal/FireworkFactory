import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import OrdersView from '@/views/OrdersView.vue'
import { useInventoryStore } from '@/stores/inventory'

// Mock the store
vi.mock('@/stores/inventory')
vi.mock('@/components/Toast.vue', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}))

// Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {}
  })
}))

describe('OrdersView Season Feature', () => {
  let mockStore

  beforeEach(() => {
    mockStore = {
      orders: [
        {
          id: '1',
          status: 'ordered',
          season: 'july-4th',
          orderDate: '2025-06-01',
          items: [{ productId: 'p1', quantity: 10, unitCost: 5.00 }],
          total: 50.00
        },
        {
          id: '2', 
          status: 'received',
          season: 'new-years',
          orderDate: '2025-01-01',
          items: [{ productId: 'p2', quantity: 5, unitCost: 10.00 }],
          total: 50.00
        },
        {
          id: '3',
          status: 'ordered',
          season: 'christmas',
          orderDate: '2025-12-15',
          items: [{ productId: 'p3', quantity: 8, unitCost: 7.50 }],
          total: 60.00
        }
      ],
      products: [
        { id: 'p1', name: 'Sparkler', vendorId: 'v1' },
        { id: 'p2', name: 'Roman Candle', vendorId: 'v1' },
        { id: 'p3', name: 'Fountain', vendorId: 'v2' }
      ],
      vendors: [
        { id: 'v1', name: 'Fireworks Inc' },
        { id: 'v2', name: 'Pyro Supply' }
      ],
      inventory: [],
      fetchOrders: vi.fn(),
      fetchProducts: vi.fn(),
      fetchVendors: vi.fn(),
      fetchInventory: vi.fn(),
      addOrder: vi.fn(),
      updateOrder: vi.fn(),
      deleteOrder: vi.fn()
    }

    useInventoryStore.mockReturnValue(mockStore)
  })

  it('should display season filter dropdown with all season options', async () => {
    const wrapper = mount(OrdersView)
    await wrapper.vm.$nextTick()
    
    // Find the season filter dropdown (by looking for the one containing "All Seasons")
    const selects = wrapper.findAll('select')
    const seasonFilter = selects.find(select => 
      select.text().includes('All Seasons')
    )
    
    expect(seasonFilter.exists()).toBe(true)
    
    // Check that it has the expected season options
    const options = seasonFilter.findAll('option')
    const optionValues = options.map(option => option.element.value)
    
    expect(optionValues).toContain('')  // "All Seasons"
    expect(optionValues).toContain('july-4th')
    expect(optionValues).toContain('new-years')
    expect(optionValues).toContain('christmas')
    expect(optionValues).toContain('halloween')
    expect(optionValues).toContain('general')
  })

  it('should filter orders by season when season filter is applied', async () => {
    const wrapper = mount(OrdersView)
    await wrapper.vm.$nextTick()
    
    // Get the component instance to access computed properties
    const vm = wrapper.vm
    
    // Initially should show all orders
    expect(vm.filteredOrders.length).toBe(3)
    
    // Apply july-4th filter
    vm.seasonFilter = 'july-4th'
    await wrapper.vm.$nextTick()
    
    // Should only show july-4th orders
    const filteredOrders = vm.filteredOrders
    expect(filteredOrders.length).toBe(1)
    expect(filteredOrders[0].season).toBe('july-4th')
  })

  it('should display season badges with correct styling', async () => {
    const wrapper = mount(OrdersView)
    await wrapper.vm.$nextTick()
    
    // Find season badges
    const seasonBadges = wrapper.findAll('.season-badge')
    expect(seasonBadges.length).toBeGreaterThan(0)
    
    // Check that badges have appropriate CSS classes
    const july4thBadge = seasonBadges.find(badge => 
      badge.text().includes('4th of July')
    )
    expect(july4thBadge.classes()).toContain('season-july-4th')
  })

  it('should include season in order form', async () => {
    const wrapper = mount(OrdersView)
    await wrapper.vm.$nextTick()
    
    // Open the order form
    const addButton = wrapper.find('.btn-primary')
    await addButton.trigger('click')
    
    // Check that season field exists in form
    const seasonSelects = wrapper.findAll('select').filter(select => 
      select.element.querySelector('option[value="july-4th"]') &&
      select.element.querySelector('option[value="christmas"]')
    )
    
    expect(seasonSelects.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle orders without season (backward compatibility)', async () => {
    // Add an order without season to test backward compatibility
    mockStore.orders.push({
      id: '4',
      status: 'ordered',
      // No season field
      orderDate: '2025-06-15',
      items: [{ productId: 'p1', quantity: 5, unitCost: 3.00 }],
      total: 15.00
    })

    const wrapper = mount(OrdersView)
    await wrapper.vm.$nextTick()
    
    const vm = wrapper.vm
    
    // Should handle orders without season gracefully
    expect(vm.filteredOrders.length).toBe(4)
    
    // Test getSeasonLabel with undefined/null season
    expect(vm.getSeasonLabel(null)).toBe('General Stock')
    expect(vm.getSeasonLabel(undefined)).toBe('General Stock')
    expect(vm.getSeasonLabel('')).toBe('General Stock')
  })

  it('should save season data when creating new order', async () => {
    const wrapper = mount(OrdersView)
    await wrapper.vm.$nextTick()
    
    const vm = wrapper.vm
    
    // Set form data
    vm.formData.season = 'july-4th'
    vm.formData.items = [{ productId: 'p1', quantity: 10, unitCost: 5.00 }]
    vm.formData.status = 'ordered'
    vm.formData.orderDate = '2025-07-01'
    
    // Call saveOrder
    await vm.saveOrder()
    
    // Verify that addOrder was called with season data
    expect(mockStore.addOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        season: 'july-4th',
        items: expect.any(Array),
        status: 'ordered',
        orderDate: '2025-07-01'
      })
    )
  })

  it('should return correct season labels', async () => {
    const wrapper = mount(OrdersView)
    await wrapper.vm.$nextTick()
    
    const vm = wrapper.vm
    
    // Test season label function
    expect(vm.getSeasonLabel('july-4th')).toBe('🎆 4th of July')
    expect(vm.getSeasonLabel('new-years')).toBe('🎊 New Year\'s')
    expect(vm.getSeasonLabel('christmas')).toBe('🎄 Christmas')
    expect(vm.getSeasonLabel('halloween')).toBe('🎃 Halloween')
    expect(vm.getSeasonLabel('general')).toBe('📦 General Stock')
    expect(vm.getSeasonLabel('unknown-season')).toBe('Unknown Season')
  })
})
