// 進入點：在渲染儀表板之前掛載所有全域 Provider。
import React, { Suspense } from 'react';
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
    <Suspense
      fallback={
        <div className="app-loading" role="status" aria-live="polite">
          Loading SmartCare dashboard…
        </div>
      }
    >
      <ResidentLiveProvider>
        <App />
      </ResidentLiveProvider>
    </Suspense>
  </React.StrictMode>
);
