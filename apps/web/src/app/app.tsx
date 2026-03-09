import { lazy, Suspense } from 'react';

import { BrowserRouter } from 'react-router-dom';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';

import { ErrorBoundary } from '@/components/common/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/auth-context';
import { NavigationProvider } from '@/contexts/navigation-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { queryClient } from '@/lib/api/query-client';
import { NotificationSocketProvider } from '@/lib/contexts/notification-socket-context';


import Routes from './routes';

// Lazy-load ReactQueryDevtools to avoid ~40KB bundle impact in production
// Only loaded when VITE_ENABLE_QUERY_DEVTOOLS is set to 'true'
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  }))
);

function App() {
  const enableDevtools = import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true';

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BrowserRouter>
              <AuthProvider>
                <NotificationSocketProvider>
                  <NavigationProvider>
                    <Routes />
                    <Toaster />
                    <SonnerToaster position="top-right" />
                  </NavigationProvider>
                </NotificationSocketProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>

          {enableDevtools && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          )}
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
