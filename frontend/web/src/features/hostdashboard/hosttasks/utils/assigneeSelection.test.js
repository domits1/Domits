import { HOST_ASSIGNEE_ID, resolveAssigneeSelection } from './assigneeSelection';

describe('resolveAssigneeSelection', () => {
    const currentUser = { name: 'Alex Host' };

    test('uses assignee_team_member_id when the task has one', () => {
        const task = { assignee_team_member_id: 'member-1', assignee: 'Someone' };
        expect(resolveAssigneeSelection(task, currentUser)).toBe('member-1');
    });

    test('resolves to the host when the free-text assignee matches the current host', () => {
        const task = { assignee_team_member_id: null, assignee: 'Alex Host' };
        expect(resolveAssigneeSelection(task, currentUser)).toBe(HOST_ASSIGNEE_ID);
    });

    test('keeps a legacy free-text assignee that does not match the host or a team member', () => {
        const task = { assignee_team_member_id: null, assignee: 'Jane' };
        expect(resolveAssigneeSelection(task, currentUser)).toBe('Jane');
    });

    test('falls back to the host when there is no assignee at all', () => {
        const task = { assignee_team_member_id: null, assignee: '' };
        expect(resolveAssigneeSelection(task, currentUser)).toBe(HOST_ASSIGNEE_ID);
    });
});
