import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import {
  GroupedCombobox,
  type GroupedComboboxOption,
  type GroupedComboboxGroup,
} from './grouped-combobox';

// Mock ResizeObserver for Radix UI ScrollArea component
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
});

afterAll(() => {
  // @ts-expect-error - cleanup mock
  delete global.ResizeObserver;
});

// Test data
const mockGroups: GroupedComboboxGroup[] = [
  { key: 'A', label: 'Section A - Agriculture' },
  { key: 'B', label: 'Section B - Mining' },
  { key: 'C', label: 'Section C - Manufacturing' },
];

const mockOptions: GroupedComboboxOption[] = [
  { value: '01.11.Z', label: '01.11.Z - Grain cultivation', group: 'A' },
  { value: '01.12.Z', label: '01.12.Z - Rice cultivation', group: 'A' },
  { value: '05.10.Z', label: '05.10.Z - Coal mining', group: 'B' },
  { value: '05.20.Z', label: '05.20.Z - Lignite mining', group: 'B' },
  { value: '10.11.Z', label: '10.11.Z - Meat processing', group: 'C' },
  { value: '10.12.Z', label: '10.12.Z - Poultry processing', group: 'C' },
];

describe('GroupedCombobox', () => {
  describe('Rendering', () => {
    it('renders with placeholder when no value is selected', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
          placeholder="Select an option..."
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Select an option...')).toBeInTheDocument();
    });

    it('renders selected option label when value is set', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      expect(screen.getByText('01.11.Z - Grain cultivation')).toBeInTheDocument();
    });

    it('renders with custom formatDisplayValue', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
          formatDisplayValue={(option) => `Code: ${option.value}`}
        />
      );

      expect(screen.getByText('Code: 01.11.Z')).toBeInTheDocument();
    });

    it('renders groups and options when opened', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      // Check groups are rendered
      expect(screen.getByText('Section A - Agriculture')).toBeInTheDocument();
      expect(screen.getByText('Section B - Mining')).toBeInTheDocument();
      expect(screen.getByText('Section C - Manufacturing')).toBeInTheDocument();

      // Check options are rendered (label without code prefix displayed)
      expect(screen.getByText('Grain cultivation')).toBeInTheDocument();
      expect(screen.getByText('Coal mining')).toBeInTheDocument();
    });

    it('renders clear button when value is selected', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText('Wyczyść wybór')).toBeInTheDocument();
    });

    it('does not render clear button when no value is selected', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      expect(screen.queryByLabelText('Wyczyść wybór')).not.toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onChange with selected value when option is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Grain cultivation'));

      expect(onChange).toHaveBeenCalledWith('01.11.Z');
    });

    it('calls onChange with null when clicking already selected option (toggle)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Grain cultivation'));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('closes popover after selection', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      expect(screen.getByText('Section A - Agriculture')).toBeInTheDocument();

      await user.click(screen.getByText('Grain cultivation'));

      // Popover should be closed - groups should not be visible
      expect(screen.queryByText('Section A - Agriculture')).not.toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('calls onChange with null when clear button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      await user.click(screen.getByLabelText('Wyczyść wybór'));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('clear button click does not open the popover', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      await user.click(screen.getByLabelText('Wyczyść wybór'));

      // Popover should not open
      expect(screen.queryByText('Section A - Agriculture')).not.toBeInTheDocument();
    });

    it('clear button works with keyboard (Enter key)', async () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      const clearButton = screen.getByLabelText('Wyczyść wybór');
      clearButton.focus();
      fireEvent.keyDown(clearButton, { key: 'Enter' });

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('clear button works with keyboard (Space key)', async () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      const clearButton = screen.getByLabelText('Wyczyść wybór');
      clearButton.focus();
      fireEvent.keyDown(clearButton, { key: ' ' });

      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Search/Filter', () => {
    it('filters options based on search input', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
          searchPlaceholder="Search..."
        />
      );

      await user.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText('Search...');

      await user.type(searchInput, 'grain');

      // Only matching option should be visible
      expect(screen.getByText('Grain cultivation')).toBeInTheDocument();
      expect(screen.queryByText('Rice cultivation')).not.toBeInTheDocument();
      expect(screen.queryByText('Coal mining')).not.toBeInTheDocument();
    });

    it('filters are case-insensitive', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText('Szukaj...');

      await user.type(searchInput, 'GRAIN');

      expect(screen.getByText('Grain cultivation')).toBeInTheDocument();
    });

    it('shows empty state when no results match', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
          emptyText="No results found"
        />
      );

      await user.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText('Szukaj...');

      await user.type(searchInput, 'xyz');

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('hides groups with no matching options', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText('Szukaj...');

      await user.type(searchInput, 'grain');

      // Only Section A should be visible
      expect(screen.getByText('Section A - Agriculture')).toBeInTheDocument();
      expect(screen.queryByText('Section B - Mining')).not.toBeInTheDocument();
      expect(screen.queryByText('Section C - Manufacturing')).not.toBeInTheDocument();
    });

    it('clears search when selection is made', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText('Szukaj...');

      await user.type(searchInput, 'grain');
      await user.click(screen.getByText('Grain cultivation'));

      // Reopen and check search is cleared
      await user.click(screen.getByRole('combobox'));
      const newSearchInput = screen.getByPlaceholderText('Szukaj...');

      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates down with ArrowDown', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText('Szukaj...');

      await user.keyboard('{ArrowDown}');

      // First option should be highlighted
      const firstOption = screen.getByText('Grain cultivation').closest('button');
      expect(firstOption).toHaveClass('bg-accent');
    });

    it('navigates up with ArrowUp', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      // ArrowUp from start goes to last item
      await user.keyboard('{ArrowUp}');

      // Last option should be highlighted
      const lastOption = screen.getByText('Poultry processing').closest('button');
      expect(lastOption).toHaveClass('bg-accent');
    });

    it('wraps navigation from last to first', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      // Use only 2 options for easier testing
      const smallOptions = mockOptions.slice(0, 2);
      render(
        <GroupedCombobox
          options={smallOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      // Navigate down twice to highlight second item
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // Navigate down again should wrap to first
      await user.keyboard('{ArrowDown}');

      const firstOption = screen.getByText('Grain cultivation').closest('button');
      expect(firstOption).toHaveClass('bg-accent');
    });

    it('wraps navigation from first to last', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const smallOptions = mockOptions.slice(0, 2);
      render(
        <GroupedCombobox
          options={smallOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      // Navigate down once to highlight first item
      await user.keyboard('{ArrowDown}');

      // Navigate up should wrap to last
      await user.keyboard('{ArrowUp}');

      const lastOption = screen.getByText('Rice cultivation').closest('button');
      expect(lastOption).toHaveClass('bg-accent');
    });

    it('selects highlighted option with Enter', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith('01.11.Z');
    });

    it('closes popover with Escape', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      expect(screen.getByText('Section A - Agriculture')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByText('Section A - Agriculture')).not.toBeInTheDocument();
    });

    it('resets highlighted index when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Escape}');

      // Reopen
      await user.click(screen.getByRole('combobox'));

      // First item should not be highlighted since index was reset
      const firstOption = screen.getByText('Grain cultivation').closest('button');
      expect(firstOption).not.toHaveClass('bg-accent');
    });
  });

  describe('Disabled State', () => {
    it('renders disabled button when disabled prop is true', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
          disabled={true}
        />
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('does not open popover when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
          disabled={true}
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.queryByText('Section A - Agriculture')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct combobox role', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('has aria-expanded attribute', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');

      await user.click(combobox);
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });

    it('options have role="option"', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(mockOptions.length);
    });

    it('selected option has aria-selected="true"', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const selectedOption = screen.getByText('Grain cultivation').closest('button');
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });

    it('non-selected options have aria-selected="false"', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value="01.11.Z"
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const nonSelectedOption = screen.getByText('Rice cultivation').closest('button');
      expect(nonSelectedOption).toHaveAttribute('aria-selected', 'false');
    });

    it('has aria-activedescendant when navigating', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      const searchInput = screen.getByPlaceholderText('Szukaj...');

      expect(searchInput).not.toHaveAttribute('aria-activedescendant');

      await user.keyboard('{ArrowDown}');

      expect(searchInput).toHaveAttribute('aria-activedescendant', 'grouped-combobox-option-0');
    });

    it('listbox has aria-label', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Opcje wyboru');
    });

    it('groups have role="group"', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const groups = screen.getAllByRole('group');
      expect(groups.length).toBe(mockGroups.length);
    });
  });

  describe('Edge Cases', () => {
    it('renders empty state when no options provided', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={[]}
          groups={mockGroups}
          value={null}
          onChange={onChange}
          emptyText="No options available"
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByText('No options available')).toBeInTheDocument();
    });

    it('handles single group correctly', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const singleGroupOptions = mockOptions.filter((o) => o.group === 'A');
      const singleGroup = [mockGroups[0]];

      render(
        <GroupedCombobox
          options={singleGroupOptions}
          groups={singleGroup}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByText('Section A - Agriculture')).toBeInTheDocument();
      expect(screen.getAllByRole('group').length).toBe(1);
    });

    it('handles many groups efficiently', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      // Create many groups and options
      const manyGroups: GroupedComboboxGroup[] = Array.from({ length: 20 }, (_, i) => ({
        key: String.fromCharCode(65 + i),
        label: `Section ${String.fromCharCode(65 + i)}`,
      }));

      const manyOptions: GroupedComboboxOption[] = manyGroups.flatMap((group) => [
        {
          value: `${group.key}-1`,
          label: `${group.key}-1 - Option 1`,
          group: group.key,
        },
        {
          value: `${group.key}-2`,
          label: `${group.key}-2 - Option 2`,
          group: group.key,
        },
      ]);

      render(
        <GroupedCombobox
          options={manyOptions}
          groups={manyGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      // Should render without error
      expect(screen.getAllByRole('group').length).toBe(20);
      expect(screen.getAllByRole('option').length).toBe(40);
    });

    it('handles undefined value correctly', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={undefined}
          onChange={onChange}
          placeholder="Select..."
        />
      );

      expect(screen.getByText('Select...')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
          className="custom-class"
        />
      );

      expect(screen.getByRole('combobox')).toHaveClass('custom-class');
    });

    it('resets highlighted index when filtered options change', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <GroupedCombobox
          options={mockOptions}
          groups={mockGroups}
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('combobox'));

      // Navigate to highlight an option
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // Type to filter, which should reset highlight
      const searchInput = screen.getByPlaceholderText('Szukaj...');
      await user.type(searchInput, 'grain');

      // First option in filtered list should not have highlight from previous navigation
      const firstOption = screen.getByText('Grain cultivation').closest('button');
      expect(firstOption).not.toHaveClass('bg-accent');
    });
  });
});
