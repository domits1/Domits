export const HOST_ASSIGNEE_ID = 'host';

export const resolveAssigneeSelection = (task, currentUser) => (
    task.assignee_team_member_id ||
    (task.assignee === currentUser.name ? HOST_ASSIGNEE_ID : task.assignee) ||
    HOST_ASSIGNEE_ID
);
