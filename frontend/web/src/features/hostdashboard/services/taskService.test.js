/**
 * @jest-environment jsdom
 */

jest.mock('../../../services/getAccessToken', () => ({
    getAccessToken: () => 'Bearer token-1',
}));

import { updateTask, fetchTasks, escalateTask } from './taskService';

describe('updateTask', () => {
    afterEach(() => {
        delete globalThis.fetch;
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

describe('fetchTasks', () => {
    afterEach(() => {
        delete globalThis.fetch;
    });

    test('maps sla_status to slaStatus', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
                { id: 'task-1', sla_status: 'BREACHED' },
            ]),
        });

        const tasks = await fetchTasks();

        expect(tasks[0].slaStatus).toBe('BREACHED');
    });
});

describe('escalateTask', () => {
    afterEach(() => {
        delete globalThis.fetch;
    });

    test('posts to the escalate action with the task id', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ message: 'Task escalated successfully' }),
        });

        await escalateTask('task-1');

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('action=escalate'),
            expect.objectContaining({ method: 'POST' })
        );
        expect(globalThis.fetch.mock.calls[0][0]).toContain('id=task-1');
    });

    test('throws the backend message on a failed escalate', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: jest.fn().mockResolvedValue({ message: 'Task is not breaching its SLA' }),
        });

        await expect(escalateTask('task-1')).rejects.toThrow('Task is not breaching its SLA');
    });

    test('falls back to a generic message when the error body has none', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: jest.fn().mockRejectedValue(new Error('not json')),
        });

        await expect(escalateTask('task-1')).rejects.toThrow('Failed to escalate task: 500');
    });
});
