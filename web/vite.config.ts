import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 乌东文旅 PC 端（C 端）
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7001',
        changeOrigin: true,
      },
    },
  },
});
