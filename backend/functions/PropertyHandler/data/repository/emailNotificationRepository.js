import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export const EMAIL_NOTIFICATION_FUNCTION_NAME = "EmailNotificationService";

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const REFUSED_CALLS = new Set(["AccessDeniedException", "ResourceNotFoundException", "TooManyRequestsException"]);
const NOT_SENT_STATUSES = new Set([400]);

const readAnswer = (response) =>
  response?.FunctionError || !response?.Payload ? null : parseJson(Buffer.from(response.Payload).toString("utf8"));

const unknownDelivery = (message, cause) => Object.assign(new Error(message, { cause }), { deliveryUnknown: true });

export class EmailNotificationRepository {
  constructor({
    lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1", maxAttempts: 1 }),
  } = {}) {
    this.lambdaClient = lambdaClient;
  }

  async sendTextEmail({ toEmail, replyTo, subject, body }) {
    const command = new InvokeCommand({
      FunctionName: process.env.EMAIL_NOTIFICATION_LAMBDA_NAME || EMAIL_NOTIFICATION_FUNCTION_NAME,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify({ body: { toEmail, replyTo, subject, body } }),
    });
    const response = await this.lambdaClient.send(command).catch((error) => {
      throw REFUSED_CALLS.has(error?.name) ? error : unknownDelivery("The email service call failed.", error);
    });
    const statusCode = readAnswer(response)?.statusCode;
    if (NOT_SENT_STATUSES.has(statusCode)) throw new Error(`The email service refused it (status ${statusCode}).`);
    if (statusCode !== 200) throw unknownDelivery("The email service gave no usable answer.");
    if (replyTo && parseJson(readAnswer(response).body)?.replyTo !== replyTo) {
      throw unknownDelivery("The email service did not confirm the reply-to address.");
    }
  }
}
