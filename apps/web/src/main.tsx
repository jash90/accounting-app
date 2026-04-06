import './instrument';

import { StrictMode } from 'react';

import * as Sentry from '@sentry/react';
import * as ReactDOM from 'react-dom/client';


import App from './app/app';

import './styles.css';

function renderApp() {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement, {
    onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
      console.warn('Uncaught error', error, errorInfo.componentStack);
    }),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  });

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Only block initial render for MSW when explicitly enabled
// Dynamic import is fully inside the conditional so Vite tree-shakes it in production
if (import.meta.env.VITE_ENABLE_MSW === 'true') {
  import('./lib/api/mocks/browser')
    .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
    .then(renderApp);
} else {
  renderApp();
}
