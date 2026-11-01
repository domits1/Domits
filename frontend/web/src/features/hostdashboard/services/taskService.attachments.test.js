jest.mock('../../../services/getAccessToken', () => ({
    getAccessToken: () => 'Bearer token-1',
}));

import { getAttachmentViewUrl, uploadTaskAttachment } from './taskService';

const paramsOfCall = (index) => new URL(globalThis.fetch.mock.calls[index][0]).searchParams;
const answer = (body, ok = true, status = 200) => ({ ok, status, json: jest.fn().mockResolvedValue(body) });

afterEach(() => {
    delete globalThis.fetch;
});

describe('getAttachmentViewUrl', () => {
    test('asks for the link of a key on a given task, as the host the user acts for when there is one', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue(answer({ viewUrl: 'https://signed.example/view' }));

        await expect(getAttachmentViewUrl('tasks/host-1/a.jpg', 'task-1')).resolves.toBe('https://signed.example/view');
        await getAttachmentViewUrl('tasks/host-2/a.jpg', 'task-2', 'host-2');

        expect(Object.fromEntries(paramsOfCall(0))).toEqual({ action: 'view-url', taskId: 'task-1', key: 'tasks/host-1/a.jpg' });
        expect(Object.fromEntries(paramsOfCall(1))).toEqual({ action: 'view-url', taskId: 'task-2', key: 'tasks/host-2/a.jpg', asHostId: 'host-2' });
    });

    test('throws when the link is refused', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

        await expect(getAttachmentViewUrl('tasks/host-1/a.jpg', 'task-1')).rejects.toThrow('Failed to get view URL: 404');
    });
});

describe('uploadTaskAttachment', () => {
    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    const link = () => answer({ uploadUrl: 'https://signed.example/upload', key: 'tasks/host-1/new.pdf' });

    test('asks for an upload of the file\'s type and size, then sends the file with that type', async () => {
        globalThis.fetch = jest.fn().mockResolvedValueOnce(link()).mockResolvedValueOnce({ ok: true });

        await expect(uploadTaskAttachment(file)).resolves.toBe('tasks/host-1/new.pdf');

        expect(Object.fromEntries(paramsOfCall(0))).toEqual({ action: 'upload-url', fileType: 'application/pdf', fileSize: String(file.size) });
        expect(globalThis.fetch).toHaveBeenLastCalledWith('https://signed.example/upload', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/pdf' },
            body: file,
        });
    });

    test.each([
        [() => answer({ message: 'A file can be at most 20 MB' }, false, 400), 'receipt.pdf: A file can be at most 20 MB'],
        [() => ({ ok: false, status: 502, json: jest.fn().mockRejectedValue(new Error('not json')) }), 'receipt.pdf: Failed to get upload URL: 502'],
    ])('throws why the file was refused and sends nothing', async (refusal, message) => {
        globalThis.fetch = jest.fn().mockResolvedValue(refusal());

        await expect(uploadTaskAttachment(file)).rejects.toThrow(message);
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    test('throws instead of handing back a key when storage refused the file', async () => {
        globalThis.fetch = jest.fn().mockResolvedValueOnce(link()).mockResolvedValueOnce({ ok: false, status: 403 });

        await expect(uploadTaskAttachment(file)).rejects.toThrow('receipt.pdf could not be uploaded. Please try again.');
    });
});
