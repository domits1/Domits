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

  it("calls the email service once, so a lost answer is never retried into a second email", async () => {
    await expect(new EmailNotificationRepository().lambdaClient.config.maxAttempts()).resolves.toBe(1);
  });

  it("uses the function named in EMAIL_NOTIFICATION_LAMBDA_NAME, as the other mailers do", async () => {
    process.env.EMAIL_NOTIFICATION_LAMBDA_NAME = "EmailNotificationService-test";
    const { repository, send } = buildRepository(answer(sent()));
    await repository.sendTextEmail(EMAIL);
    expect(send.mock.calls[0][0].input.FunctionName).toBe("EmailNotificationService-test");
  });

  it("needs no reply-to confirmation for an email without a reply-to, but still a 200", async () => {
    const sent = buildRepository(answer({ statusCode: 200, body: "{}" }));
    const failed = buildRepository(answer({ statusCode: 500, body: "{}" }));
    await expect(sent.repository.sendTextEmail({ ...EMAIL, replyTo: undefined })).resolves.toBeUndefined();
    await expect(failed.repository.sendTextEmail({ ...EMAIL, replyTo: undefined })).rejects.toThrow();
  });

  const named = (name) => Object.assign(new Error(name), { name });

  it.each([
    ["the service answers 500, as it does for any SES error", answer({ statusCode: 500, body: "{}" }), true],
    ["the service answers 400, as it does for a missing field", answer({ statusCode: 400 }), false],
    ["Lambda refuses the call", named("AccessDeniedException"), false],
    ["Lambda throttles the call", named("TooManyRequestsException"), false],
    ["the function fails, whatever its payload says", { ...answer(sent()), FunctionError: "Unhandled" }, true],
    ["the service sent it without the reply-to, as it does today", answer({ statusCode: 200, body: "{}" }), true],
    ["the service confirms another reply-to", answer(sent("someone@example.com")), true],
    ["the service answers 200 with a body that is not JSON", answer({ statusCode: 200, body: "sent" }), true],
    ["the answer has no payload", { StatusCode: 200 }, true],
    ["the answer is not JSON", { StatusCode: 200, Payload: new TextEncoder().encode("not json") }, true],
    ["the answer has no status", answer({ message: "Email sent successfully!" }), true],
    ["the answer is lost after the call", named("TimeoutError"), true],
  ])("rejects when %s, and says whether it may have been sent", async (_label, response, deliveryUnknown) => {
    const { repository } = buildRepository(response);
    const error = await repository.sendTextEmail(EMAIL).catch((failure) => failure);
    expect(error).toBeInstanceOf(Error);
    expect(error.deliveryUnknown === true).toBe(deliveryUnknown);
  });
});
