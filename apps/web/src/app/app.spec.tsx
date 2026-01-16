import { render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    // App component already contains BrowserRouter, no need to wrap
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should mount without errors', () => {
    // App component already contains BrowserRouter, no need to wrap
    // App uses lazy loading with Suspense, so it will show a loading skeleton initially
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });
});
