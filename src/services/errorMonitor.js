// Error monitoring and notification service
class ErrorMonitoringService {
  constructor() {
    this.discordWebhook = process.env.VUE_APP_DISCORD_WEBHOOK_URL
    this.githubToken = process.env.VUE_APP_GITHUB_TOKEN
    this.githubRepo = process.env.VUE_APP_GITHUB_REPO // format: "owner/repo"
    this.environment = process.env.NODE_ENV
    this.appVersion = process.env.VUE_APP_VERSION || '1.0.0'
    this.instanceId = this.generateInstanceId()
  }

  generateInstanceId() {
    return `${navigator.userAgent.slice(0, 20)}-${Date.now().toString(36)}`
  }

  async reportError(error, context = {}) {
    const errorData = this.formatError(error, context)
    
    try {
      // Send to Discord
      if (this.discordWebhook) {
        await this.sendToDiscord(errorData)
      }

      // Create GitHub issue
      if (this.githubToken && this.githubRepo) {
        await this.createGitHubIssue(errorData)
      }

      // Store locally for offline reporting
      this.storeErrorLocally(errorData)
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
      this.storeErrorLocally({
        ...errorData,
        reportingError: reportingError.message
      })
    }
  }

  formatError(error, context) {
    const timestamp = new Date().toISOString()
    const userAgent = navigator.userAgent
    const url = window.location.href
    
    return {
      timestamp,
      environment: this.environment,
      appVersion: this.appVersion,
      instanceId: this.instanceId,
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack || 'No stack trace available',
        name: error.name || 'Error'
      },
      context: {
        url,
        userAgent,
        component: context.component || 'Unknown',
        action: context.action || 'Unknown',
        userId: context.userId || 'Anonymous',
        additionalData: context.data || {}
      },
      severity: this.calculateSeverity(error, context)
    }
  }

  calculateSeverity(error, context) {
    // Critical: Firebase connection errors, app crashes
    if (error.message?.includes('Firebase') || 
        error.message?.includes('Network') ||
        context.component === 'App') {
      return 'CRITICAL'
    }
    
    // High: Store operations, data corruption
    if (context.component?.includes('Store') || 
        error.message?.includes('inventory') ||
        error.message?.includes('data')) {
      return 'HIGH'
    }
    
    // Medium: UI errors, validation failures
    if (context.component?.includes('View') || 
        error.message?.includes('validation')) {
      return 'MEDIUM'
    }
    
    // Low: Minor UI issues, warnings
    return 'LOW'
  }

  async sendToDiscord(errorData) {
    if (!this.discordWebhook) return

    const embed = {
      title: `🚨 Firework Factory Error - ${errorData.severity}`,
      description: `**${errorData.error.name}**: ${errorData.error.message}`,
      color: this.getSeverityColor(errorData.severity),
      timestamp: errorData.timestamp,
      fields: [
        {
          name: '🌍 Environment',
          value: errorData.environment,
          inline: true
        },
        {
          name: '📱 App Version',
          value: errorData.appVersion,
          inline: true
        },
        {
          name: '🏷️ Instance ID',
          value: errorData.instanceId,
          inline: true
        },
        {
          name: '📍 Location',
          value: `${errorData.context.component} - ${errorData.context.action}`,
          inline: false
        },
        {
          name: '🌐 URL',
          value: errorData.context.url,
          inline: false
        },
        {
          name: '📜 Stack Trace',
          value: `\`\`\`javascript\n${errorData.error.stack.slice(0, 1000)}${errorData.error.stack.length > 1000 ? '...' : ''}\n\`\`\``,
          inline: false
        }
      ],
      footer: {
        text: `Firework Factory Monitor | ${errorData.context.userAgent.slice(0, 50)}`
      }
    }

    const payload = {
      embeds: [embed],
      content: errorData.severity === 'CRITICAL' ? '@here Critical error detected!' : null
    }

    const response = await fetch(this.discordWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`)
    }
  }

  getSeverityColor(severity) {
    const colors = {
      CRITICAL: 0xFF0000, // Red
      HIGH: 0xFF6600,     // Orange
      MEDIUM: 0xFFFF00,   // Yellow
      LOW: 0x0099FF       // Blue
    }
    return colors[severity] || colors.LOW
  }

  async createGitHubIssue(errorData) {
    if (!this.githubToken || !this.githubRepo) return

    const [owner, repo] = this.githubRepo.split('/')
    const issueTitle = `[${errorData.severity}] ${errorData.error.name}: ${errorData.error.message.slice(0, 100)}`
    
    const issueBody = `
## Error Report

**Severity:** ${errorData.severity}
**Timestamp:** ${errorData.timestamp}
**Environment:** ${errorData.environment}
**App Version:** ${errorData.appVersion}
**Instance ID:** ${errorData.instanceId}

### Error Details
- **Type:** ${errorData.error.name}
- **Message:** ${errorData.error.message}
- **Component:** ${errorData.context.component}
- **Action:** ${errorData.context.action}
- **URL:** ${errorData.context.url}

### Stack Trace
\`\`\`javascript
${errorData.error.stack}
\`\`\`

### User Agent
${errorData.context.userAgent}

### Additional Context
\`\`\`json
${JSON.stringify(errorData.context.additionalData, null, 2)}
\`\`\`

---
*Auto-generated by Firework Factory Error Monitor*
    `

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ['bug', 'auto-generated', `severity:${errorData.severity.toLowerCase()}`]
      })
    })

    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status}`)
    }

    return response.json()
  }

  storeErrorLocally(errorData) {
    try {
      const stored = localStorage.getItem('firework-errors') || '[]'
      const errors = JSON.parse(stored)
      errors.push(errorData)
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50)
      }
      
      localStorage.setItem('firework-errors', JSON.stringify(errors))
    } catch (e) {
      console.error('Failed to store error locally:', e)
    }
  }

  getStoredErrors() {
    try {
      const stored = localStorage.getItem('firework-errors') || '[]'
      return JSON.parse(stored)
    } catch (e) {
      return []
    }
  }

  clearStoredErrors() {
    localStorage.removeItem('firework-errors')
  }

  // Retry sending stored errors when connection is restored
  async retryStoredErrors() {
    const errors = this.getStoredErrors()
    let successCount = 0
    
    for (const errorData of errors) {
      try {
        if (this.discordWebhook) {
          await this.sendToDiscord({
            ...errorData,
            isRetry: true
          })
        }
        successCount++
      } catch (e) {
        console.error('Failed to retry error:', e)
        break
      }
    }
    
    if (successCount > 0) {
      this.clearStoredErrors()
    }
    
    return successCount
  }
}

// Global error monitoring instance
const errorMonitor = new ErrorMonitoringService()

// Helper function for manual error reporting
export function reportError(error, context = {}) {
  errorMonitor.reportError(error, context)
}

// Helper function to check monitoring status
export function getMonitoringStatus() {
  return {
    discordEnabled: !!errorMonitor.discordWebhook,
    githubEnabled: !!(errorMonitor.githubToken && errorMonitor.githubRepo),
    storedErrors: errorMonitor.getStoredErrors().length,
    instanceId: errorMonitor.instanceId
  }
}

// Initialize global error monitoring for Vue app
export function initializeErrorMonitoring(app) {
  // Vue global error handler
  app.config.errorHandler = (error, instance, info) => {
    console.error('Vue Error:', error)
    errorMonitor.reportError(error, {
      type: 'vue',
      componentName: instance?.$options.name || 'Unknown',
      errorInfo: info,
      props: instance?.$props,
      route: instance?.$route?.path
    })
  }

  // Global unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason)
    errorMonitor.reportError(new Error(event.reason), {
      type: 'promise-rejection',
      promise: event.promise
    })
  })

  // Global JavaScript error handler
  window.addEventListener('error', (event) => {
    console.error('Global JavaScript Error:', event.error)
    errorMonitor.reportError(event.error || new Error(event.message), {
      type: 'javascript',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  })

  console.log('Error monitoring initialized with status:', getMonitoringStatus())
}

export default errorMonitor
