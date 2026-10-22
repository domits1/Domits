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

    describe('notification toggles', () => {
        test('lets the user turn off task-assigned emails and saves the choice', async () => {
            render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
            await screen.findByText('Team Members');

            const assignedToggle = screen.getByRole('button', { name: 'Task assigned to me' });
            await waitFor(() => expect(assignedToggle).toHaveClass('on'));

            fireEvent.click(assignedToggle);
            expect(assignedToggle).not.toHaveClass('on');

            saveSettings.mockResolvedValue();
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
            });

            expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({ notifEmailAssigned: false }));
        });

        test('lets the user turn off task-completed emails and saves the choice', async () => {
            render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
            await screen.findByText('Team Members');

            const completedToggle = screen.getByRole('button', { name: 'Task completed' });
            await waitFor(() => expect(completedToggle).toHaveClass('on'));

            fireEvent.click(completedToggle);
            expect(completedToggle).not.toHaveClass('on');

            saveSettings.mockResolvedValue();
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
            });

            expect(saveSettings).toHaveBeenCalledWith(
                expect.objectContaining({ notifEmailCompleted: false, notifEmailAssigned: true })
            );
        });

        test('lets the user turn off task-overdue emails and saves the choice', async () => {
            render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
            await screen.findByText('Team Members');

            const overdueToggle = screen.getByRole('button', { name: 'Task overdue' });
            await waitFor(() => expect(overdueToggle).toHaveClass('on'));

            fireEvent.click(overdueToggle);
            expect(overdueToggle).not.toHaveClass('on');

            saveSettings.mockResolvedValue();
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
            });

            expect(saveSettings).toHaveBeenCalledWith(
                expect.objectContaining({ notifEmailOverdue: false, notifEmailAssigned: true, notifEmailCompleted: true })
            );
        });

        test.each(['Urgent tasks only', 'Enable notifications'])(
            'keeps "%s" inert because nothing sends it yet',
            async (label) => {
                render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
                await screen.findByText('Team Members');

                const toggle = screen.getByRole('button', { name: label });
                expect(toggle).toHaveAttribute('aria-disabled', 'true');

                fireEvent.click(toggle);
                expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
            }
        );
    });

    describe('when saving fails', () => {
        const turnOffAssignedEmails = async () => {
            render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
            await waitFor(() => expect(screen.getByRole('button', { name: 'Task assigned to me' })).toHaveClass('on'));
            fireEvent.click(screen.getByRole('button', { name: 'Task assigned to me' }));
        };

        test('tells the user the settings were not saved, and does not say they were', async () => {
            saveSettings.mockRejectedValue(new Error('Failed to save settings: 500'));
            await turnOffAssignedEmails();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
            });

            expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save your settings");
            expect(screen.queryByText('Settings saved successfully.')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Save changes' })).not.toBeDisabled();
        });

        test('removes the message once a retry succeeds', async () => {
            saveSettings.mockRejectedValueOnce(new Error('Failed to save settings: 500')).mockResolvedValueOnce();
            await turnOffAssignedEmails();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
            });
            expect(screen.getByRole('alert')).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
            });

            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            expect(screen.getByText('Settings saved successfully.')).toBeInTheDocument();
        });
    });

    describe('when the saved settings are not known', () => {
        // Saving sends every field, so a save made on top of unloaded defaults
        // would overwrite a saved opt-out.
        test('tells the user and blocks saving when the settings failed to load', async () => {
            fetchSettings.mockRejectedValue(new Error('Failed to fetch settings: 503'));
            render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);

            expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your settings");

            fireEvent.change(screen.getByLabelText('Default task priority'), { target: { value: 'High' } });

            const saveButton = screen.getByRole('button', { name: 'Save changes' });
            expect(saveButton).toBeDisabled();
            fireEvent.click(saveButton);
            expect(saveSettings).not.toHaveBeenCalled();
        });

        test('blocks saving until the settings have loaded', async () => {
            let finishLoading;
            fetchSettings.mockReturnValue(new Promise((resolve) => { finishLoading = resolve; }));
            render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
            await screen.findByText('Team Members');

            fireEvent.change(screen.getByLabelText('Default task priority'), { target: { value: 'High' } });
            expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

            await act(async () => {
                finishLoading(DEFAULT_SETTINGS);
            });
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        test('allows saving once the settings have loaded', async () => {
            render(<SettingsView currentUser={currentUser} taskContext="own" managedHostId={null} />);
            await waitFor(() => expect(screen.getByRole('button', { name: 'Task assigned to me' })).toHaveClass('on'));

            fireEvent.change(screen.getByLabelText('Default task priority'), { target: { value: 'High' } });

            expect(screen.getByRole('button', { name: 'Save changes' })).not.toBeDisabled();
        });
    });
});
