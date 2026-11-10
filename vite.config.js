import { defineConfig } from 'vite';
export default defineConfig({
  server: { proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } } },
  build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'], react: ['react','react-dom'] } } } }
});
