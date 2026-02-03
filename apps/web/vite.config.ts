/// <reference types='vitest' />
import path from 'path';

import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/web',

  server: {
    port: 4200,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@accounting/common/browser': path.resolve(__dirname, '../../libs/common/src/browser.ts'),
    },
  },

  // Exclude backend-specific packages from dependency optimization
  optimizeDeps: {
    exclude: [
      '@nestjs/mapped-types',
      'class-transformer',
      'class-validator',
      'typeorm',
      '@nestjs/common',
      '@nestjs/core',
    ],
  },

  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [
        '@nestjs/mapped-types',
        'class-transformer/storage',
        'class-transformer',
        'typeorm',
        '@nestjs/common',
        '@nestjs/core',
      ],
    },
  },

  test: {
    name: 'web',
    watch: false,
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/web',
      provider: 'v8' as const,
    },
    setupFiles: ['./src/test-setup.ts'], // Test setup with MSW
  },
});
