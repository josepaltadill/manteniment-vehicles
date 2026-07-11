import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Tests run entirely server-side (no client bundle), so `server-only`
  // should be inert here — same as it is under Next.js's own server
  // compilation graph. Alias it to its own no-op export (`empty.js`, the
  // file Next.js resolves to via the `react-server` condition) instead of
  // enabling that condition globally, which would also change how React
  // itself resolves and break every component test.
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    allowOnly: false,
  },
});
