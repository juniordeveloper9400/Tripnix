import { defineConfig } from 'vite';

// In production the admin portal is served under /admin/ on the same origin as
// the Flutter app, so built asset URLs need that prefix. The dev server keeps
// serving from the root at localhost:3005.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
  server: {
    port: 3005,
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
