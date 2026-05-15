import { defineConfig } from 'vitest/config';

// Vitest config for the mobile app. Tests cover pure TS modules only — we
// deliberately keep this in the `node` environment and exclude any `.tsx`
// files so nothing transitively pulls in `react-native`.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', '**/*.tsx'],
    passWithNoTests: false,
  },
});
