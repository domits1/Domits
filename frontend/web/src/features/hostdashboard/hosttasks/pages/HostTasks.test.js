import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Auth } from 'aws-amplify';
import HostTasks from './HostTasks';
import { updateTask, fetchTasks } from '../../services/taskService';
import { fetchHostTaskPropertyOptions } from '../../services/hostTaskPropertyService';
import { fetchTeamMembers } from '../../services/teamService';
import {
    fetchChecklistItems,
    fetchChecklistTemplates,
    createChecklistItem,
    deleteChecklistItem,
} from '../services/taskChecklistService';

jest.mock('aws-amplify', () => ({
    Auth: { currentAuthenticatedUser: jest.fn() },
}));

jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock('../../../../hooks/useEffectiveHostId', () => () => ({
    effectiveHostId: 'host-1',
    managedHostId: null,
    isPurelyPOM: false,
}));

jest.mock('../../services/taskService', () => ({
    fetchTasks: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    uploadTaskAttachment: jest.fn(),
    escalateTask: jest.fn(),
    getAttachmentViewUrl: jest.fn(),
}));

jest.mock('../../services/hostTaskPropertyService', () => ({
    fetchHostTaskPropertyOptions: jest.fn(),
}));

jest.mock('../../services/teamService', () => ({
    fetchTeamMembers: jest.fn(),
}));

jest.mock('../services/taskChecklistService', () => ({
    fetchChecklistItems: jest.fn(),
    fetchChecklistTemplates: jest.fn(),
    createChecklistItem: jest.fn(),
    updateChecklistItem: jest.fn(),
    deleteChecklistItem: jest.fn(),
}));

// Not under test here, and the reports view pulls in a charting library.
jest.mock('../components/ReportsView', () => () => null);
jest.mock('../components/MyTasksView', () => () => null);
jest.mock('../components/SettingsView', () => () => null);

const TASK = {
    id: 'task-1',
    title: 'Clean the villa',
    property: 'Villa Sunshine',
    property_id: 'prop-1',
    type: 'Cleaning',
    assignee: 'Alex',
    assignee_team_member_id: '',
    dueDate: '2099-01-01',
    status: 'Pending',
    priority: 'Medium',
    attachments: [],
    activities: [],
    isLegacy: false,
};

const TEMPLATES = {
    Maintenance: [
        { title: 'Check the boiler', isRequired: true },
        { title: 'Test the smoke alarm', isRequired: false },
    ],
};

const SAVED_ITEM = { id: 'item-1', title: 'Old checked item', isRequired: true, isChecked: true };

