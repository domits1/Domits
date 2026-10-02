import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog.js';

describe('ConfirmDialog', () => {
    const baseDialog = {
        isOpen: true,
        title: 'Delete task?',
        message: 'This cannot be undone.',
        cancelText: 'Cancel',
        confirmText: 'Delete',
        onConfirm: jest.fn(),
    };

    test('renders nothing when isOpen is false', () => {
        const { container } = render(<ConfirmDialog confirmDialog={{ ...baseDialog, isOpen: false }} onCancel={jest.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('renders the title, message, and button labels when open', () => {
        render(<ConfirmDialog confirmDialog={baseDialog} onCancel={jest.fn()} />);
        expect(screen.getByText('Delete task?')).toBeInTheDocument();
        expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    test('calls onCancel when the cancel button is clicked', () => {
        const onCancel = jest.fn();
        render(<ConfirmDialog confirmDialog={baseDialog} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('calls confirmDialog.onConfirm when the confirm button is clicked', () => {
        const onConfirm = jest.fn();
        render(<ConfirmDialog confirmDialog={{ ...baseDialog, onConfirm }} onCancel={jest.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
