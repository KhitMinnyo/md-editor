import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Exposed to the app as a compile-time constant — see src/vite-env.d.ts
    // for the type declaration. Used for the "MD Editor vX.Y.Z" branding
    // shown in the toolbar before a file's editor instance is ready.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
