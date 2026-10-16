import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import Database from "database";
import * as taskRepository from "../../data/taskRepository.js";

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

// An assignee without a saved settings row, or who has not accepted the invite yet
// and so has no user id, keeps the default (on).
const isAssignmentEmailEnabled = async (dataSource, teamMember) => {
    if (!teamMember.member_user_id) {
        return true;
    }
    const settings = await taskRepository.getHostSettings(dataSource, teamMember.member_user_id);
    return settings?.notif_email_assigned ?? true;
};

// The task is already saved when this runs, so a failed email is logged and must not fail the request.
export const notifyTaskAssigned = async (hostId, task) => {
    try {
        const dataSource = await Database.getInstance();
        const teamMember = await taskRepository.getTeamMemberById(dataSource, task.assignee_team_member_id, hostId);
        if (!teamMember) {
            return;
        }
        if (!(await isAssignmentEmailEnabled(dataSource, teamMember))) {
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
