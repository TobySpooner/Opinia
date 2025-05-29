export default {
  server: {
    open: true,
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
}