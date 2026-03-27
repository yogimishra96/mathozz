import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    // External templateUrl/styleUrl: only `ng test` resolves these.
    exclude: ['src/app/app.spec.ts'],
  },
});
