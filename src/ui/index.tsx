import React from 'react';
import { createRoot } from 'react-dom/client'; // Updated for React 18
import App from './components/App';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);