/**
 * @jest-environment jsdom
 */

jest.mock('../../../services/getAccessToken', () => ({
    getAccessToken: () => 'Bearer token-1',
}));

import { getAttachmentViewUrl, uploadTaskAttachment } from './taskService';

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

describe('uploadTaskAttachment', () => {
    afterEach(() => {
        delete globalThis.fetch;
    });

    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    const linkResponse = () => ({
        ok: true,
        json: jest.fn().mockResolvedValue({ uploadUrl: 'https://signed.example/upload', key: 'tasks/host-1/new.pdf' }),
    });

    test('asks for an upload of the file\'s type and size, then sends the file with that type', async () => {
        globalThis.fetch = jest.fn()
            .mockResolvedValueOnce(linkResponse())
            .mockResolvedValueOnce({ ok: true });

        const key = await uploadTaskAttachment(file);

        expect(key).toBe('tasks/host-1/new.pdf');
        const params = new URL(globalThis.fetch.mock.calls[0][0]).searchParams;
        expect(params.get('action')).toBe('upload-url');
        expect(params.get('fileType')).toBe('application/pdf');
        expect(params.get('fileSize')).toBe(String(file.size));
        expect(params.has('fileName')).toBe(false);
        expect(globalThis.fetch).toHaveBeenLastCalledWith('https://signed.example/upload', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/pdf' },
            body: file,
        });
    });

    test('throws the reason a file is refused, with its name, and sends nothing', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: jest.fn().mockResolvedValue({ message: 'A file can be at most 20 MB' }),
        });

        await expect(uploadTaskAttachment(file)).rejects.toThrow('receipt.pdf: A file can be at most 20 MB');
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    test('falls back to the status when the refusal has no message', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502, json: jest.fn().mockRejectedValue(new Error('not json')) });

        await expect(uploadTaskAttachment(file)).rejects.toThrow('receipt.pdf: Failed to get upload URL: 502');
    });

    test('throws instead of handing back a key when storage refused the file', async () => {
        globalThis.fetch = jest.fn()
            .mockResolvedValueOnce(linkResponse())
            .mockResolvedValueOnce({ ok: false, status: 403 });

        await expect(uploadTaskAttachment(file)).rejects.toThrow('receipt.pdf could not be uploaded. Please try again.');
    });
});
