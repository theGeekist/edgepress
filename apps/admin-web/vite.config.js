import path from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' }
    ]
  },
  server: {
    proxy: {
      '/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/preview': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    },
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  }
});
