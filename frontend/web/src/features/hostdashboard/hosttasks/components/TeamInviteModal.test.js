import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TeamInviteModal from './TeamInviteModal.js';
import { inviteTeamMember } from '../../services/teamService';

jest.mock('../../services/teamService', () => ({
    inviteTeamMember: jest.fn(),
}));

describe('TeamInviteModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders nothing when isOpen is false', () => {
        const { container } = render(<TeamInviteModal isOpen={false} onClose={jest.fn()} onInvited={jest.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('calls onClose when Cancel is clicked', () => {
        const onClose = jest.fn();
        render(<TeamInviteModal isOpen={true} onClose={onClose} onInvited={jest.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('invites a member, shows a success message, and calls onInvited', async () => {
        const created = { id: 'member-1', member_email: 'colleague@example.com' };
        inviteTeamMember.mockResolvedValue(created);
        const onInvited = jest.fn();

        render(<TeamInviteModal isOpen={true} onClose={jest.fn()} onInvited={onInvited} />);

        fireEvent.change(screen.getByPlaceholderText('colleague@example.com'), { target: { value: 'colleague@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

        await waitFor(() => expect(onInvited).toHaveBeenCalledWith(created));
        expect(inviteTeamMember).toHaveBeenCalledWith('colleague@example.com', 'Property Operations Manager');
        expect(await screen.findByText('✓ Invitation sent to colleague@example.com')).toBeInTheDocument();
    });

    test('clears the form and closes automatically 2.5s after a successful invite', async () => {
        jest.useFakeTimers();
        const created = { id: 'member-1', member_email: 'colleague@example.com' };
        inviteTeamMember.mockResolvedValue(created);
        const onClose = jest.fn();

        render(<TeamInviteModal isOpen={true} onClose={onClose} onInvited={jest.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('colleague@example.com'), { target: { value: 'colleague@example.com' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
        });

        expect(screen.getByText('✓ Invitation sent to colleague@example.com')).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(2500);
        });
        expect(onClose).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });

    test('shows an error message when the invite fails', async () => {
        inviteTeamMember.mockRejectedValue(new Error('network error'));

        render(<TeamInviteModal isOpen={true} onClose={jest.fn()} onInvited={jest.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('colleague@example.com'), { target: { value: 'colleague@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

        expect(await screen.findByText('Failed to send invitation. Please try again.')).toBeInTheDocument();
    });
});
