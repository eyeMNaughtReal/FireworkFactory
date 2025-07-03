<template>
  <button 
    class="theme-toggle" 
    @click="toggleTheme" 
    :title="theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'"
    :aria-label="theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'"
  >
    <span v-if="theme === 'light'" class="theme-icon">🌙</span>
    <span v-else class="theme-icon">☀️</span>
  </button>
</template>

<script>
import { useThemeStore } from '@/stores/theme'
import { storeToRefs } from 'pinia'

export default {
  name: 'ThemeToggle',
  setup() {
    const themeStore = useThemeStore()
    const { theme } = storeToRefs(themeStore)
    
    const toggleTheme = () => {
      themeStore.toggleTheme()
    }

    return {
      theme,
      toggleTheme
    }
  }
}
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.theme-toggle:hover {
  background: var(--sidebar-hover);
}

.theme-icon {
  font-size: 1.25rem;
}
</style>
