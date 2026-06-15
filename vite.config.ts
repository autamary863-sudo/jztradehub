// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
<<<<<<< HEAD
=======
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
>>>>>>> a114dcbce2976d5fa2df1449a65be436e3b40d57

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8083,
<<<<<<< HEAD
    proxy: {
=======
    proxy: mode === 'development' ? {
>>>>>>> a114dcbce2976d5fa2df1449a65be436e3b40d57
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
<<<<<<< HEAD
    }
=======
    } : undefined,
>>>>>>> a114dcbce2976d5fa2df1449a65be436e3b40d57
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
<<<<<<< HEAD
=======
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
>>>>>>> a114dcbce2976d5fa2df1449a65be436e3b40d57
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
<<<<<<< HEAD
}));
=======
}));
>>>>>>> a114dcbce2976d5fa2df1449a65be436e3b40d57
