import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      'lottie-web': 'lottie-web/build/player/lottie_light.js',
    },
  },
  plugins: [
    react(),
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // sunburst, treemap, network
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3, 
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
      },
      mangle: {
        safari10: true,
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    cssCodeSplit: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress "use client" warnings from Framer Motion and other libraries
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
          return;
        }
        warn(warning);
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        authLogin: resolve(__dirname, 'authentication/index.html'),
        signup: resolve(__dirname, 'authentication/signup.html'),
        forgotPassword: resolve(__dirname, 'authentication/forgot-password.html'),
        otp: resolve(__dirname, 'authentication/otp.html'),
        dashboard: resolve(__dirname, 'frontend/index.html'),
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Lottie animations (heavy) - check this first to avoid 'react' match in 'lottie-react'
            if (id.includes('lottie')) {
              return 'vendor-lottie';
            }

            // Core React dependencies
            if (
              id.includes('/node_modules/react/') || 
              id.includes('/node_modules/react-dom/') || 
              id.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            
            // Separate heavy animation and icon libraries
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            
            // Other utilities
            return 'vendor-utils';
          }
          
          // Separate heavy dashboard modules
          if (id.includes('frontend/')) {
            if (id.includes('AttendanceReports')) return 'module-reports';
            if (id.includes('MembershipPlans')) return 'module-membership';
            if (id.includes('FreezePause')) return 'module-freeze';
            if (id.includes('PendingDues')) return 'module-payments-dues';
            if (id.includes('PaymentHistory')) return 'module-payments-history';
            if (id.includes('GenerateReceipt')) return 'module-payments-receipt';
            if (id.includes('RenewMembership')) return 'module-payments-renew';
          }
        },
      },
    },
    target: ['es2021', 'chrome97', 'safari13'], 
    cssMinify: 'esbuild',
    assetsInlineLimit: 4096, 
  },
  server: {
    port: 3000,
    open: '/',
    strictPort: true,
  },
  // Pre-bundle heavy dependencies for faster dev startup
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
    exclude: [],
  },
});
