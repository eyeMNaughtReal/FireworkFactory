// Global test setup file
import { config } from '@vue/test-utils'

// Mock Firebase globally for tests
const mockFirebase = {
  initializeApp: () => ({}),
  getFirestore: () => ({
    collection: () => ({
      add: vi.fn(),
      get: vi.fn(),
      doc: () => ({
        update: vi.fn(),
        delete: vi.fn(),
        get: vi.fn()
      })
    })
  })
}

// Set up global mocks
global.firebase = mockFirebase

// Configure Vue Test Utils globally
config.global.mocks = {
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  },
  $route: {
    path: '/',
    params: {},
    query: {},
    meta: {}
  }
}

// Global test utilities
global.nextTick = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
}
