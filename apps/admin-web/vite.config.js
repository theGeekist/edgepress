import path from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [
    react(),
    {
      name: 'react-native-web-fix',
      resolveId(source) {
        if (source.includes('Renderer/shims/ReactNativeViewConfigRegistry')) {
          return path.resolve(__dirname, 'src/shims/ReactNativeViewConfigRegistry.js');
        }
        if (source.includes('Renderer/shims/ReactNative')) {
          return path.resolve(__dirname, 'src/shims/ReactNative.js');
        }
        if (source.includes('PressabilityDebug')) {
          return path.resolve(__dirname, 'src/shims/empty.js');
        }
        return null;
      }
    }
  ],
  resolve: {
    dedupe: ['react', 'react-dom', '@wordpress/element'],
    extensions: ['.web.jsx', '.web.js', '.jsx', '.js', '.tsx', '.ts', '.json'],
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: /^react-native\/Libraries\/Renderer\/shims\/ReactNative$/, replacement: path.resolve(__dirname, 'src/shims/ReactNative.js') },
      { find: /^react-native\/Libraries\/Renderer\/shims\/ReactNativeViewConfigRegistry$/, replacement: path.resolve(__dirname, 'src/shims/ReactNativeViewConfigRegistry.js') },
      { find: /^react-native\/Libraries\/Pressability\/PressabilityDebug$/, replacement: path.resolve(__dirname, 'src/shims/empty.js') },
      { find: /^react-native\/Libraries\/(.*)$/, replacement: 'react-native-web/dist/vendor/react-native/$1' },
      { find: /^react$/, replacement: path.resolve(process.cwd(), 'node_modules/react') },
      { find: /^react-dom$/, replacement: path.resolve(process.cwd(), 'node_modules/react-dom') },
      { find: /^react\/jsx-runtime$/, replacement: path.resolve(process.cwd(), 'node_modules/react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(process.cwd(), 'node_modules/react/jsx-dev-runtime.js') },
      { find: /^@wordpress\/element$/, replacement: path.resolve(process.cwd(), 'node_modules/@wordpress/element') },
      { find: /^fs$/, replacement: path.resolve(__dirname, 'src/shims/fs.js') },
      { find: /^path$/, replacement: path.resolve(__dirname, 'src/shims/path.js') },
      { find: /^url$/, replacement: path.resolve(__dirname, 'src/shims/url.js') },
      { find: /^source-map-js$/, replacement: path.resolve(__dirname, 'src/shims/source-map-js.js') },
      { find: /^@hooks\/(.*)$/, replacement: path.resolve(__dirname, 'src/hooks/$1') },
      { find: /^@features\/(.*)$/, replacement: path.resolve(__dirname, 'src/features/$1') },
      { find: /^@components\/(.*)$/, replacement: path.resolve(__dirname, 'src/components/$1') }
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
  },
  optimizeDeps: {
    exclude: [
      'react-native-draggable-flatlist',
      'react-native-reanimated',
      'react-native-gesture-handler'
    ],
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      },
      resolveExtensions: ['.web.js', '.js', '.ts', '.jsx', '.tsx']
    }
  }
});
