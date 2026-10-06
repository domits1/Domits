import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskDetailsModal from './TaskDetailsModal.js';
import { getAttachmentViewUrl } from '../../services/taskService';

jest.mock('../../services/taskService', () => ({
    getAttachmentViewUrl: jest.fn(),
}));

describe('TaskDetailsModal', () => {
    const baseTask = {
        id: 'task-1',
        title: 'Clean the villa',
        description: 'Deep clean before arrival',
        status: 'Pending',
        priority: 'Medium',
        property_id: 'prop-1',
        assignee: 'Alex Host',
        type: 'Cleaning',
        bookingRef: '',
        dueDate: '2099-01-01',
        attachments: [],
        activities: [],
    };

    const baseProps = {
        viewingTask: baseTask,
        editedTask: baseTask,
        editPropertyOptions: [{ id: 'prop-1', label: 'Villa Sunshine' }],
        currentUser: { name: 'Alex Host', email: 'alex@example.com' },
        checklistItems: [],
        onEditChange: jest.fn(),
        onPropertyChange: jest.fn(),
        onFileChange: jest.fn(),
        onRemoveAttachment: jest.fn(),
        onAddChecklistItem: jest.fn(),
        onToggleChecklistItem: jest.fn(),
        onRemoveChecklistItem: jest.fn(),
        onSave: jest.fn(),
        onDelete: jest.fn(),
        onClose: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        getAttachmentViewUrl.mockResolvedValue('https://example.com/photo.jpg');
    });

    test('renders nothing when viewingTask or editedTask is missing', () => {
        const { container } = render(<TaskDetailsModal {...baseProps} viewingTask={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('shows Delete when the task is unchanged, and Save Changes when it differs', () => {
        const { rerender } = render(<TaskDetailsModal {...baseProps} />);
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();

        rerender(<TaskDetailsModal {...baseProps} editedTask={{ ...baseTask, title: 'Clean the villa thoroughly' }} />);
        expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    test('calls onSave when Save Changes is clicked', () => {
        render(<TaskDetailsModal {...baseProps} editedTask={{ ...baseTask, title: 'Changed' }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
        expect(baseProps.onSave).toHaveBeenCalledTimes(1);
    });

    test('calls onDelete when Delete is clicked', () => {
        render(<TaskDetailsModal {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(baseProps.onDelete).toHaveBeenCalledTimes(1);
    });

    test('calls onClose from the backdrop and the Cancel button', () => {
        render(<TaskDetailsModal {...baseProps} />);
        fireEvent.click(screen.getByLabelText('Close modal'));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(baseProps.onClose).toHaveBeenCalledTimes(2);
    });

    test('opens the status dropdown and calls onEditChange with the selected status', () => {
        render(<TaskDetailsModal {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: '● Pending' }));
        fireEvent.click(screen.getByRole('button', { name: '● Cancelled' }));

        expect(baseProps.onEditChange).toHaveBeenCalledWith({ target: { name: 'status', value: 'Cancelled' } });
    });

    test('opens the priority dropdown and calls onEditChange with the selected priority', () => {
        render(<TaskDetailsModal {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Medium' }));
        fireEvent.click(screen.getByRole('button', { name: 'Urgent' }));

        expect(baseProps.onEditChange).toHaveBeenCalledWith({ target: { name: 'priority', value: 'Urgent' } });
    });

    test('renders an attachment and calls onRemoveAttachment with its index', async () => {
        render(<TaskDetailsModal {...baseProps} editedTask={{ ...baseTask, attachments: ['tasks/host-1/photo.jpg'] }} />);

        const removeButton = await screen.findByRole('button', { name: 'Remove photo.jpg' });
        fireEvent.click(removeButton);

        expect(baseProps.onRemoveAttachment).toHaveBeenCalledWith(0);
    });

    test('renders checklist items and wires toggle/remove through to the parent', () => {
        const item = { id: 'item-1', title: 'Strip beds', isRequired: true, isChecked: false };
        render(<TaskDetailsModal {...baseProps} checklistItems={[item]} />);

        expect(screen.getByText('Strip beds')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Remove Strip beds' }));
        expect(baseProps.onRemoveChecklistItem).toHaveBeenCalledWith('item-1');
    });
});
