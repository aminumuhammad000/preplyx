import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@reduxjs/toolkit': path.resolve(import.meta.dirname, './node_modules/@reduxjs/toolkit/dist/redux-toolkit.legacy-esm.js'),
    }
  },
  server: {
    port: 3000
  }
});
