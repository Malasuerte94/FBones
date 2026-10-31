import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [vue(), tailwind()],
  server: { host: '127.0.0.1', port: 1420, strictPort: true },
  clearScreen: false,
  build: { target: 'es2022' },
});
