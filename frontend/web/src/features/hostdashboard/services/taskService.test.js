/**
 * @jest-environment jsdom
 */

jest.mock('../../../services/getAccessToken', () => ({
    getAccessToken: () => 'Bearer token-1',
}));

import { updateTask } from './taskService';

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
