import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so the Tauri dev/build pipeline is untouched.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
