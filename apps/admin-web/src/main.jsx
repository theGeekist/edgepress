import { createRoot } from 'react-dom/client';

import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/block-library/build-style/style.css';

import { App } from './app/App.jsx';

createRoot(document.getElementById('root')).render(<App />);
