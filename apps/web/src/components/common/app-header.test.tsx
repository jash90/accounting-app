import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppHeader } from './app-header';

// Mock child components
vi.mock('@/components/notifications/notification-bell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">NotificationBell</div>,
}));

vi.mock('@/components/common/user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
}));

describe('AppHeader', () => {
  it('renders header with default content (NotificationBell + UserMenu)', () => {
    render(<AppHeader />);

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('renders leftContent when provided', () => {
    render(<AppHeader leftContent={<span data-testid="left-content">Left</span>} />);

    expect(screen.getByTestId('left-content')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
  });

  it('renders custom rightContent instead of default elements', () => {
    render(<AppHeader rightContent={<span data-testid="custom-right">Custom Right</span>} />);

    expect(screen.getByTestId('custom-right')).toBeInTheDocument();
    expect(screen.getByText('Custom Right')).toBeInTheDocument();
  });

  it('does not render default elements when rightContent is provided', () => {
    render(<AppHeader rightContent={<span>Custom</span>} />);

    expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
  });

  it('maintains layout structure with correct classes', () => {
    const { container } = render(<AppHeader />);

    const header = container.querySelector('header');
    expect(header).toHaveClass('h-16', 'border-b', 'border-header-border', 'bg-header');

    const flexContainer = header?.querySelector('.flex.h-full.items-center.justify-between');
    expect(flexContainer).toBeInTheDocument();

    const leftDiv = flexContainer?.querySelector('.flex-1');
    expect(leftDiv).toBeInTheDocument();

    const rightDiv = flexContainer?.querySelector('.flex.items-center.gap-3');
    expect(rightDiv).toBeInTheDocument();
  });

  it('has correct ARIA attributes for accessibility', () => {
    render(<AppHeader />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('aria-label', 'Nagłówek aplikacji');
  });

  it('renders both leftContent and rightContent together', () => {
    render(
      <AppHeader
        leftContent={<span data-testid="left">Left</span>}
        rightContent={<span data-testid="right">Right</span>}
      />
    );

    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
  });

  it('renders empty flex-1 div when leftContent is undefined (preserves layout)', () => {
    const { container } = render(<AppHeader />);

    const flexContainer = container.querySelector('.flex.h-full.items-center.justify-between');
    const leftDiv = flexContainer?.querySelector('.flex-1');

    expect(leftDiv).toBeInTheDocument();
    expect(leftDiv?.children.length).toBe(0);
  });
});
