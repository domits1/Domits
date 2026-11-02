import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Auth } from 'aws-amplify';
import { toast } from 'react-toastify';
import HostTasks from './HostTasks';
import { updateTask, fetchTasks, escalateTask, approveTask, rejectTask } from '../../services/taskService';
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

const mockEffectiveHost = { effectiveHostId: 'host-1', managedHostId: null, isPurelyPOM: false };
jest.mock('../../../../hooks/useEffectiveHostId', () => () => mockEffectiveHost);

jest.mock('../../services/taskService', () => ({
    fetchTasks: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    uploadTaskAttachment: jest.fn(),
    escalateTask: jest.fn(),
    approveTask: jest.fn(),
    rejectTask: jest.fn(),
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

        test('refuses to save a Type change while the checklist is not loaded, so the Type never ends up out of sync with it', async () => {
            fetchChecklistItems.mockRejectedValue(new Error('Could not load checklist'));
            render(<HostTasks />);
            fireEvent.click(await screen.findByText('Clean the villa'));
            await screen.findByText('Could not load checklist');
            fireEvent.change(screen.getByLabelText('Type'), { target: { name: 'type', value: 'Maintenance' } });

            fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/checklist/i)));
            expect(updateTask).not.toHaveBeenCalled();
            expect(screen.getByLabelText('Type')).toBeInTheDocument();
        });

        describe('while the checklist is being switched', () => {
            const SECOND_TASK = { ...TASK, id: 'task-2', title: 'Water the garden' };
            let releaseDelete;

            const saveAndHoldTheSwitch = async () => {
                fetchTasks.mockResolvedValue([TASK, SECOND_TASK]);
                deleteChecklistItem.mockImplementation(() => new Promise((resolve) => { releaseDelete = resolve; }));
                await openTaskAndSwitchTypeTo('Maintenance');
                fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
                await waitFor(() => expect(deleteChecklistItem).toHaveBeenCalled());
            };

            test('keeps the form open and locked until the new checklist is in place', async () => {
                await saveAndHoldTheSwitch();

                expect(screen.getByLabelText('Type')).toBeDisabled();
                expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();

                releaseDelete({});
                await waitFor(() => expect(screen.queryByLabelText('Type')).not.toBeInTheDocument());
                expect(createChecklistItem).toHaveBeenCalledTimes(2);
            });

            test('does not let another task be opened, so its own Type save cannot be dropped', async () => {
                await saveAndHoldTheSwitch();

                fireEvent.click(screen.getByText('Water the garden'));

                expect(screen.getByDisplayValue('Clean the villa')).toBeInTheDocument();
                expect(screen.queryByDisplayValue('Water the garden')).not.toBeInTheDocument();

                releaseDelete({});
                await waitFor(() => expect(screen.queryByLabelText('Type')).not.toBeInTheDocument());
            });
        });
    });

    describe('approving or rejecting a completed task', () => {
        const COMPLETED = { ...TASK, status: 'Completed', completed_date: 1700000000000 };

        const openCompletedTask = async () => {
            fetchTasks.mockResolvedValue([COMPLETED]);
            render(<HostTasks />);
            fireEvent.click(await screen.findByRole('button', { name: 'All Tasks' }));
            fireEvent.click(await screen.findByText('Clean the villa'));
            await screen.findByRole('button', { name: 'Approve' });
        };

        beforeEach(() => {
            approveTask.mockResolvedValue({ message: 'Task approved' });
            rejectTask.mockResolvedValue({ message: 'Task rejected and reopened' });
        });

        test('approving sends the decision, closes the task, and shows it as approved when reopened', async () => {
            await openCompletedTask();

            fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

            await waitFor(() => expect(approveTask).toHaveBeenCalledWith('task-1', null));
            await waitFor(() => expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument());
            expect(toast.success).toHaveBeenCalled();

            fireEvent.click(await screen.findByText('Clean the villa'));
            expect(await screen.findByText('Approved')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
        });

        test('rejecting sends the decision and reopens the task as In progress', async () => {
            await openCompletedTask();

            fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

            await waitFor(() => expect(rejectTask).toHaveBeenCalledWith('task-1', null));
            await waitFor(() => expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument());

            fireEvent.click(await screen.findByText('Clean the villa'));
            expect(await screen.findByRole('button', { name: '● In progress' })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
        });

        test('a second click while the first decision is still being sent does not send another', async () => {
            let finishApproval;
            approveTask.mockReturnValue(new Promise(resolve => { finishApproval = resolve; }));
            await openCompletedTask();

            fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
            fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

            expect(approveTask).toHaveBeenCalledTimes(1);
            finishApproval({ message: 'Task approved' });
            await waitFor(() => expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument());
        });

        test('the assignee of a completed task is not offered Approve or Reject on their own task', async () => {
            fetchTasks.mockResolvedValue([{ ...COMPLETED, assignee: 'Alex@Example.com', assignee_team_member_id: 'member-1' }]);
            render(<HostTasks />);
            fireEvent.click(await screen.findByRole('button', { name: 'All Tasks' }));
            fireEvent.click(await screen.findByText('Clean the villa'));

            await screen.findByRole('button', { name: 'Cancel' });
            expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
        });

        test('keeps the task open and shows why when the decision fails', async () => {
            approveTask.mockRejectedValue(new Error('Task is no longer waiting for a decision'));
            await openCompletedTask();

            fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Task is no longer waiting for a decision'));
            expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
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

    describe('escalating a task from its open modal', () => {
        const openTask = async () => {
            render(<HostTasks />);
            fireEvent.click(await screen.findByText('Clean the villa'));
            return await screen.findByRole('button', { name: 'Escalate' });
        };

        test('takes the Escalate button away once it worked, so it cannot be clicked a second time', async () => {
            escalateTask.mockResolvedValue({});
            fireEvent.click(await openTask());

            await waitFor(() => expect(screen.queryByRole('button', { name: 'Escalate' })).not.toBeInTheDocument());
            expect(escalateTask).toHaveBeenCalledTimes(1);
        });

        test('keeps the button disabled while the request runs, so a double click sends one request', async () => {
            let finish;
            escalateTask.mockReturnValue(new Promise(resolve => { finish = resolve; }));
            const button = await openTask();

            fireEvent.click(button);
            await waitFor(() => expect(button).toBeDisabled());
            fireEvent.click(button);
            finish({});

            await waitFor(() => expect(screen.queryByRole('button', { name: 'Escalate' })).not.toBeInTheDocument());
            expect(escalateTask).toHaveBeenCalledTimes(1);
        });

        test('keeps the button, enabled again, when the escalation failed', async () => {
            escalateTask.mockRejectedValue(new Error('Task has already been escalated'));
            fireEvent.click(await openTask());

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Task has already been escalated'));
            expect(screen.getByRole('button', { name: 'Escalate' })).toBeEnabled();
        });
    });

    describe('attachments of a task', () => {
        const { getAttachmentViewUrl, uploadTaskAttachment, createTask } = jest.requireMock('../../services/taskService');
        const KEY = 'tasks/host-2/photo.jpg';
        const REFUSAL = 'plan.svg: Only JPG, PNG, WEBP, GIF, HEIC and PDF files can be attached';
        const addFile = (inputId) => fireEvent.change(document.getElementById(inputId), {
            target: { files: [new File(['<svg/>'], 'plan.svg', { type: 'image/svg+xml' })] },
        });

        beforeEach(() => {
            getAttachmentViewUrl.mockResolvedValue('https://signed.example/view');
            uploadTaskAttachment.mockRejectedValue(new Error(REFUSAL));
            fetchTasks.mockResolvedValue([{ ...TASK, attachments: [KEY] }]);
            global.URL.createObjectURL = jest.fn(() => 'blob:plan');
            global.URL.revokeObjectURL = jest.fn();
        });

        afterEach(() => {
            mockEffectiveHost.managedHostId = null;
        });

        test('are linked as the co-host the user acts for while showing co-host tasks', async () => {
            mockEffectiveHost.managedHostId = 'host-2';
            render(<HostTasks />);
            fireEvent.click(await screen.findByRole('button', { name: 'Co-host tasks' }));
            await waitFor(() => expect(fetchTasks).toHaveBeenLastCalledWith({}, 'host-2'));
            fireEvent.click(await screen.findByText('Clean the villa'));

            await screen.findByAltText('photo.jpg');
            expect(getAttachmentViewUrl).toHaveBeenLastCalledWith(KEY, 'task-1', 'host-2');
        });

        test('are linked as the user themselves on their own tasks', async () => {
            render(<HostTasks />);
            fireEvent.click(await screen.findByText('Clean the villa'));

            await screen.findByAltText('photo.jpg');
            expect(getAttachmentViewUrl).toHaveBeenLastCalledWith(KEY, 'task-1', null);
        });

        test.each([
            [REFUSAL, REFUSAL],
            ['', 'A file could not be uploaded. Please try again.'],
        ])('that cannot be uploaded (%p) keep the task form open with the reason, and nothing is saved', async (reason, shown) => {
            uploadTaskAttachment.mockRejectedValue(new Error(reason));
            render(<HostTasks />);
            fireEvent.click(await screen.findByText('Clean the villa'));
            addFile('task-attachments-edit');
            fireEvent.click(await screen.findByRole('button', { name: 'Save Changes' }));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(shown));
            expect(updateTask).not.toHaveBeenCalled();
            expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
        });

        test('that cannot be uploaded keep the create form open with the reason, and nothing is created', async () => {
            render(<HostTasks />);
            fireEvent.click(await screen.findByRole('button', { name: '+ Create Task' }));
            addFile('file-upload');
            const form = document.getElementById('file-upload').closest('form');
            fireEvent.submit(form);

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(REFUSAL));
            expect(createTask).not.toHaveBeenCalled();
            expect(form).toBeInTheDocument();
            expect(form.querySelector('button[type="submit"]')).toBeEnabled();
        });
    });
});
