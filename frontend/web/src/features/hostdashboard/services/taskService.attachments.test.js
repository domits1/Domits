/**
 * @jest-environment jsdom
 */

jest.mock('../../../services/getAccessToken', () => ({
    getAccessToken: () => 'Bearer token-1',
}));

import { getAttachmentViewUrl } from './taskService';

describe('getAttachmentViewUrl', () => {
    afterEach(() => {
        delete globalThis.fetch;
    });

    const okResponse = () => ({ ok: true, json: jest.fn().mockResolvedValue({ viewUrl: 'https://signed.example/view' }) });

    test('asks for the link of a key on a given task', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue(okResponse());

        const viewUrl = await getAttachmentViewUrl('tasks/host-1/a.jpg', 'task-1');

        expect(viewUrl).toBe('https://signed.example/view');
        const params = new URL(globalThis.fetch.mock.calls[0][0]).searchParams;
        expect(params.get('action')).toBe('view-url');
        expect(params.get('taskId')).toBe('task-1');
        expect(params.get('key')).toBe('tasks/host-1/a.jpg');
        expect(params.has('asHostId')).toBe(false);
    });

    test('sends the host the user acts for', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue(okResponse());

        await getAttachmentViewUrl('tasks/host-2/a.jpg', 'task-1', 'host-2');

        expect(new URL(globalThis.fetch.mock.calls[0][0]).searchParams.get('asHostId')).toBe('host-2');
    });

    test('throws when the link is refused', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

        await expect(getAttachmentViewUrl('tasks/host-1/a.jpg', 'task-1')).rejects.toThrow('Failed to get view URL: 404');
    });
});
