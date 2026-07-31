import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Only @supabase/supabase-js gets its own named chunk: it's used
        // eagerly everywhere (session check on load) so there's no lazy
        // slice of it to preserve, and it changes far less often than app
        // code, so keeping it separate helps it stay cached across deploys.
        // radix-ui is deliberately NOT force-chunked — Button/Badge/Avatar
        // pull small eager pieces from it while Select/DropdownMenu pull
        // lazy ones; grouping the whole package by name would drag the
        // lazy pieces into the eager path. Rollup's automatic splitting
        // (based on actual per-file reachability) handles that split
        // correctly on its own.
        manualChunks(id) {
          if (id.includes('@supabase/supabase-js')) return 'supabase'
        },
      },
    },
  },
})
