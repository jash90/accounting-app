import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * Keys that trigger automatic reset when changed.
   * Typically used with location.pathname to reset on navigation.
   */
  resetKeys?: unknown[];
  /**
   * Callback fired when error boundary resets (manual or automatic).
   */
  onReset?: () => void;
  /**
   * Callback fired when an error is caught.
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Send to error tracking in production
    if (import.meta.env.PROD) {
      // Sentry.captureException(error, { extra: errorInfo });
    }

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: Props) {
    // Auto-reset when resetKeys change (e.g., when navigating to a different route)
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={this.resetErrorBoundary}>Try Again</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
