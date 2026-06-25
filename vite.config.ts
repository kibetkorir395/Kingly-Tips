export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Add redirects for SPA
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Your existing config
        }
      }
    },
    plugins: [
      {
        name: 'redirects',
        apply: 'build',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: '_redirects',
            source: '/* /index.html 200\n',
          });
        },
      },
    ],
  },
});
