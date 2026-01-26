import { BrowserRouter } from 'react-router-dom';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster as SonnerToaster } from 'sonner';

import { ErrorBoundary } from '@/components/common/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { NavigationProvider } from '@/contexts/navigation-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { queryClient } from '@/lib/api/query-client';
import { NotificationSocketProvider } from '@/lib/contexts/notification-socket-context';


import Routes from './routes';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
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

          {import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
