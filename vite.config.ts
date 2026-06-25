// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // ✅ Correct way to add redirects - use the vite hook properly
  vite: {
    build: {
      rollupOptions: {
        // Keep any existing config here
      }
    },
    // ✅ Add redirects as a custom plugin in the correct format
    plugins: [
      {
        name: 'redirects',
        apply: 'build',
        // @ts-ignore - This is a valid Vite/Rollup hook
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
