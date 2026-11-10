import { sendEmail } from "./taskNotificationService.js";
import { getHostEmailById, getAssigneeEmailById } from "./taskEscalationService.js";

const findRecipientEmail = async (task) => (
    task.assignee_team_member_id
        ? await getAssigneeEmailById(task.assignee_team_member_id, task.host_id)
        : await getHostEmailById(task.host_id)
);

const sendReviewEmail = async (task, outcome, subject, sentence) => {
    try {
        const toEmail = await findRecipientEmail(task);
        await sendEmail(
            toEmail,
            subject,
            `The task "${task.title}" (property: ${task.property_snapshot_label}) ${sentence}\n\nOpen your Domits dashboard to view it.`
        );
    } catch (error) {
        console.error(`Failed to send task ${outcome} notification for task ${task.id}`, error);
    }
};

export const notifyTaskApproved = async (task) =>
    await sendReviewEmail(task, "approved", `Task approved: ${task.title}`, "was approved. Thank you for completing it.");

export const notifyTaskRejected = async (task) =>
    await sendReviewEmail(
        task,
        "rejected",
        `Task rejected: ${task.title}`,
        "was rejected and reopened as In progress. Please review it and complete it again."
    );
