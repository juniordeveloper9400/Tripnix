import { defineConfig } from 'vite';

// Served under /owner/ in production, alongside /admin/ and the Flutter app,
// so built asset URLs need that prefix. The dev server keeps the root, on a
// different port from the admin portal so both can run at once.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/owner/' : '/',
  server: {
    port: 3006,
    // The fleet map is imported from ../shared, outside this app's root, and
    // the dev server refuses to serve files above it unless told to.
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
}));
