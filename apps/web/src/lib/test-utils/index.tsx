import { type ReactElement, type ReactNode } from 'react';

import { BrowserRouter } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * Creates a new QueryClient configured for testing.
 * Disables retries and logging to avoid noise in test output.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Props for the test wrapper component.
 */
interface AllTheProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component that provides all necessary context providers for testing.
 */
function AllTheProviders({ children, queryClient }: AllTheProvidersProps) {
  const client = queryClient ?? createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render options that extend @testing-library/react's RenderOptions.
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with all necessary providers.
 * Use this instead of @testing-library/react's render in tests.
 *
 * @param ui - The React element to render
 * @param options - Custom render options including optional queryClient
 * @returns The render result from @testing-library/react
 *
 * @example
 * ```tsx
 * import { renderWithProviders, screen } from '@/lib/test-utils';
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  { queryClient, ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override the render function with our custom one
export { renderWithProviders as render };
