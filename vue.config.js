const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    host: 'localhost',
    port: 8080,
    // Disabling host check can help with WebSocket connection issues
    // when accessing the development server from other devices
    disableHostCheck: true,
    // Use allowedHosts: 'all' for Vue CLI 5
    allowedHosts: 'all'
  }
})
