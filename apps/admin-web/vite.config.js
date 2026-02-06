import path from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@wordpress/element'],
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: /^react$/, replacement: path.resolve(process.cwd(), 'node_modules/react') },
      { find: /^react-dom$/, replacement: path.resolve(process.cwd(), 'node_modules/react-dom') },
      { find: /^react\/jsx-runtime$/, replacement: path.resolve(process.cwd(), 'node_modules/react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(process.cwd(), 'node_modules/react/jsx-dev-runtime.js') },
      { find: /^@wordpress\/element$/, replacement: path.resolve(process.cwd(), 'node_modules/@wordpress/element') },
      { find: /^fs$/, replacement: path.resolve(__dirname, 'src/shims/fs.js') },
      { find: /^path$/, replacement: path.resolve(__dirname, 'src/shims/path.js') },
      { find: /^url$/, replacement: path.resolve(__dirname, 'src/shims/url.js') },
      { find: /^source-map-js$/, replacement: path.resolve(__dirname, 'src/shims/source-map-js.js') }
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
