import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import Database from "database";
import * as taskRepository from "../../data/taskRepository.js";
import { getHostEmailById } from "./taskEscalationService.js";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });

const sendEmail = async (toEmail, subject, body) => {
    const response = await lambdaClient.send(new InvokeCommand({
        FunctionName: "EmailNotificationService",
        Payload: JSON.stringify({ body: { toEmail, subject, body } }),
    }));

    if (response?.FunctionError) {
        throw new Error("EmailNotificationService returned an error");
    }
};

// A user without a saved settings row, or one who has not accepted the invite yet
// and so has no user id, keeps the default (on).
const isEmailEnabled = async (dataSource, userId, settingKey) => {
    if (!userId) {
        return true;
    }
    const settings = await taskRepository.getHostSettings(dataSource, userId);
    return settings?.[settingKey] ?? true;
};

// The task is already saved when this runs, so a failed email is logged and must not fail the request.
export const notifyTaskAssigned = async (hostId, task) => {
    try {
        const dataSource = await Database.getInstance();
        const teamMember = await taskRepository.getTeamMemberById(dataSource, task.assignee_team_member_id, hostId);
        // Someone whose invite is still pending, or who has left the team, must not get task emails.
        if (!teamMember || teamMember.status !== "active") {
            return;
        }
        if (!(await isEmailEnabled(dataSource, teamMember.member_user_id, "notif_email_assigned"))) {
            return;
        }

        const dueDate = task.due_date ? new Date(task.due_date).toISOString() : "no due date set";
        await sendEmail(
            teamMember.member_email,
            `Task assigned: ${task.title}`,
            `The task "${task.title}" (property: ${task.property_snapshot_label}) has been assigned to you.

Due: ${dueDate}

Open your Domits dashboard to view it.`
        );
    } catch (error) {
        console.error(`Failed to send task assigned notification for task ${task.id}`, error);
    }
};

// Same contract as notifyTaskAssigned: the task is already saved, so a failure is logged, not thrown.
export const notifyTaskCompleted = async (hostId, task) => {
    try {
        const dataSource = await Database.getInstance();
        if (!(await isEmailEnabled(dataSource, hostId, "notif_email_completed"))) {
            return;
        }

        const hostEmail = await getHostEmailById(hostId);
        const completedAt = task.completed_date ? new Date(task.completed_date).toISOString() : "no completion time recorded";
        await sendEmail(
            hostEmail,
            `Task completed: ${task.title}`,
            `The task "${task.title}" (property: ${task.property_snapshot_label}) has been completed.

Completed: ${completedAt}

Open your Domits dashboard to view it.`
        );
    } catch (error) {
        console.error(`Failed to send task completed notification for task ${task.id}`, error);
    }
};

const findAssignee = async (dataSource, task) => {
    if (!task.assignee_team_member_id) {
        return null;
    }
    return await taskRepository.getTeamMemberById(dataSource, task.assignee_team_member_id, task.host_id);
};

export const notifyTaskOverdue = async (task) => {
    try {
        const dataSource = await Database.getInstance();
        const assignee = await findAssignee(dataSource, task);
        const recipientUserId = assignee ? assignee.member_user_id : task.host_id;
        if (!(await isEmailEnabled(dataSource, recipientUserId, "notif_email_overdue"))) {
            return;
        }

        const toEmail = assignee ? assignee.member_email : await getHostEmailById(task.host_id);
        const isReminder = Number(task.overdue_notify_count) > 0;
        await sendEmail(
            toEmail,
            isReminder ? `Reminder, task still overdue: ${task.title}` : `Task overdue: ${task.title}`,
            `The task "${task.title}" (property: ${task.property_snapshot_label}) ${isReminder ? "is still overdue and still" : "is past its due date and"} has not been completed.

Due: ${new Date(task.due_date).toISOString()}

Open your Domits dashboard to view it.`
        );
    } catch (error) {
        console.error(`Failed to send task overdue notification for task ${task.id}`, error);
    }
};
