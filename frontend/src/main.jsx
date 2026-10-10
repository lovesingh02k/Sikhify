import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { settleScrollRestoration } from './app/navigation.js';
import { installChunkReload } from './app/chunkReload.js';
import './index.css';

settleScrollRestoration();

// The saved theme is applied by an inline script in index.html, before first paint.
installChunkReload();

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