describe('HostTasks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(window, 'alert').mockImplementation(() => {});
        Auth.currentAuthenticatedUser.mockResolvedValue({
            username: 'host-1',
            attributes: { given_name: 'Alex', email: 'alex@example.com' },
        });
        fetchHostTaskPropertyOptions.mockResolvedValue([{ id: 'prop-1', label: 'Villa Sunshine' }]);
        fetchTeamMembers.mockResolvedValue([]);
        fetchTasks.mockResolvedValue([TASK]);
        fetchChecklistTemplates.mockResolvedValue(TEMPLATES);
        fetchChecklistItems.mockResolvedValue([SAVED_ITEM]);
        updateTask.mockResolvedValue({});
        deleteChecklistItem.mockResolvedValue({});
        createChecklistItem.mockImplementation(async (taskId, item) => ({ id: `new-${item.title}`, ...item, isChecked: false }));
    });

    afterEach(() => {
        window.alert.mockRestore();
    });

    describe('switching a task\'s Type', () => {
        const openTaskAndSwitchTypeTo = async (type) => {
            render(<HostTasks />);
            fireEvent.click(await screen.findByText('Clean the villa'));
            await screen.findByText('Old checked item');
            fireEvent.change(screen.getByLabelText('Type'), { target: { name: 'type', value: type } });
        };

        test('changes nothing on the server and keeps the saved checklist until the host saves', async () => {
            await openTaskAndSwitchTypeTo('Maintenance');

            expect(screen.getByRole('status')).toHaveTextContent(/saving will replace this checklist with the Maintenance checklist/i);
            expect(screen.getByText('Old checked item')).toBeInTheDocument();
            expect(deleteChecklistItem).not.toHaveBeenCalled();
            expect(createChecklistItem).not.toHaveBeenCalled();
            expect(updateTask).not.toHaveBeenCalled();
        });

        test('saving updates the task first, then replaces the checklist with the new Type\'s template', async () => {
            await openTaskAndSwitchTypeTo('Maintenance');

            fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

            await waitFor(() => expect(createChecklistItem).toHaveBeenCalledTimes(2));
            expect(updateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ type: 'Maintenance' }));
            expect(deleteChecklistItem).toHaveBeenCalledWith('item-1');
            expect(createChecklistItem).toHaveBeenNthCalledWith(1, 'task-1', { title: 'Check the boiler', isRequired: true });
            expect(createChecklistItem).toHaveBeenNthCalledWith(2, 'task-1', { title: 'Test the smoke alarm', isRequired: false });

            const order = (fn) => fn.mock.invocationCallOrder[0];
            expect(order(updateTask)).toBeLessThan(order(deleteChecklistItem));
            expect(order(deleteChecklistItem)).toBeLessThan(order(createChecklistItem));
        });

        test('leaves the checklist alone when the task could not be saved', async () => {
            updateTask.mockRejectedValue(new Error('Server said no'));
            await openTaskAndSwitchTypeTo('Maintenance');

            fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

            await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Server said no'));
            expect(deleteChecklistItem).not.toHaveBeenCalled();
            expect(createChecklistItem).not.toHaveBeenCalled();
        });

        test('discarding the change never touches the checklist, so nothing is lost', async () => {
            await openTaskAndSwitchTypeTo('Maintenance');

            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            fireEvent.click(await screen.findByRole('button', { name: 'Discard Changes' }));

            await waitFor(() => expect(screen.queryByLabelText('Type')).not.toBeInTheDocument());
            expect(deleteChecklistItem).not.toHaveBeenCalled();
            expect(createChecklistItem).not.toHaveBeenCalled();
            expect(updateTask).not.toHaveBeenCalled();
        });

        test('switching to a Type with no template empties the checklist on save, without creating items', async () => {
            await openTaskAndSwitchTypeTo('Issue');

            fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

            await waitFor(() => expect(deleteChecklistItem).toHaveBeenCalledWith('item-1'));
            expect(createChecklistItem).not.toHaveBeenCalled();
        });

        test('saving other changes does not touch the checklist when the Type stays the same', async () => {
            render(<HostTasks />);
            fireEvent.click(await screen.findByText('Clean the villa'));
            await screen.findByText('Old checked item');
            fireEvent.change(screen.getByLabelText('Description'), { target: { name: 'description', value: 'Bring extra towels' } });

            fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

            await waitFor(() => expect(updateTask).toHaveBeenCalledTimes(1));
            expect(deleteChecklistItem).not.toHaveBeenCalled();
            expect(createChecklistItem).not.toHaveBeenCalled();
        });
    });

    describe('the assignee shown for a team member', () => {
        // The server stores the member's email as the task's assignee_name.
        const assignedToMember = { ...TASK, assignee: 'sam@example.com', assignee_team_member_id: 'member-1' };

        test('is their name, not the email the server stores', async () => {
            fetchTasks.mockResolvedValue([assignedToMember]);
            fetchTeamMembers.mockResolvedValue([
                { id: 'member-1', status: 'active', member_name: 'Sam Cleaner', role: 'Housekeeper', member_email: 'sam@example.com' },
            ]);
            render(<HostTasks />);

            expect(await screen.findByText('Sam Cleaner')).toBeInTheDocument();
            expect(screen.queryByText('sam@example.com')).not.toBeInTheDocument();
        });

        test('is their role when they have no name yet, not the email', async () => {
            fetchTasks.mockResolvedValue([assignedToMember]);
            fetchTeamMembers.mockResolvedValue([
                { id: 'member-1', status: 'active', member_name: '', role: 'Housekeeper', member_email: 'sam@example.com' },
            ]);
            render(<HostTasks />);

            expect(await screen.findByText('Housekeeper')).toBeInTheDocument();
            expect(screen.queryByText('sam@example.com')).not.toBeInTheDocument();
        });

        test('stays as stored for a task assigned to the host', async () => {
            render(<HostTasks />);

            expect(await screen.findByText('Alex')).toBeInTheDocument();
        });
    });
});
