import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChecklistSection from './ChecklistSection.js';

describe('ChecklistSection', () => {
    const baseProps = {
        items: [],
        loadError: null,
        onAddItem: jest.fn(),
        onToggleChecked: jest.fn(),
        onRemoveItem: jest.fn(),
        onRetryLoad: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('shows the empty state when there are no items', () => {
        render(<ChecklistSection {...baseProps} />);
        expect(screen.getByText('No checklist items yet.')).toBeInTheDocument();
    });

    test('renders items and the required-progress count', () => {
        const items = [
            { id: '1', title: 'Strip beds', isRequired: true, isChecked: true },
            { id: '2', title: 'Replace linen', isRequired: true, isChecked: false },
            { id: '3', title: 'Reorganize storage', isRequired: false, isChecked: false },
        ];
        const { container } = render(<ChecklistSection {...baseProps} items={items} />);

        expect(screen.getByText('Strip beds')).toBeInTheDocument();
        expect(screen.getByText('1/2 required done')).toBeInTheDocument();
        expect(container.querySelectorAll('.checklist-required-badge')).toHaveLength(2);
    });

    test('calls onToggleChecked with the item when its checkbox is clicked', () => {
        const item = { id: '1', title: 'Strip beds', isRequired: true, isChecked: false };
        const { container } = render(<ChecklistSection {...baseProps} items={[item]} />);

        fireEvent.click(container.querySelector('.checklist-item-row input[type="checkbox"]'));
        expect(baseProps.onToggleChecked).toHaveBeenCalledWith(item);
    });

    test('calls onRemoveItem with the item id when the remove button is clicked', () => {
        const item = { id: '1', title: 'Strip beds', isRequired: true, isChecked: false };
        render(<ChecklistSection {...baseProps} items={[item]} />);

        fireEvent.click(screen.getByRole('button', { name: 'Remove Strip beds' }));
        expect(baseProps.onRemoveItem).toHaveBeenCalledWith('1');
    });

    test('adds an item with the typed title and the Required toggle state, then clears the form', () => {
        render(<ChecklistSection {...baseProps} />);

        fireEvent.change(screen.getByLabelText('New checklist item title'), { target: { value: 'Check AC' } });
        fireEvent.click(screen.getByLabelText('Required'));
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));

        expect(baseProps.onAddItem).toHaveBeenCalledWith({ title: 'Check AC', isRequired: false });
        expect(screen.getByLabelText('New checklist item title')).toHaveValue('');
    });

    test('does not add an item when the title is blank', () => {
        render(<ChecklistSection {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Add' }));

        expect(baseProps.onAddItem).not.toHaveBeenCalled();
    });

    test('shows a load error with a retry button instead of the items or add form', () => {
        render(<ChecklistSection {...baseProps} loadError="Failed to load checklist items" />);

        expect(screen.getByText('Failed to load checklist items')).toBeInTheDocument();
        expect(screen.queryByText('No checklist items yet.')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('New checklist item title')).not.toBeInTheDocument();
    });

    test('calls onRetryLoad when Retry is clicked', () => {
        render(<ChecklistSection {...baseProps} loadError="Failed to load checklist items" />);

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

        expect(baseProps.onRetryLoad).toHaveBeenCalledTimes(1);
    });
});
