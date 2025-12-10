import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env.CANISTER_ID_MARKET_TOWN': JSON.stringify(process.env.VITE_CANISTER_ID_MARKET_TOWN || ''),
    'process.env': JSON.stringify({
      CANISTER_ID_MARKET_TOWN: process.env.VITE_CANISTER_ID_MARKET_TOWN || '',
    }),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Ensure all @dfinity packages and @icp-sdk use the same Principal instance
    dedupe: [
      '@dfinity/principal',
      '@dfinity/agent',
      '@dfinity/candid',
      '@icp-sdk/core',
    ],
  },
  optimizeDeps: {
    // Force pre-bundling of @dfinity packages to ensure consistent Principal instances
    include: [
      '@dfinity/principal',
      '@dfinity/agent',
      '@dfinity/candid',
      '@dfinity/identity',
      '@dfinity/auth-client',
      '@dfinity/ledger-icrc',
      '@icp-sdk/core',
    ],
    // Ensure Principal class and its static methods are not tree-shaken
    esbuildOptions: {
      preserveSymlinks: true,
    },
  },
  build: {
    // Enable code splitting to reduce individual chunk sizes
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-dfinity': ['@dfinity/agent', '@dfinity/auth-client', '@dfinity/principal'],
          'vendor-ui': ['@tanstack/react-query', 'sonner', 'next-themes'],
        },
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    host: true, // Allow access from network (for Cursor browser)
    open: false, // Don't auto-open browser
    proxy: {
      '/api': {
        target: 'http://localhost:4943',
        changeOrigin: true,
      },
    },
  },
});

