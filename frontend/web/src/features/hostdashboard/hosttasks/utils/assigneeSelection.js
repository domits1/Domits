export const HOST_ASSIGNEE_ID = 'host';

// The server stores a team member's email as the task's assignee_name, whatever the page sends, so
// the name shown is looked up from the team list: their name, else their role, never the raw email.
export const resolveAssigneeDisplayName = (task, teamMembers) => {
    if (!task.assignee_team_member_id) return task.assignee;
    const member = teamMembers.find(m => m.id === task.assignee_team_member_id);
    return member?.member_name || member?.role || task.assignee;
};

export const resolveAssigneeSelection = (task, currentUser) => (
    task.assignee_team_member_id ||
    (task.assignee === currentUser.name ? HOST_ASSIGNEE_ID : task.assignee) ||
    HOST_ASSIGNEE_ID
);
