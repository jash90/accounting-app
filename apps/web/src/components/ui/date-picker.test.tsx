import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  it('renders with placeholder when no value', () => {
    const onChange = vi.fn();
    render(<DatePicker value={undefined} onChange={onChange} />);

    expect(screen.getByText('Wybierz datę')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    const onChange = vi.fn();
    render(<DatePicker value={undefined} onChange={onChange} placeholder="Select date" />);

    expect(screen.getByText('Select date')).toBeInTheDocument();
  });

  it('displays formatted date when value is provided', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2024-01-15" onChange={onChange} />);

    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });

  it('does not crash with invalid date value', () => {
    const onChange = vi.fn();
    // This should not throw an error - the fix for safe parsing
    expect(() => {
      render(<DatePicker value="invalid-date" onChange={onChange} />);
    }).not.toThrow();

    // Should fall back to placeholder when date is invalid
    expect(screen.getByText('Wybierz datę')).toBeInTheDocument();
  });

  it('handles empty string value gracefully', () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);

    expect(screen.getByText('Wybierz datę')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2024-01-15" onChange={onChange} disabled />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('opens popover when clicked', () => {
    const onChange = vi.fn();
    render(<DatePicker value={undefined} onChange={onChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Calendar should be visible in popover
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const onChange = vi.fn();
    render(<DatePicker value={undefined} onChange={onChange} className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('handles ISO date strings', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2024-01-15T12:30:00.000Z" onChange={onChange} />);

    // Should display the date portion
    expect(screen.getByText(/15\.\d{2}\.2024/)).toBeInTheDocument();
  });

  it('calls onChange with formatted date when date is selected', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2024-01-01" onChange={onChange} />);

    // Open the calendar
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Find and click on day 15 - the button is inside the gridcell
    const day15Cell = screen.getByRole('gridcell', { name: '15' });
    const day15Button = day15Cell.querySelector('button') || day15Cell;
    fireEvent.click(day15Button);

    // Should call onChange with yyyy-MM-dd format
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-15$/));
  });

  it('displays Polish weekday names in calendar', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2024-01-15" onChange={onChange} />);

    // Open the calendar
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Check for Polish day abbreviations (pon, wt, śr, czw, pt, sob, niedz)
    // DayPicker uses short weekday names from locale
    expect(screen.getByText('pon')).toBeInTheDocument();
  });
});
