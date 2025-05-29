export default {
  server: {
      open: true,
      proxy: {
        '/api': 'http://localhost:8080'
      }
    }
  }