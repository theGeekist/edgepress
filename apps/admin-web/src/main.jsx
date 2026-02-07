import { createRoot } from '@wordpress/element';

import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/block-library/build-style/style.css';
import '@wordpress/block-library/build-style/editor.css';
import '@wordpress/block-library/build-style/theme.css';

import './admin-transitions.css';

import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
