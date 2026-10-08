import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });

export const getHostEmailById = async (hostId) => {
    const response = await lambdaClient.send(new InvokeCommand({
        FunctionName: "GetUserInfo",
        Payload: JSON.stringify({ UserId: hostId }),
    }));

    if (response?.FunctionError) {
        throw new Error("Failed to fetch host email: GetUserInfo returned an error");
    }

    let email;
    try {
        const payloadString = new TextDecoder("utf-8").decode(response.Payload);
        const result = JSON.parse(payloadString);
        const resultBody = JSON.parse(result.body);
        email = resultBody[0]?.Attributes?.find(attr => attr.Name === "email")?.Value;
    } catch {
        throw new Error("Failed to fetch host email: malformed response from GetUserInfo");
    }

    if (!email) {
        throw new Error("Failed to fetch host email: no email found for this host");
    }

    return email;
};

export const sendTaskEscalationEmail = async (hostEmail, task) => {
    const dueDate = task.due_date ? new Date(task.due_date).toISOString() : "no due date set";

    const payload = {
        body: {
            toEmail: hostEmail,
            subject: `Task escalated: ${task.title}`,
            body: `The task "${task.title}" (property: ${task.property_snapshot_label}) has passed its due date and was escalated.

Due: ${dueDate}

Please review it in your Domits dashboard.`,
        },
    };

    const response = await lambdaClient.send(new InvokeCommand({
        FunctionName: "EmailNotificationService",
        Payload: JSON.stringify(payload),
    }));

    if (response?.FunctionError) {
        throw new Error("Failed to send escalation email");
    }
};
