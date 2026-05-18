// 進入點：在渲染儀表板之前掛載所有全域 Provider。
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './i18n';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ResidentLiveProvider } from './shared/resident-live-store';

async function unregisterLegacyServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

void unregisterLegacyServiceWorkers();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container (#root) is missing in index.html');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
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
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
