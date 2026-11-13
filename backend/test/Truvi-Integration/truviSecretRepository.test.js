import { describe, expect, it, jest } from "@jest/globals";
import { TruviSecretRepository } from "../../functions/Truvi-Integration/data/truviSecretRepository.js";

const clientReturning = (secretString) => ({ send: jest.fn(async () => ({ SecretString: secretString })) });

describe("TruviSecretRepository", () => {
  it("reads a plain key from the secret and asks for it only once", async () => {
    const client = clientReturning(" plain-key ");
    const repository = new TruviSecretRepository({ secretName: "domits/truvi/subscription-key", client });

    expect(await repository.getSubscriptionKey()).toBe("plain-key");
    expect(await repository.getSubscriptionKey()).toBe("plain-key");
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0][0].input).toEqual({ SecretId: "domits/truvi/subscription-key" });
  });

  it("reads the key from a JSON secret", async () => {
    const repository = new TruviSecretRepository({ secretName: "s", client: clientReturning('{"subscriptionKey":"json-key"}') });

    expect(await repository.getSubscriptionKey()).toBe("json-key");
  });

  it("fails clearly when the secret is empty", async () => {
    const repository = new TruviSecretRepository({ secretName: "s", client: clientReturning("") });

    await expect(repository.getSubscriptionKey()).rejects.toThrow("no subscription key");
  });
});
