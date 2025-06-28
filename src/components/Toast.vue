<!-- Toast.vue -->
<template>
  <transition-group 
    name="toast" 
    tag="div" 
    class="toast-container"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="toast.type"
    >
      <div class="toast-content">
        {{ toast.message }}
      </div>
      <button 
        class="toast-close"
        @click="removeToast(toast.id)"
      >
        ×
      </button>
    </div>
  </transition-group>
</template>

<script>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

export function useToast() {
  const show = (message, type = 'info', duration = 3000) => {
    const id = nextId++
    toasts.value.push({ id, message, type })
    
    if (duration > 0) {
      setTimeout(() => {
        const index = toasts.value.findIndex(t => t.id === id)
        if (index > -1) {
          toasts.value.splice(index, 1)
        }
      }, duration)
    }
    
    return id
  }
  
  return {
    success: (message) => show(message, 'success'),
    error: (message) => show(message, 'error'),
    info: (message) => show(message, 'info'),
    warning: (message) => show(message, 'warning'),
  }
}

export default {
  name: 'ToastNotification',
  setup() {
    const removeToast = (id) => {
      const index = toasts.value.findIndex(t => t.id === id)
      if (index > -1) {
        toasts.value.splice(index, 1)
      }
    }
    
    return {
      toasts,
      removeToast
    }
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 350px;
}

.toast {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
  color: #374151;
  font-size: 14px;
  transition: all 0.3s ease;
}

.toast-content {
  flex: 1;
  margin-right: 8px;
}

.toast-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6B7280;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast.success {
  background: #DEF7EC;
  color: #03543F;
  border-left: 4px solid #0E9F6E;
}

.toast.error {
  background: #FDE8E8;
  color: #9B1C1C;
  border-left: 4px solid #F05252;
}

.toast.warning {
  background: #FEF3C7;
  color: #92400E;
  border-left: 4px solid #D97706;
}

.toast.info {
  background: #E1EFFE;
  color: #1E429F;
  border-left: 4px solid #3F83F8;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
