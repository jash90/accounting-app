import { useForm } from 'react-hook-form';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Form } from '@/components/ui/form';

import { DateFormField, SelectFormField } from './shared-form-fields';

// Test wrapper component for form fields
function FormWrapper({
  children,
  defaultValues = {},
}: {
  children: (form: ReturnType<typeof useForm>) => React.ReactNode;
  defaultValues?: Record<string, unknown>;
}) {
  const form = useForm({ defaultValues });
  return <Form {...form}>{children(form)}</Form>;
}

describe('SelectFormField', () => {
  it('renders with label', () => {
    render(
      <FormWrapper defaultValues={{ status: '' }}>
        {(form) => (
          <SelectFormField
            control={form.control}
            name="status"
            label="Status"
            options={{ active: 'Aktywny', inactive: 'Nieaktywny' }}
          />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <FormWrapper defaultValues={{ status: '' }}>
        {(form) => (
          <SelectFormField
            control={form.control}
            name="status"
            label="Status"
            options={{ active: 'Aktywny' }}
            required
          />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('Status *')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <FormWrapper defaultValues={{ status: '' }}>
        {(form) => (
          <SelectFormField
            control={form.control}
            name="status"
            label="Status"
            options={{ active: 'Aktywny' }}
            placeholder="Choose status"
          />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('Choose status')).toBeInTheDocument();
  });
});

describe('DateFormField', () => {
  it('renders with label', () => {
    render(
      <FormWrapper defaultValues={{ date: undefined }}>
        {(form) => <DateFormField control={form.control} name="date" label="Date" />}
      </FormWrapper>
    );

    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <FormWrapper defaultValues={{ date: undefined }}>
        {(form) => <DateFormField control={form.control} name="date" label="Date" required />}
      </FormWrapper>
    );

    expect(screen.getByText('Date *')).toBeInTheDocument();
  });

  it('displays date when value is a Date object', () => {
    // Create date at noon UTC to avoid timezone edge cases
    const testDate = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    render(
      <FormWrapper defaultValues={{ date: testDate }}>
        {(form) => <DateFormField control={form.control} name="date" label="Date" />}
      </FormWrapper>
    );

    // The formatDateValue helper should convert Date to string
    // Match any valid date format (dd.MM.yyyy) to handle timezone variations
    expect(screen.getByText(/^\d{2}\.\d{2}\.2024$/)).toBeInTheDocument();
  });

  it('displays date when value is a string', () => {
    render(
      <FormWrapper defaultValues={{ date: '2024-01-15' }}>
        {(form) => <DateFormField control={form.control} name="date" label="Date" />}
      </FormWrapper>
    );

    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });

  it('shows placeholder when no value', () => {
    render(
      <FormWrapper defaultValues={{ date: undefined }}>
        {(form) => <DateFormField control={form.control} name="date" label="Date" />}
      </FormWrapper>
    );

    expect(screen.getByText('Wybierz datę')).toBeInTheDocument();
  });
});
