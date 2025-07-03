const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    host: 'localhost',
    port: 8080,
    // Allow connections from any host
    allowedHosts: 'all',
    // For WebSocket connections
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws'
    }
  }
})
