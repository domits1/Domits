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
        expect(screen.getByText('1/2 required completed')).toBeInTheDocument();
        const badges = container.querySelectorAll('.checklist-required-badge');
        expect(badges).toHaveLength(2);
        expect(badges[0]).toHaveTextContent('*');
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

    describe('inside another form, as in the Create Task modal', () => {
        const renderInsideForm = () => {
            const onOuterSubmit = jest.fn(e => e.preventDefault());
            render(
                <form onSubmit={onOuterSubmit}>
                    <button type="submit">Create Task</button>
                    <ChecklistSection {...baseProps} />
                </form>
            );
            return onOuterSubmit;
        };

        test('clicking Add adds the item and does not submit the surrounding form', () => {
            const onOuterSubmit = renderInsideForm();

            fireEvent.change(screen.getByLabelText('New checklist item title'), { target: { value: 'Check AC' } });
            fireEvent.click(screen.getByRole('button', { name: 'Add' }));

            expect(baseProps.onAddItem).toHaveBeenCalledWith({ title: 'Check AC', isRequired: true });
            expect(onOuterSubmit).not.toHaveBeenCalled();
        });

        test('pressing Enter in the title field adds the item and is stopped from submitting the surrounding form', () => {
            renderInsideForm();
            const titleInput = screen.getByLabelText('New checklist item title');
            fireEvent.change(titleInput, { target: { value: 'Check AC' } });

            const wasNotPrevented = fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' });

            expect(wasNotPrevented).toBe(false);
            expect(baseProps.onAddItem).toHaveBeenCalledWith({ title: 'Check AC', isRequired: true });
            expect(titleInput).toHaveValue('');
        });

        test('pressing Enter on a blank title adds nothing and still does not submit the surrounding form', () => {
            renderInsideForm();

            const wasNotPrevented = fireEvent.keyDown(screen.getByLabelText('New checklist item title'), { key: 'Enter', code: 'Enter' });

            expect(wasNotPrevented).toBe(false);
            expect(baseProps.onAddItem).not.toHaveBeenCalled();
        });

        test('other keys are left alone', () => {
            renderInsideForm();

            const wasNotPrevented = fireEvent.keyDown(screen.getByLabelText('New checklist item title'), { key: 'a', code: 'KeyA' });

            expect(wasNotPrevented).toBe(true);
        });
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

    test('shows a loading indicator while a checklist template is being applied', () => {
        render(<ChecklistSection {...baseProps} isApplyingTemplate />);

        expect(screen.getByText('Loading checklist...')).toBeInTheDocument();
    });

    test('does not show the template loading indicator by default', () => {
        render(<ChecklistSection {...baseProps} />);

        expect(screen.queryByText('Loading checklist...')).not.toBeInTheDocument();
    });
});
