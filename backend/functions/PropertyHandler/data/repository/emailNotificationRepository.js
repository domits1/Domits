import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export const EMAIL_NOTIFICATION_FUNCTION_NAME = "EmailNotificationService";

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const readAnswer = (response) =>
  response?.FunctionError || !response?.Payload ? null : parseJson(Buffer.from(response.Payload).toString("utf8"));

export class EmailNotificationRepository {
  constructor({ lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1" }) } = {}) {
    this.lambdaClient = lambdaClient;
  }

  async sendTextEmail({ toEmail, replyTo, subject, body }) {
    const response = await this.lambdaClient.send(
      new InvokeCommand({
        FunctionName: process.env.EMAIL_NOTIFICATION_LAMBDA_NAME || EMAIL_NOTIFICATION_FUNCTION_NAME,
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ body: { toEmail, replyTo, subject, body } }),
      })
    );
    const answer = readAnswer(response);
    if (answer?.statusCode !== 200) {
      throw new Error(`The email service did not send the email (status ${answer?.statusCode ?? "unknown"}).`);
    }
    if (replyTo && parseJson(answer.body)?.replyTo !== replyTo) {
      throw new Error("The email service did not confirm the reply-to address.");
    }
  }
}
