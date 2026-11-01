import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import AttachmentThumb from './AttachmentThumb.js';
import { getAttachmentViewUrl } from '../../services/taskService';

jest.mock('../../services/taskService', () => ({
    getAttachmentViewUrl: jest.fn(),
}));

describe('AttachmentThumb', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('shows a loading placeholder until the view URL resolves', async () => {
        let resolveUrl;
        getAttachmentViewUrl.mockReturnValue(new Promise((resolve) => { resolveUrl = resolve; }));

        const { container } = render(<AttachmentThumb attachment="tasks/host-1/photo.jpg" />);
        expect(container.querySelector('.attachment-loading')).toBeInTheDocument();

        resolveUrl('https://example.com/photo.jpg');
        await waitFor(() => expect(container.querySelector('.attachment-loading')).not.toBeInTheDocument());
    });

    test('asks for the link of this attachment on this task, as the host the user acts for', async () => {
        getAttachmentViewUrl.mockResolvedValue('https://example.com/photo.jpg');

        render(<AttachmentThumb attachment="tasks/host-1/photo.jpg" taskId="task-1" asHostId="host-1" />);

        await screen.findByAltText('photo.jpg');
        expect(getAttachmentViewUrl).toHaveBeenCalledWith('tasks/host-1/photo.jpg', 'task-1', 'host-1');
    });

    test('renders an image for a non-PDF attachment once resolved', async () => {
        getAttachmentViewUrl.mockResolvedValue('https://example.com/photo.jpg');

        render(<AttachmentThumb attachment="tasks/host-1/photo.jpg" />);

        const img = await screen.findByAltText('photo.jpg');
        expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    test('renders a PDF badge instead of an image for a .pdf attachment', async () => {
        getAttachmentViewUrl.mockResolvedValue('https://example.com/receipt.pdf');

        render(<AttachmentThumb attachment="tasks/host-1/receipt.pdf" />);

        expect(await screen.findByText('PDF')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    test('creates an object URL for a File attachment instead of calling the service', async () => {
        const objectUrl = 'blob:mock-url';
        global.URL.createObjectURL = jest.fn(() => objectUrl);
        global.URL.revokeObjectURL = jest.fn();
        const file = new File(['content'], 'inspection.png', { type: 'image/png' });

        render(<AttachmentThumb attachment={file} />);

        const img = await screen.findByAltText('inspection.png');
        expect(img).toHaveAttribute('src', objectUrl);
        expect(getAttachmentViewUrl).not.toHaveBeenCalled();
    });

    test('calls onRemove when the remove button is clicked', async () => {
        getAttachmentViewUrl.mockResolvedValue('https://example.com/photo.jpg');
        const onRemove = jest.fn();

        render(<AttachmentThumb attachment="tasks/host-1/photo.jpg" onRemove={onRemove} />);

        const removeButton = await screen.findByRole('button', { name: 'Remove photo.jpg' });
        fireEvent.click(removeButton);
        expect(onRemove).toHaveBeenCalledTimes(1);
    });

    test('says the attachment is unavailable when its link is refused, and still lets it be removed', async () => {
        getAttachmentViewUrl.mockRejectedValue(new Error('Failed to get view URL: 404'));
        const onRemove = jest.fn();

        const { container } = render(<AttachmentThumb attachment="tasks/host-1/photo.jpg" taskId="task-1" onRemove={onRemove} />);

        expect(await screen.findByText('Unavailable')).toHaveAttribute('title', 'photo.jpg could not be loaded');
        expect(container.querySelector('.attachment-loading')).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Remove photo.jpg' }));
        expect(onRemove).toHaveBeenCalledTimes(1);
    });

    test('shows the link of the attachment now shown when an earlier link arrives late', async () => {
        let resolveFirst;
        getAttachmentViewUrl
            .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
            .mockResolvedValueOnce('https://example.com/second.jpg');

        const { rerender } = render(<AttachmentThumb attachment="tasks/host-1/photo.jpg" taskId="task-1" />);
        rerender(<AttachmentThumb attachment="tasks/host-1/photo.jpg" taskId="task-1" asHostId="host-1" />);
        expect(await screen.findByAltText('photo.jpg')).toHaveAttribute('src', 'https://example.com/second.jpg');

        await act(async () => { resolveFirst('https://example.com/first.jpg'); });
        expect(screen.getByAltText('photo.jpg')).toHaveAttribute('src', 'https://example.com/second.jpg');
    });

    test('does not render a remove button when onRemove is not provided', async () => {
        getAttachmentViewUrl.mockResolvedValue('https://example.com/photo.jpg');

        render(<AttachmentThumb attachment="tasks/host-1/photo.jpg" />);

        await screen.findByAltText('photo.jpg');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
