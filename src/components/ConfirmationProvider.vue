<template>
  <teleport to="body">
    <div v-if="isVisible" class="confirmation-overlay" @click="handleCancel">
      <div class="confirmation-modal" @click.stop>
        <div class="confirmation-header">
          <h3>{{ config.title }}</h3>
          <button @click="handleCancel" class="close-btn">&times;</button>
        </div>
        
        <div class="confirmation-content">
          <div :class="['message', config.messageType]">
            <p>{{ config.message }}</p>
          </div>
        </div>
        
        <div class="confirmation-actions">
          <button @click="handleCancel" class="btn-secondary">
            {{ config.cancelText }}
          </button>
          <button 
            @click="handleConfirm" 
            :class="['btn-' + config.confirmButtonType]"
          >
            {{ config.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import { provide } from 'vue'
import useConfirmation from '@/composables/useConfirmation'

export default {
  name: 'ConfirmationProvider',
  setup() {
    // Create the confirmation composable instance
    const confirmation = useConfirmation();
    
    // Make it available to all components
    provide('confirmation', confirmation);
    
    return {
      isVisible: confirmation.isVisible,
      config: confirmation.config,
      handleConfirm: confirmation.handleConfirm,
      handleCancel: confirmation.handleCancel
    };
  }
}
</script>

<style scoped>
.confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.confirmation-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.confirmation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.confirmation-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.confirmation-content {
  padding: 24px;
}

.message {
  border-radius: 6px;
  padding: 16px;
}

.message.warning {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
}

.message.danger {
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
}

.message.info {
  background: #e0f2fe;
  border: 1px solid #38bdf8;
  color: #0369a1;
}

.message p {
  margin: 0;
}

.confirmation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.confirmation-actions button {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-primary {
  background: #3b82f6;
  border: 1px solid #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-danger {
  background: #ef4444;
  border: 1px solid #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-warning {
  background: #f59e0b;
  border: 1px solid #d97706;
  color: white;
}

.btn-warning:hover {
  background: #d97706;
}
</style>
