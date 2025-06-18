import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/',
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api/synergy': {
          target: 'https://vowlfnpbffxzwvnippxt.supabase.co/functions/v1/quick-function',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/synergy/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add the Authorization header to the proxy request
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_SUPABASE_ANON_KEY}`);
            });
          }
        },
      },
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  }
});
