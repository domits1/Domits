import { HOST_ASSIGNEE_ID, resolveAssigneeSelection, resolveAssigneeDisplayName } from './assigneeSelection';

describe('resolveAssigneeDisplayName', () => {
    const teamMembers = [
        { id: 'member-1', member_name: 'Sam Cleaner', role: 'Housekeeper', member_email: 'sam@example.com' },
        { id: 'member-2', member_name: '', role: 'Maintenance', member_email: 'mo@example.com' },
        { id: 'member-3', member_name: '', role: '', member_email: 'nobody@example.com' },
    ];

    test('shows the team member\'s name, not the email the server stores as assignee_name', () => {
        const task = { assignee_team_member_id: 'member-1', assignee: 'sam@example.com' };
        expect(resolveAssigneeDisplayName(task, teamMembers)).toBe('Sam Cleaner');
    });

    test('falls back to the role for a member who has no name yet, instead of showing the email', () => {
        const task = { assignee_team_member_id: 'member-2', assignee: 'mo@example.com' };
        expect(resolveAssigneeDisplayName(task, teamMembers)).toBe('Maintenance');
    });

    test('keeps the stored assignee for a task with no team member', () => {
        const task = { assignee_team_member_id: null, assignee: 'Alex Host' };
        expect(resolveAssigneeDisplayName(task, teamMembers)).toBe('Alex Host');
    });

    test('keeps the stored assignee when the member is no longer in the team list', () => {
        const task = { assignee_team_member_id: 'gone', assignee: 'old@example.com' };
        expect(resolveAssigneeDisplayName(task, teamMembers)).toBe('old@example.com');
    });

    test('keeps the stored assignee when the member has neither a name nor a role', () => {
        const task = { assignee_team_member_id: 'member-3', assignee: 'nobody@example.com' };
        expect(resolveAssigneeDisplayName(task, teamMembers)).toBe('nobody@example.com');
    });

    test('keeps the stored assignee while the team list has not loaded yet', () => {
        const task = { assignee_team_member_id: 'member-1', assignee: 'sam@example.com' };
        expect(resolveAssigneeDisplayName(task, [])).toBe('sam@example.com');
    });
});

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
