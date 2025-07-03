import { ref } from 'vue'

/**
 * A reusable composable for managing deletion confirmation modals
 */
export function useDeleteConfirmation() {
  // Modal state
  const showDeleteModal = ref(false)
  const itemToDelete = ref(null)
  const deleteType = ref('')

  /**
   * Show the delete confirmation modal
   * @param {Object} item - The item to delete
   * @param {string} type - Type of item being deleted (for display purposes)
   */
  const confirmDelete = (item, type = '') => {
    itemToDelete.value = item
    deleteType.value = type
    showDeleteModal.value = true
  }

  /**
   * Close the delete confirmation modal without deleting
   */
  const cancelDelete = () => {
    showDeleteModal.value = false
    itemToDelete.value = null
    deleteType.value = ''
  }

  /**
   * Handle the modal confirmation
   * @param {Function} onDelete - Callback function to execute when deletion is confirmed
   */
  const handleDelete = async (onDelete) => {
    try {
      await onDelete(itemToDelete.value)
      showDeleteModal.value = false
      itemToDelete.value = null
      deleteType.value = ''
    } catch (error) {
      console.error('Delete operation failed:', error)
      throw error
    }
  }

  return {
    showDeleteModal,
    itemToDelete,
    deleteType,
    confirmDelete,
    cancelDelete,
    handleDelete
  }
}

export default useDeleteConfirmation
