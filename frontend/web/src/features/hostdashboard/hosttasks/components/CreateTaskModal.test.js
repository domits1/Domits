import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateTaskModal from './CreateTaskModal.js';

describe('CreateTaskModal', () => {
    const newTask = {
        title: '',
        description: '',
        property_id: '',
        bookingRef: '',
        type: 'Cleaning',
        assignee: '',
        dueDate: '',
        priority: 'Medium',
        attachments: null,
    };

    const baseProps = {
        isOpen: true,
        newTask,
        propertyOptions: [{ id: 'prop-1', label: 'Villa Sunshine' }],
        currentUser: { name: 'Alex Host', email: 'alex@example.com' },
        onInputChange: jest.fn(),
        onPropertyChange: jest.fn(),
        onFileChange: jest.fn(),
        onSubmit: jest.fn((e) => e.preventDefault()),
        onCancel: jest.fn(),
    };

    test('renders nothing when isOpen is false', () => {
        const { container } = render(<CreateTaskModal {...baseProps} isOpen={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('renders the property options and the current user as the only assignee option', () => {
        render(<CreateTaskModal {...baseProps} />);
        expect(screen.getByRole('option', { name: 'Villa Sunshine' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Alex Host (alex@example.com)' })).toBeInTheDocument();
    });

    test('calls onInputChange when typing into the title field', () => {
        render(<CreateTaskModal {...baseProps} />);
        fireEvent.change(screen.getByLabelText('Title'), { target: { name: 'title', value: 'Clean the pool' } });
        expect(baseProps.onInputChange).toHaveBeenCalled();
    });

    test('calls onSubmit when the form is submitted', () => {
        render(<CreateTaskModal {...baseProps} newTask={{ ...newTask, title: 'x', description: 'x', property_id: 'prop-1', dueDate: '2099-01-01', assignee: 'Alex Host' }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));
        expect(baseProps.onSubmit).toHaveBeenCalled();
    });

    test('calls onCancel from the backdrop and the Cancel button', () => {
        const onCancel = jest.fn();
        render(<CreateTaskModal {...baseProps} onCancel={onCancel} />);

        fireEvent.click(screen.getByLabelText('Close modal'));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onCancel).toHaveBeenCalledTimes(2);
    });
});
