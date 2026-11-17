import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { EmailNotificationRepository } from "../../functions/PropertyHandler/data/repository/emailNotificationRepository.js";

const EMAIL = Object.freeze({
  toEmail: "host@example.com",
  replyTo: "guest@example.nl",
  subject: "Hi",
  body: "<b>as typed</b>",
});
const sent = (replyTo = EMAIL.replyTo) => ({ statusCode: 200, body: JSON.stringify({ message: "Sent", replyTo }) });
const answer = (payload) => ({ StatusCode: 200, Payload: new TextEncoder().encode(JSON.stringify(payload)) });

const buildRepository = (response) => {
  const send = jest.fn(async () => (response instanceof Error ? Promise.reject(response) : response));
  return { repository: new EmailNotificationRepository({ lambdaClient: { send } }), send };
};

afterEach(() => {
  delete process.env.EMAIL_NOTIFICATION_LAMBDA_NAME;
});

describe("sending a text email through the email service", () => {
  it("waits for the answer of EmailNotificationService and sends the reply-to with the email", async () => {
    const { repository, send } = buildRepository(answer(sent()));
    await expect(repository.sendTextEmail(EMAIL)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
    const { input } = send.mock.calls[0][0];
    expect(input.FunctionName).toBe("EmailNotificationService");
    expect(input.InvocationType).toBe("RequestResponse");
    expect(JSON.parse(input.Payload)).toEqual({ body: EMAIL });
  });

  it("uses the function named in EMAIL_NOTIFICATION_LAMBDA_NAME, as the other mailers do", async () => {
    process.env.EMAIL_NOTIFICATION_LAMBDA_NAME = "EmailNotificationService-test";
    const { repository, send } = buildRepository(answer(sent()));
    await repository.sendTextEmail(EMAIL);
    expect(send.mock.calls[0][0].input.FunctionName).toBe("EmailNotificationService-test");
  });

  it("needs no reply-to confirmation for an email without a reply-to, but still a 200", async () => {
    const sent = buildRepository(answer({ statusCode: 200, body: "{}" }));
    const refused = buildRepository(answer({ statusCode: 500, body: "{}" }));
    await expect(sent.repository.sendTextEmail({ ...EMAIL, replyTo: undefined })).resolves.toBeUndefined();
    await expect(refused.repository.sendTextEmail({ ...EMAIL, replyTo: undefined })).rejects.toThrow("status 500");
  });

  it.each([
    ["the service answers 500, as it does when SES refuses", answer({ statusCode: 500, body: "{}" })],
    ["the service answers 400, as it does for a missing field", answer({ statusCode: 400 })],
    ["the function fails, whatever its payload says", { ...answer(sent()), FunctionError: "Unhandled" }],
    [
      "the service sent it without the reply-to, as the service does today",
      answer({ statusCode: 200, body: JSON.stringify({ message: "Email sent successfully!" }) }),
    ],
    ["the service confirms another reply-to", answer(sent("someone@example.com"))],
    ["the service answers 200 with a body that is not JSON", answer({ statusCode: 200, body: "sent" })],
    ["the answer has no payload", { StatusCode: 200 }],
    ["the answer is not JSON", { StatusCode: 200, Payload: new TextEncoder().encode("not json") }],
    ["the answer has no status", answer({ message: "Email sent successfully!" })],
    ["the invoke itself fails", new Error("AccessDeniedException")],
  ])("rejects when %s, so no caller reports a sent email", async (_label, response) => {
    const { repository } = buildRepository(response);
    await expect(repository.sendTextEmail(EMAIL)).rejects.toThrow();
  });
});
