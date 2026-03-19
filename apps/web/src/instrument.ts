import { useEffect } from 'react';

import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_SENTRY_RELEASE || undefined,

  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: false,
      blockAllMedia: false,
      networkDetailAllowUrls: [/^\/api\//],
      networkCaptureBodies: true,
      networkRequestHeaders: ['Content-Type', 'Authorization'],
      networkResponseHeaders: ['Content-Type'],
    }),
    Sentry.extraErrorDataIntegration({ depth: 5 }),
    Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
    Sentry.httpClientIntegration({
      failedRequestStatusCodes: [[400, 599]],
      failedRequestTargets: [/^\/api\//],
    }),
    Sentry.contextLinesIntegration(),
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      xhr: true,
    }),
  ],

  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  profilesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

  replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  tracePropagationTargets: [/^\/api\//],

  sendDefaultPii: true,

  attachStacktrace: true,
  maxBreadcrumbs: 100,

  beforeSend(event) {
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
