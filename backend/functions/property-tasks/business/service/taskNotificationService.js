import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import Database from "database";
import * as taskRepository from "../../data/taskRepository.js";
import { createNotification } from "../../data/taskNotificationRepository.js";
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
// and so has no user id, keeps the defaults (everything on).
const readSettings = async (dataSource, userId) =>
    userId ? await taskRepository.getHostSettings(dataSource, userId) : null;

const isOn = (settings, settingKey) => settings?.[settingKey] ?? true;

// The in-app copy does not depend on the email setting. Someone with no user id yet (an invite that
// is not accepted) has nobody to show it to. A failure is logged so the email can still go out.
// The id is the dedupe key: the same event for the same person can only be stored once.
const storeInApp = async (dataSource, settings, userId, { hostId, task, eventType, marker, title, message }) => {
    if (!userId || !isOn(settings, "notif_inapp_enabled")) {
        return;
    }
    try {
        await createNotification(dataSource, {
            id: `${eventType}:${task.id}:${userId}:${marker}`,
            user_id: userId,
            host_id: hostId,
            task_id: task.id,
            event_type: eventType,
            title,
            message,
            created_at: Date.now(),
        });
    } catch (error) {
        console.error(`Failed to store in-app notification for task ${task.id}`, error);
    }
};

// The task is already saved when this runs, so a failed email is logged and must not fail the request.
export const notifyTaskAssigned = async (hostId, task) => {
    try {
        const dataSource = await Database.getInstance();
        const teamMember = await taskRepository.getTeamMemberById(dataSource, task.assignee_team_member_id, hostId);
        if (!teamMember) {
            return;
        }
        const settings = await readSettings(dataSource, teamMember.member_user_id);
        await storeInApp(dataSource, settings, teamMember.member_user_id, {
            hostId,
            task,
            eventType: "assigned",
            marker: task.updated_at,
            title: "Task assigned",
            message: `"${task.title}" at ${task.property_snapshot_label} was assigned to you.`,
        });
        if (!isOn(settings, "notif_email_assigned")) {
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
        const settings = await readSettings(dataSource, hostId);
        await storeInApp(dataSource, settings, hostId, {
            hostId,
            task,
            eventType: "completed",
            marker: task.completed_date,
            title: "Task completed",
            message: `"${task.title}" at ${task.property_snapshot_label} was completed.`,
        });
        if (!isOn(settings, "notif_email_completed")) {
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

// The sweep claims the task before calling this, so a failed email is logged and not retried.
// Goes to the assignee, or to the host when there is none or the assignee has left the team.
export const notifyTaskOverdue = async (task) => {
    try {
        const dataSource = await Database.getInstance();
        const assignee = await findAssignee(dataSource, task);
        const recipientUserId = assignee ? assignee.member_user_id : task.host_id;
        const settings = await readSettings(dataSource, recipientUserId);
        const emailsSoFar = Number(task.overdue_notify_count) || 0;
        const isReminder = emailsSoFar > 0;
        await storeInApp(dataSource, settings, recipientUserId, {
            hostId: task.host_id,
            task,
            eventType: "overdue",
            marker: emailsSoFar + 1,
            title: isReminder ? "Reminder: task still overdue" : "Task overdue",
            message: `"${task.title}" at ${task.property_snapshot_label} ${isReminder ? "is still overdue." : "is overdue."}`,
        });
        if (!isOn(settings, "notif_email_overdue")) {
            return;
        }

        const toEmail = assignee ? assignee.member_email : await getHostEmailById(task.host_id);
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
