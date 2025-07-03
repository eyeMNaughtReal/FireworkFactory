<template>
  <div class="pagination-container">
    <button 
      class="pagination-button"
      @click="$emit('update:page', currentPage - 1)" 
      :disabled="currentPage <= 1"
    >
      <span>&laquo; Previous</span>
    </button>
    
    <div class="pagination-info">
      Page {{ currentPage }} of {{ totalPages || 1 }}
      <span class="pagination-details">(Showing {{ rangeStart }}-{{ rangeEnd }} of {{ totalItems }})</span>
    </div>
    
    <button 
      class="pagination-button"
      @click="$emit('update:page', currentPage + 1)" 
      :disabled="currentPage >= totalPages"
    >
      <span>Next &raquo;</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'PagePagination',
  props: {
    currentPage: {
      type: Number,
      required: true
    },
    totalItems: {
      type: Number,
      required: true
    },
    perPage: {
      type: Number,
      default: 10
    }
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.totalItems / this.perPage));
    },
    rangeStart() {
      return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.perPage + 1;
    },
    rangeEnd() {
      return Math.min(this.currentPage * this.perPage, this.totalItems);
    }
  }
}
</script>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.5rem 0;
  padding: 0.8rem 30px;
  background-color: #f9fafb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.pagination-button {
  padding: 0.6rem 1.2rem;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  color: #374151;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.pagination-button:hover:not(:disabled) {
  background-color: #e5e7eb;
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: #4b5563;
}

.pagination-details {
  margin-left: 0.5rem;
  color: #6b7280;
  font-size: 0.75rem;
}
</style>