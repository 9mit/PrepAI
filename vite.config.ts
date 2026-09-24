import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/auth': { target: 'http://localhost:7860', changeOrigin: true },
        '/session': { target: 'http://localhost:7860', changeOrigin: true },
        '/interview': { target: 'http://localhost:7860', changeOrigin: true },
        '/quiz': { target: 'http://localhost:7860', changeOrigin: true },
        '/feedback': { target: 'http://localhost:7860', changeOrigin: true },
        '/health': { target: 'http://localhost:7860', changeOrigin: true },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
