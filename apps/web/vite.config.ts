/// <reference types='vitest' />
import path from 'path';

import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
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
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    react(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_WEB,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/apps/web/**/*.map'],
      },
    }),
  ],

  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: '@accounting/common/browser',
        replacement: path.resolve(__dirname, '../../libs/common/src/browser.ts'),
      },
      // Replace date-fns/locale barrel (pulls in ~100 locales) with a shim
      // that only exports locales used by this app (enUS + pl).
      // Must use regex to avoid matching date-fns/locale/pl etc.
      {
        find: /^date-fns\/locale$/,
        replacement: path.resolve(__dirname, './src/lib/vendor-shims/date-fns-locale.ts'),
      },
    ],
  },

  // Dependency optimization configuration
  optimizeDeps: {
    // Pre-bundle large packages to reduce cold start time by 200-800ms
    // lucide-react: 1,583 modules → pre-bundled
    // @radix-ui packages: Each has 10-20 internal modules, used heavily in shadcn/ui
    include: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-radio-group',
    ],
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
    sourcemap: true,
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
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('@tiptap')) return 'vendor-editor';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/'))
            return 'vendor-forms';
          if (id.includes('date-fns') || id.includes('react-day-picker')) return 'vendor-date';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('socket.io-client')) return 'vendor-realtime';
          return 'vendor-misc';
        },
      },
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
