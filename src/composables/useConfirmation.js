import { ref, readonly } from 'vue';

/**
 * A composable for handling confirmation dialogs
 * @returns {Object} Confirmation methods and state
 */
export default function useConfirmation() {
  // State
  const isVisible = ref(false);
  const resolvePromise = ref(null);
  const rejectPromise = ref(null);
  const confirmationConfig = ref({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    messageType: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmButtonType: 'primary'
  });
  
  /**
   * Show a confirmation dialog
   * @param {Object} config - Configuration for the dialog
   * @returns {Promise} Resolves when confirmed, rejects when canceled
   */
  const confirm = (config = {}) => {
    // Update configuration with provided options
    confirmationConfig.value = {
      ...confirmationConfig.value,
      ...config
    };
    
    // Set visibility
    isVisible.value = true;
    
    // Return a promise that will be resolved or rejected based on user action
    return new Promise((resolve, reject) => {
      resolvePromise.value = resolve;
      rejectPromise.value = reject;
    });
  };
  
  /**
   * Handle user confirmation
   */
  const handleConfirm = () => {
    isVisible.value = false;
    if (resolvePromise.value) {
      resolvePromise.value(true);
      resolvePromise.value = null;
      rejectPromise.value = null;
    }
  };
  
  /**
   * Handle user cancellation
   */
  const handleCancel = () => {
    isVisible.value = false;
    if (rejectPromise.value) {
      rejectPromise.value(false);
      resolvePromise.value = null;
      rejectPromise.value = null;
    }
  };
  
  // Return public API
  return {
    isVisible: readonly(isVisible),
    config: readonly(confirmationConfig),
    confirm,
    handleConfirm,
    handleCancel
  };
}
