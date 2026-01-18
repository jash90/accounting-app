import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@/lib/api/query-client';
import { AuthProvider } from '@/contexts/auth-context';
import { NavigationProvider } from '@/contexts/navigation-context';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { ErrorBoundary } from '@/components/common/error-boundary';
import Routes from './routes';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <NavigationProvider>
              <Routes />
              <Toaster />
              <SonnerToaster position="top-right" />
            </NavigationProvider>
          </AuthProvider>
        </BrowserRouter>

        {import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
