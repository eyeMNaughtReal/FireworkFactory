<template>
  <div v-if="isVisible" class="delete-modal-overlay" @click.stop="cancel">
    <div class="delete-modal" @click.stop>
      <div class="delete-modal-header">
        <h3>{{ title }}</h3>
        <button type="button" @click="cancel" class="close-btn">&times;</button>
      </div>
      
      <div class="delete-modal-content">
        <div class="warning-icon">⚠️</div>
        <p>{{ message }}</p>
        
        <div v-if="itemDetails" class="item-details">
          <h4>Item Details:</h4>
          <div v-for="(value, key) in itemDetails" :key="key" class="detail-row">
            <strong>{{ key }}:</strong> {{ value }}
          </div>
        </div>
      </div>
      
      <div class="delete-modal-actions">
        <button @click="cancel" class="btn-secondary">
          {{ cancelText }}
        </button>
        <button @click="confirm" class="btn-danger">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DeleteConfirmationModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Confirm Deletion'
    },
    message: {
      type: String,
      default: 'Are you sure you want to delete this item? This action cannot be undone.'
    },
    confirmText: {
      type: String,
      default: 'Delete'
    },
    cancelText: {
      type: String,
      default: 'Cancel'
    },
    itemDetails: {
      type: Object,
      default: null
    }
  },
  emits: ['confirm', 'cancel'],
  methods: {
    confirm() {
      this.$emit('confirm');
    },
    cancel() {
      this.$emit('cancel');
    }
  }
}
</script>

<style scoped>
.delete-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.delete-modal {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.delete-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.delete-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.close-btn {
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.delete-modal-content {
  padding: 24px;
  text-align: center;
}

.warning-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.delete-modal-content p {
  color: #4b5563;
  font-size: 1rem;
  margin: 0 0 16px;
}

.item-details {
  margin-top: 20px;
  text-align: left;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 16px;
}

.item-details h4 {
  margin: 0 0 12px;
  color: #1f2937;
  font-size: 1rem;
}

.detail-row {
  margin-bottom: 8px;
  color: #4b5563;
}

.delete-modal-actions {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  gap: 12px;
}

.btn-secondary {
  padding: 8px 16px;
  background: #e5e7eb;
  color: #374151;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn-danger {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
}
</style>
