// 進入點：在渲染儀表板之前掛載所有全域 Provider。
import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import App from './App';
import { ResidentLiveProvider } from './shared/resident-live-store';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container (#root) is missing in index.html');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ResidentLiveProvider>
      <App />
    </ResidentLiveProvider>
  </React.StrictMode>
);
