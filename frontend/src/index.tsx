import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource/big-shoulders-display/700';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/public-sans/400';
import '@fontsource/public-sans/500';
import '@fontsource/public-sans/600';
import '@fontsource/courier-prime/400';
import '@fontsource/courier-prime/700';
import './index.css';

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
