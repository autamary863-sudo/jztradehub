// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8083,
    proxy: mode === 'development' ? {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    } : undefined,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-switch',
      '@radix-ui/react-progress',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@supabase/supabase-js',
      'lucide-react',
      'framer-motion',
      'sonner',
      'react-hook-form',
      'zod',
      '@hookform/resolvers',
      'date-fns',
      'recharts',
      'embla-carousel-react',
      'next-themes',
      '@tanstack/react-query'
    ]
  }
}));
