import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });
const EMAIL_LAMBDA_NAME = process.env.EMAIL_NOTIFICATION_LAMBDA_NAME || "EmailNotificationService";
const GET_USER_INFO_LAMBDA_NAME = process.env.GET_USER_INFO_LAMBDA_NAME || "GetUserInfo";

const decodePayload = (payload) => {
  if (!payload) return null;
  try {
    return JSON.parse(new TextDecoder("utf-8").decode(payload));
  } catch {
    return null;
  }
};

const parseGetUserInfoBody = (payload) => {
  const parsed = decodePayload(payload);
  const body = parsed?.body ? JSON.parse(parsed.body) : null;
  const attrs = body?.[0]?.Attributes || [];
  const email = attrs.find((attr) => attr?.Name === "email")?.Value || null;
  const givenName = attrs.find((attr) => attr?.Name === "given_name")?.Value || null;
  return { email, givenName };
};

export default class EmailNotificationService {
  async getUserContact(userId) {
    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: GET_USER_INFO_LAMBDA_NAME,
        Payload: JSON.stringify({ UserId: userId }),
      })
    );

    return parseGetUserInfoBody(response?.Payload);
  }

  async sendEmail({ toEmail, subject, body }) {
    if (!toEmail) {
      throw new Error("Cannot send email without toEmail.");
    }

    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: EMAIL_LAMBDA_NAME,
        Payload: JSON.stringify({
          body: {
            toEmail,
            subject,
            body,
          },
        }),
      })
    );
  }
}
