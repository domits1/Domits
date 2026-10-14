/**
 * @jest-environment jsdom
 */

import {
    fetchChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
} from './taskChecklistService';

jest.mock('../../services/taskService', () => ({
    TASKS_API_URL: 'https://example.com/tasks',
    getHeaders: () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer token-1' }),
}));

describe('taskChecklistService', () => {
    afterEach(() => {
        delete globalThis.fetch;
    });

    test('fetchChecklistItems requests the checklist action for the given task and normalizes fields', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
                { id: 'item-1', task_id: 'task-1', title: 'Strip beds', position: 0, is_required: true, is_checked: false, requires_evidence: false, evidence_key: null, owner_team_member_id: null, checked_at: null, checked_by: null },
            ]),
        });

        const items = await fetchChecklistItems('task-1');

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('action=checklist'),
            expect.objectContaining({ method: 'GET' })
        );
        expect(globalThis.fetch.mock.calls[0][0]).toContain('taskId=task-1');
        expect(items).toEqual([{
            id: 'item-1', taskId: 'task-1', title: 'Strip beds', position: 0,
            isRequired: true, isChecked: false, requiresEvidence: false,
            evidenceKey: null, ownerTeamMemberId: null, checkedAt: null, checkedBy: null,
        }]);
    });

    test('fetchChecklistItems throws the backend message on a non-ok response', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: jest.fn().mockResolvedValue({ message: 'Task not found or access denied' }),
        });

        await expect(fetchChecklistItems('task-1')).rejects.toThrow('Task not found or access denied');
    });

    test('fetchChecklistItems falls back to a generic message when the error body has none', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: jest.fn().mockRejectedValue(new Error('not json')),
        });

        await expect(fetchChecklistItems('task-1')).rejects.toThrow('Failed to fetch checklist items: 500');
    });

    test('createChecklistItem posts the taskId and camelCase-to-snake_case payload', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ id: 'item-2', task_id: 'task-1', title: 'Replace linen', position: 1, is_required: true, is_checked: false, requires_evidence: true, evidence_key: null, owner_team_member_id: null, checked_at: null, checked_by: null }),
        });

        const created = await createChecklistItem('task-1', { title: 'Replace linen', requiresEvidence: true });

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('action=checklist'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1', title: 'Replace linen', requires_evidence: true }),
            })
        );
        expect(created.requiresEvidence).toBe(true);
    });

    test('updateChecklistItem sends is_checked in the backend payload shape', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ message: 'Checklist item updated successfully' }),
        });

        await updateChecklistItem('item-1', { isChecked: true });

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('id=item-1'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ is_checked: true }),
            })
        );
    });

    test('deleteChecklistItem sends a DELETE and resolves the item id', async () => {
        globalThis.fetch = jest.fn().mockResolvedValue({ ok: true });

        const result = await deleteChecklistItem('item-1');

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('id=item-1'),
            expect.objectContaining({ method: 'DELETE' })
        );
        expect(result).toBe('item-1');
    });
});
