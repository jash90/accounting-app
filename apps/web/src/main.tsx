import './instrument';

import { StrictMode } from 'react';

import * as Sentry from '@sentry/react';
import * as ReactDOM from 'react-dom/client';


import App from './app/app';

import './styles.css';

async function enableMocking() {
  const { worker } = await import('./lib/api/mocks/browser');

  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

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
// This prevents 100-500ms delay in production where MSW is disabled
const shouldEnableMocking = import.meta.env.VITE_ENABLE_MSW === 'true';

if (shouldEnableMocking) {
  enableMocking().then(renderApp);
} else {
  renderApp();
}
