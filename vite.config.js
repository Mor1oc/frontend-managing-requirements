import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API calls to Go backend during development
    // Allows использовать относительные URL вместо абсолютных
    proxy: {
      '/auth':      { target: 'http://localhost:8080', changeOrigin: true },
      '/user':      { target: 'http://localhost:8080', changeOrigin: true },
      '/project':   { target: 'http://localhost:8080', changeOrigin: true },
      '/requment':  { target: 'http://localhost:8080', changeOrigin: true },
      '/aproval':   { target: 'http://localhost:8080', changeOrigin: true },
      '/ecr':       { target: 'http://localhost:8080', changeOrigin: true },
      '/eco':       { target: 'http://localhost:8080', changeOrigin: true },
      '/document':  { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
});
