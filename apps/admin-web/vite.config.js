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
      { find: /^@wp-styles\/edit-post$/, replacement: path.resolve(process.cwd(), 'node_modules/@wordpress/edit-post/build-style/style.css') },
      { find: /^@wp-styles\/editor$/, replacement: path.resolve(process.cwd(), 'node_modules/@wordpress/editor/build-style/style.css') },
      { find: /^@wp-styles\/block-editor$/, replacement: path.resolve(process.cwd(), 'node_modules/@wordpress/block-editor/build-style/style.css') },
      { find: /^@wp-styles\/components$/, replacement: path.resolve(process.cwd(), 'node_modules/@wordpress/components/build-style/style.css') },
      { find: /^@wp-styles\/interface$/, replacement: path.resolve(process.cwd(), 'node_modules/@wordpress/interface/build-style/style.css') },
      { find: /^@hooks\/(.*)$/, replacement: path.resolve(__dirname, 'src/hooks/$1') },
      { find: /^@features\/(.*)$/, replacement: path.resolve(__dirname, 'src/features/$1') },
      { find: /^@components\/(.*)$/, replacement: path.resolve(__dirname, 'src/components/$1') },
      { find: /^@geekist\/edgepress\/domain$/, replacement: path.resolve(process.cwd(), 'packages/domain/src') },
      { find: /^@geekist\/edgepress\/domain\/(.*)$/, replacement: path.resolve(process.cwd(), 'packages/domain/src/$1') },
      { find: /^@geekist\/edgepress\/contracts$/, replacement: path.resolve(process.cwd(), 'packages/contracts/src') },
      { find: /^@geekist\/edgepress\/contracts\/(.*)$/, replacement: path.resolve(process.cwd(), 'packages/contracts/src/$1') },
      { find: /^@geekist\/edgepress\/ports$/, replacement: path.resolve(process.cwd(), 'packages/ports/src') },
      { find: /^@geekist\/edgepress\/ports\/(.*)$/, replacement: path.resolve(process.cwd(), 'packages/ports/src/$1') },
      { find: /^@geekist\/edgepress\/hooks$/, replacement: path.resolve(process.cwd(), 'packages/hooks/src') },
      { find: /^@geekist\/edgepress\/hooks\/(.*)$/, replacement: path.resolve(process.cwd(), 'packages/hooks/src/$1') },
      { find: /^@geekist\/edgepress\/publish$/, replacement: path.resolve(process.cwd(), 'packages/publish/src') },
      { find: /^@geekist\/edgepress\/publish\/(.*)$/, replacement: path.resolve(process.cwd(), 'packages/publish/src/$1') },
      { find: /^@geekist\/edgepress\/sdk$/, replacement: path.resolve(process.cwd(), 'packages/sdk/src') },
      { find: /^@geekist\/edgepress\/sdk\/(.*)$/, replacement: path.resolve(process.cwd(), 'packages/sdk/src/$1') }
    ]
  },
  server: {
    proxy: {
      '/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/wp': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/blob': {
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
