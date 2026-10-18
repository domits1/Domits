import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const client = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1" });
const PROPERTY_TASKS_LAMBDA = process.env.PROPERTY_TASKS_LAMBDA_NAME || "property-tasks";

export class TaskAutomationNotifier {
  async notifyTaskCreation(hostId, taskData) {
    if (!hostId || !taskData) return;

    try {
      const payload = {
        httpMethod: "POST",
        path: "/internal/create-task",
        headers: {},
        body: JSON.stringify({ hostId, taskData }),
      };

      await client.send(new InvokeCommand({
        FunctionName:   PROPERTY_TASKS_LAMBDA,
        InvocationType: "Event",
        Payload:        JSON.stringify(payload),
      }));
    } catch (err) {
      console.error("[TaskAutomation] Failed to create task:", err.message);
    }
  }
}
