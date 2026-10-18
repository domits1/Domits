import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import SettingsView from './SettingsView.js';
import { fetchSettings, saveSettings } from '../../services/settingsService';
import { fetchTeamMembers, fetchMemberships } from '../../services/teamService';

jest.mock('../../services/settingsService', () => ({
    fetchSettings: jest.fn(),
    saveSettings: jest.fn(),
}));

jest.mock('../../services/teamService', () => ({
    fetchTeamMembers: jest.fn(),
    fetchMemberships: jest.fn(),
    inviteTeamMember: jest.fn(),
}));

const DEFAULT_SETTINGS = {
    notifEmailAssigned: true,
    notifEmailOverdue: true,
    notifEmailCompleted: true,
    notifSmsUrgent: false,
    notifInappEnabled: true,
    defaultPriority: 'Medium',
    defaultAssignee: 'Anyone',
    autoAssignCleaning: false,
    requirePhotoProof: false,
};

describe('SettingsView', () => {
    const currentUser = { name: 'Alex Host', email: 'alex@example.com' };

    beforeEach(() => {
        jest.clearAllMocks();
        fetchSettings.mockResolvedValue(DEFAULT_SETTINGS);
        fetchTeamMembers.mockResolvedValue([]);
        fetchMemberships.mockResolvedValue([]);
    });

    test('renders the signed-in host as a team row once data loads', async () => {
        render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
        const table = await screen.findByRole('table');
        expect(within(table).getByText('Alex Host')).toBeInTheDocument();
        expect(within(table).getByText('alex@example.com')).toBeInTheDocument();
    });

    test('hides the invite button when viewing a managed host', async () => {
        render(<SettingsView currentUser={currentUser} taskContext="managed" managedHostId="host-2" />);
        await screen.findByText('Team Members');
        expect(screen.queryByRole('button', { name: '+ Invite Member' })).not.toBeInTheDocument();
    });

    test('shows the invite button and opens the invite modal for an own-tasks view', async () => {
        render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
        await screen.findByText('Team Members');

        fireEvent.click(screen.getByRole('button', { name: '+ Invite Member' }));
        expect(screen.getByText('Invite team member')).toBeInTheDocument();
    });

    test('enables Save/Cancel after a toggle change, and saves on click', async () => {
        render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
        await screen.findByText('Team Members');

        const saveButton = screen.getByRole('button', { name: 'Save changes' });
        expect(saveButton).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Auto-assign cleaning after checkout' }));
        expect(saveButton).not.toBeDisabled();

        saveSettings.mockResolvedValue();
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({ autoAssignCleaning: true }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled());
    });
});
