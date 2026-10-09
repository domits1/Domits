/**
 * @jest-environment jsdom
 */

jest.mock('../../../services/getAccessToken', () => ({
    getAccessToken: () => 'Bearer token-1',
}));

import { updateTask, createTask } from './taskService';

describe('createTask', () => {
    afterEach(() => {
        delete globalThis.fetch;
    });

    test('includes assignee_team_member_id when assigning to a team member', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ id: 'task-1' }),
        });

        await createTask({ title: 'Clean', assignee: 'housekeeper@example.com', assignee_team_member_id: 'member-1' });

        const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
        expect(body.assignee_team_member_id).toBe('member-1');
        expect(body.assignee_name).toBe('housekeeper@example.com');
    });

    test('omits assignee_team_member_id when assigning to the host', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ id: 'task-1' }),
        });

        await createTask({ title: 'Clean', assignee: 'Alex Host', assignee_team_member_id: '' });

        const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
        expect(body).not.toHaveProperty('assignee_team_member_id');
        expect(body.assignee_name).toBe('Alex Host');
    });
});

describe('updateTask', () => {
    afterEach(() => {
        delete globalThis.fetch;
    });

    test('includes assignee_team_member_id when reassigning to a team member', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ message: 'Task updated successfully' }),
        });

        await updateTask('task-1', { assignee: 'maintenance@example.com', assignee_team_member_id: 'member-2' });

        const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
        expect(body.assignee_team_member_id).toBe('member-2');
        expect(body.assignee_name).toBe('maintenance@example.com');
    });

    test('omits assignee_team_member_id when reassigning to the host', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ message: 'Task updated successfully' }),
        });

        await updateTask('task-1', { assignee: 'Alex Host', assignee_team_member_id: '' });

        const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
        expect(body).not.toHaveProperty('assignee_team_member_id');
        expect(body.assignee_name).toBe('Alex Host');
    });

    test('throws the backend-provided message on a failed update', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: jest.fn().mockResolvedValue({ message: 'Cannot complete task: required checklist items are not all checked' }),
        });

        await expect(updateTask('task-1', { status: 'Completed' }))
            .rejects.toThrow('Cannot complete task: required checklist items are not all checked');
    });

    test('falls back to a generic message when the error body has none', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: jest.fn().mockRejectedValue(new Error('not json')),
        });

        await expect(updateTask('task-1', { status: 'Completed' }))
            .rejects.toThrow('Failed to update task: 500');
    });

    test('returns the parsed response on success', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ message: 'Task updated successfully' }),
        });

        await expect(updateTask('task-1', { title: 'Renamed' }))
            .resolves.toEqual({ message: 'Task updated successfully' });
    });
});
