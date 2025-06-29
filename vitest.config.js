import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { defineConfig as defineViteConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const viteConfig = defineViteConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.js']
    }
  })
)
