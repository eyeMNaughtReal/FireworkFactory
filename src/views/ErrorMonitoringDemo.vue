<template>
  <div class="error-monitoring-demo">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Error Monitoring Demo</h1>
      
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              <strong>Warning:</strong> This page is for testing error monitoring. Only use in development!
            </p>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Error Types</h2>
          <div class="space-y-3">
            <button
              @click="triggerVueError"
              class="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Trigger Vue Component Error
            </button>
            
            <button
              @click="triggerJavaScriptError"
              class="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Trigger JavaScript Error
            </button>
            
            <button
              @click="triggerPromiseRejection"
              class="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Trigger Promise Rejection
            </button>
            
            <button
              @click="triggerNetworkError"
              class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Trigger Network Error
            </button>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Monitoring Status</h2>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Discord Webhook:</span>
              <span :class="monitoringStatus.discordEnabled ? 'text-green-600' : 'text-red-600'">
                {{ monitoringStatus.discordEnabled ? '✓ Enabled' : '✗ Disabled' }}
              </span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-gray-600">GitHub Issues:</span>
              <span :class="monitoringStatus.githubEnabled ? 'text-green-600' : 'text-red-600'">
                {{ monitoringStatus.githubEnabled ? '✓ Enabled' : '✗ Disabled' }}
              </span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Stored Errors:</span>
              <span class="text-blue-600">{{ monitoringStatus.storedErrors }}</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Instance ID:</span>
              <span class="text-gray-500 text-sm">{{ monitoringStatus.instanceId?.slice(0, 20) }}...</span>
            </div>
          </div>
          
          <div class="mt-4 pt-4 border-t">
            <button
              @click="refreshStatus"
              class="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Configuration Guide</h2>
        <div class="prose text-gray-600">
          <p class="mb-3">To enable error monitoring:</p>
          <ol class="list-decimal list-inside space-y-2">
            <li>Copy <code>.env.example</code> to <code>.env.local</code></li>
            <li>Set up a Discord webhook URL</li>
            <li>Generate a GitHub personal access token</li>
            <li>Configure your GitHub repository name</li>
            <li>Restart the development server</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { getMonitoringStatus } from '../services/errorMonitor'

export default {
  name: 'ErrorMonitoringDemo',
  setup() {
    const monitoringStatus = ref({
      discordEnabled: false,
      githubEnabled: false,
      storedErrors: 0,
      instanceId: ''
    })

    const refreshStatus = () => {
      monitoringStatus.value = getMonitoringStatus()
    }

    const triggerVueError = () => {
      // This will trigger Vue's error handler
      throw new Error('Test Vue component error - this is intentional for testing error monitoring')
    }

    const triggerJavaScriptError = () => {
      // This will trigger the global error handler
      setTimeout(() => {
        throw new Error('Test JavaScript error - this is intentional for testing error monitoring')
      }, 100)
    }

    const triggerPromiseRejection = () => {
      // This will trigger the unhandled promise rejection handler
      Promise.reject(new Error('Test promise rejection - this is intentional for testing error monitoring'))
    }

    const triggerNetworkError = async () => {
      try {
        await fetch('https://nonexistent.invalid.url/api/test')
      } catch (error) {
        throw new Error(`Network error test: ${error.message}`)
      }
    }

    onMounted(() => {
      refreshStatus()
    })

    return {
      monitoringStatus,
      refreshStatus,
      triggerVueError,
      triggerJavaScriptError,
      triggerPromiseRejection,
      triggerNetworkError
    }
  }
}
</script>

<style scoped>
code {
  background-color: #f3f4f6;
  color: #1f2937;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.prose ol {
  padding-left: 1rem;
}
</style>
