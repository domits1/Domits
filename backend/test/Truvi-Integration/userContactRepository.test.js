import { describe, expect, it, jest } from "@jest/globals";
import { UserContactRepository } from "../../functions/Truvi-Integration/data/userContactRepository.js";

const lambdaAnswer = (statusCode, attributes) => ({
  Payload: new TextEncoder().encode(JSON.stringify({ statusCode, body: JSON.stringify([{ Attributes: attributes }]) })),
});

describe("UserContactRepository", () => {
  it("returns the email and full name of a user through GetUserInfo", async () => {
    const client = {
      send: jest.fn(async () =>
        lambdaAnswer(200, [
          { Name: "email", Value: "host@example.com" },
          { Name: "given_name", Value: "Anna" },
          { Name: "family_name", Value: "de Vries" },
        ])
      ),
    };
    const repository = new UserContactRepository({ client });

    expect(await repository.getHost("host-1")).toEqual({ email: "host@example.com", name: "Anna de Vries" });
    expect(client.send.mock.calls[0][0].input).toEqual({
      FunctionName: "GetUserInfo",
      Payload: JSON.stringify({ UserId: "host-1" }),
    });
  });

  it("asks GetUserInfo only once per user", async () => {
    const client = { send: jest.fn(async () => lambdaAnswer(200, [{ Name: "email", Value: "guest@example.com" }])) };
    const repository = new UserContactRepository({ client });

    expect(await repository.getGuestEmail("guest-1")).toBe("guest@example.com");
    expect(await repository.getGuestEmail("guest-1")).toBe("guest@example.com");
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it("returns null without calling GetUserInfo when there is no user id", async () => {
    const client = { send: jest.fn() };
    const repository = new UserContactRepository({ client });

    expect(await repository.getGuestEmail(undefined)).toBeNull();
    expect(client.send).not.toHaveBeenCalled();
  });

  it("throws when GetUserInfo does not answer with 200", async () => {
    const client = { send: jest.fn(async () => lambdaAnswer(500, [])) };
    const repository = new UserContactRepository({ client });

    await expect(repository.getHost("host-1")).rejects.toThrow("GetUserInfo returned status 500");
  });
});
