import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/public/login-page';
import * as useAuthModule from '@/lib/hooks/use-auth';

// Mock the useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockLogin = vi.fn();

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock - not loading, no error
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      login: mockLogin,
      isPending: false,
      error: null,
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  it('renders login form', () => {
    render(<LoginPage />, { wrapper: createWrapper() });
    // UI uses Polish labels
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasło')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zaloguj się/i })).toBeInTheDocument();
  });

  it('accepts email input', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText('Email');

    // Verify email input accepts text
    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');

    // Verify email input has correct type attribute for native validation
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  // Note: Full email validation testing requires handling browser native validation
  // which blocks form submission for type="email" inputs with invalid formats.
  // The Zod validation message 'Nieprawidłowy adres email' would appear after
  // a valid format passes browser validation but fails Zod validation.
  // The password validation test below confirms the Zod validation system works.

  it('validates password field', async () => {
    render(<LoginPage />, { wrapper: createWrapper() });

    const passwordInput = screen.getByLabelText('Hasło');
    const submitButton = screen.getByRole('button', { name: /zaloguj się/i });

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Polish error message from Zod schema: 'Hasło musi mieć co najmniej 12 znaków'
      expect(screen.getByText(/hasło musi mieć co najmniej 12 znaków/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // Loading State Tests
  // ========================================

  describe('loading state', () => {
    it('shows loading spinner when isPending is true', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        login: mockLogin,
        isPending: true,
        error: null,
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Logowanie...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logowanie/i })).toBeDisabled();
    });

    it('disables submit button during loading', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        login: mockLogin,
        isPending: true,
        error: null,
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      const submitButton = screen.getByRole('button', { name: /logowanie/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows default button text when not loading', () => {
      render(<LoginPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /zaloguj się/i })).toBeInTheDocument();
      expect(screen.queryByText('Logowanie...')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // API Error Handling Tests
  // ========================================

  describe('API error handling', () => {
    it('displays API error message from response', () => {
      const apiError = {
        response: {
          data: {
            message: 'Nieprawidłowy email lub hasło',
          },
        },
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        login: mockLogin,
        isPending: false,
        error: apiError,
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Nieprawidłowy email lub hasło')).toBeInTheDocument();
    });

    it('displays error message from error.message when response.data.message is not available', () => {
      const error = new Error('Konto zostało zablokowane');

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        login: mockLogin,
        isPending: false,
        error: error,
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Konto zostało zablokowane')).toBeInTheDocument();
    });

    it('displays generic error message when no specific message is available', () => {
      const genericError = {};

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        login: mockLogin,
        isPending: false,
        error: genericError,
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Nieprawidłowe dane logowania. Spróbuj ponownie.')).toBeInTheDocument();
    });
  });

  // ========================================
  // Network Error Tests
  // ========================================

  describe('network error handling', () => {
    it('handles network error gracefully', () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        login: mockLogin,
        isPending: false,
        error: networkError,
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });

    it('handles timeout error', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        login: mockLogin,
        isPending: false,
        error: timeoutError,
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('timeout of 10000ms exceeded')).toBeInTheDocument();
    });

    it('handles server unavailable error (503)', () => {
      const serverError = {
        response: {
          status: 503,
          data: {
            message: 'Serwer tymczasowo niedostępny',
          },
        },
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        login: mockLogin,
        isPending: false,
        error: serverError,
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
        refreshSession: vi.fn(),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Serwer tymczasowo niedostępny')).toBeInTheDocument();
    });
  });

  // ========================================
  // Form Submission Tests
  // ========================================

  describe('form submission', () => {
    it('calls login function with form data on valid submission', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Hasło');
      const submitButton = screen.getByRole('button', { name: /zaloguj się/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        });
      });
    });

    it('does not call login when form validation fails', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { wrapper: createWrapper() });

      const passwordInput = screen.getByLabelText('Hasło');
      const submitButton = screen.getByRole('button', { name: /zaloguj się/i });

      // Only fill password with invalid value (too short)
      await user.type(passwordInput, 'short');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hasło musi mieć co najmniej 12 znaków/i)).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });
});

